"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { normalizeSpecDimOptions } from "@/lib/api/endpoints/biddingSpecs";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidAttachment } from "@/lib/bidding/types";
import type {
  ProcessMeta,
  SpecSheet,
  SpecSheetDuctShape,
  SpecSheetInsulationFamily,
  SpecSheetKind,
  SpecSheetRow,
  SpecSheetTemplateMeta,
} from "@/lib/bidding/process-types";
import type {
  SpecArea,
  SpecFacing,
  SpecMaterial,
  SpecSizeOption,
  SpecSystem,
  SpecThicknessOption,
} from "@/lib/bidding/specs-types";
import {
  MAX_SPEC_IMAGES,
  MAX_SPEC_ROWS,
  MAX_SPEC_SHEETS,
  SPEC_SHEET_IMAGE_LABEL,
  coveringsFromMeta,
  defaultSpecSheetTemplates,
  ductShapesFromMeta,
  emptySpecSheetRow,
  emptyInsulationLayer,
  effectiveInsulationLayerCount,
  familiesFromMeta,
  filterMaterialsForFamily,
  inferMaterialFamily,
  kindLabel,
  manufacturersFromMeta,
  mintSpecSheet,
  normalizeSpecSheets,
  resizeInsulationLayers,
  SPEC_INSULATION_LAYER_COUNTS,
  syncPrimaryMaterialFields,
  specSheetsFingerprint,
} from "@/lib/bidding/specSheetMap";

/** Prefer local row values; only take missing codes/unit from server echo. */
function mergeIncomingSheets(
  local: SpecSheet[],
  incoming: SpecSheet[]
): SpecSheet[] {
  const byId = new Map(incoming.map((s) => [s.id, s]));
  return local.map((ls) => {
    const ss = byId.get(ls.id);
    if (!ss) return ls;
    const rowById = new Map(ss.rows.map((r) => [r.id, r]));
    return {
      ...ls,
      title: ls.title || ss.title,
      specNumber: ls.specNumber ?? ss.specNumber,
      footerNote: ls.footerNote ?? ss.footerNote,
      imageAttachmentIds:
        ls.imageAttachmentIds?.length > 0
          ? ls.imageAttachmentIds
          : ss.imageAttachmentIds,
      rows: ls.rows.map((lr) => {
        const sr = rowById.get(lr.id);
        if (!sr) return lr;
        return {
          ...lr,
          systemCode: lr.systemCode ?? sr.systemCode,
          areaCode: lr.areaCode ?? sr.areaCode,
          materialCode: lr.materialCode ?? sr.materialCode,
          unit: lr.unit ?? sr.unit,
        };
      }),
    };
  });
}

const INSULATION_SPEC_KEYS: { key: string; label: string }[] = [
  { key: "hydronic", label: "Hydronic" },
  { key: "plumbing", label: "Plumbing" },
  { key: "ductworkInsulation", label: "Ductwork insulation" },
  { key: "piping", label: "Piping" },
  { key: "ductwork", label: "Ductwork" },
  { key: "equipment", label: "Equipment" },
  { key: "other", label: "Other" },
];

const ADD_KINDS: SpecSheetKind[] = [
  "duct",
  "hydronic",
  "plumbing",
  "equipment",
];

function CodeChip({ code }: { code: string | null | undefined }) {
  if (!code) {
    return <span className="text-xs text-ink/30">—</span>;
  }
  return (
    <span className="inline-block rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink/55">
      {code}
    </span>
  );
}

function dimLabel(opt: SpecSizeOption): string {
  return opt.label?.trim() || `${opt.value}"`;
}

function SpecImageThumb({
  attachment,
  onOpen,
}: {
  attachment: BidAttachment;
  onOpen: (url: string, attachment: BidAttachment) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void biddingApi
      .fetchBidAttachmentBlob(attachment.downloadPath)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.downloadPath]);

  if (!url) {
    return (
      <div className="flex h-28 w-36 items-center justify-center rounded-xl bg-ink/[0.04] text-[10px] text-ink/40">
        …
      </div>
    );
  }

  const isPdf = attachment.mimeType === "application/pdf";

  return (
    <button
      type="button"
      onClick={() => onOpen(url, attachment)}
      className="group relative block overflow-hidden rounded-xl border border-ink/[0.08] text-left transition hover:border-brand/40"
    >
      {isPdf ? (
        <div className="flex h-28 w-36 flex-col items-center justify-center gap-1 bg-ink/[0.04] text-xs font-medium text-ink/55">
          PDF
          <span className="max-w-[8rem] truncate px-2 text-[10px] text-ink/40">
            {attachment.fileName}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={attachment.fileName}
          className="h-28 w-36 object-cover transition group-hover:scale-[1.02]"
        />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-ink/55 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
        View
      </span>
    </button>
  );
}

function SpecImageLightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: { url: string; attachment: BidAttachment }[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const current = items[index];
  if (!current) return null;

  const isPdf = current.attachment.mimeType === "application/pdf";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={current.attachment.fileName}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-medium">
            {current.attachment.fileName}
            {items.length > 1 ? (
              <span className="ml-2 text-white/60">
                {index + 1} / {items.length}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25"
          >
            Close
          </button>
        </div>
        <div className="relative flex max-h-[80vh] items-center justify-center overflow-hidden rounded-2xl bg-ink/80 shadow-2xl">
          {isPdf ? (
            <iframe
              title={current.attachment.fileName}
              src={current.url}
              className="h-[75vh] w-full bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt={current.attachment.fileName}
              className="max-h-[80vh] max-w-full object-contain"
            />
          )}
          {items.length > 1 ? (
            <>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onIndex(index - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={index >= items.length - 1}
                onClick={() => onIndex(index + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow disabled:opacity-30"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function selectClass(disabled: boolean) {
  return `w-full min-w-[6rem] rounded border border-ink/10 bg-surface px-1.5 py-1 text-xs text-ink outline-none focus:border-brand ${
    disabled ? "opacity-60" : ""
  }`;
}

/** Allowed manufacturers — one dropdown, pick again to unselect. */
function ManufacturerAllowedSelect({
  options,
  allowed,
  preferred,
  editable,
  onChange,
}: {
  options: { id: string; label: string }[];
  allowed: string[];
  preferred: string | null;
  editable: boolean;
  onChange: (next: {
    manufacturersAllowed: string[];
    manufacturerPreferred: string | null;
  }) => void;
}) {
  const allowedIds = Array.isArray(allowed) ? allowed : [];
  const allowedSet = new Set(allowedIds);
  const labelFor = (id: string) =>
    options.find((o) => o.id === id)?.label ??
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const allowedLabels = allowedIds.map(labelFor);
  const summary =
    allowedLabels.length === 0
      ? "—"
      : allowedLabels.length <= 2
        ? allowedLabels.join(", ")
        : `${allowedLabels.length} selected`;

  return (
    <select
      disabled={!editable}
      className={`${selectClass(!editable)} min-w-[8rem]`}
      value=""
      onChange={(e) => {
        const id = e.target.value;
        if (!id) return;
        const nextAllowed = allowedSet.has(id)
          ? allowedIds.filter((x) => x !== id)
          : [...allowedIds, id];
        onChange({
          manufacturersAllowed: nextAllowed,
          manufacturerPreferred:
            preferred && nextAllowed.includes(preferred) ? preferred : null,
        });
      }}
      title="Pick again to unselect"
    >
      <option value="">{summary}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {allowedSet.has(opt.id) ? `✓ ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  );
}

/** Preferred among allowed — own column. */
function ManufacturerPreferredSelect({
  options,
  allowed,
  preferred,
  editable,
  onChange,
}: {
  options: { id: string; label: string }[];
  allowed: string[];
  preferred: string | null;
  editable: boolean;
  onChange: (next: {
    manufacturersAllowed: string[];
    manufacturerPreferred: string | null;
  }) => void;
}) {
  const allowedIds = Array.isArray(allowed) ? allowed : [];
  const allowedSet = new Set(allowedIds);
  const labelFor = (id: string) =>
    options.find((o) => o.id === id)?.label ??
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const preferredValue =
    preferred && allowedSet.has(preferred) ? preferred : "";

  return (
    <select
      disabled={!editable || allowedIds.length === 0}
      className={`${selectClass(!editable || allowedIds.length === 0)} min-w-[8rem]`}
      value={preferredValue}
      onChange={(e) =>
        onChange({
          manufacturersAllowed: allowedIds,
          manufacturerPreferred: e.target.value || null,
        })
      }
      title="Preferred (not cheapest)"
    >
      <option value="">—</option>
      {allowedIds.map((id) => (
        <option key={id} value={id}>
          {labelFor(id)}
        </option>
      ))}
    </select>
  );
}

/**
 * Spec sheets on Estimating Setup — FRONTEND_SPEC_SHEET.md cascade.
 * Not the Takeoff Specs/Mike qty grid.
 */
export function BidSpecSheetsSection({
  sheets: sheetsProp,
  insulationSpecs,
  buyAmerican,
  aPlus,
  meta,
  editable,
  showInsulationSpecs = true,
  onSheetsChange,
  onInsulationSpecsChange,
  onBuyAmericanChange,
  onAPlusChange,
}: {
  sheets: SpecSheet[];
  insulationSpecs: Record<string, unknown> | null | undefined;
  buyAmerican?: boolean | null;
  aPlus?: boolean | null;
  meta: ProcessMeta | null;
  editable: boolean;
  showInsulationSpecs?: boolean;
  onSheetsChange: (next: SpecSheet[]) => void;
  onInsulationSpecsChange: (next: Record<string, unknown>) => void;
  onBuyAmericanChange?: (next: boolean | null) => void;
  onAPlusChange?: (next: boolean | null) => void;
}) {
  const { bid, uploadAttachment, deleteAttachment, applyBidDetail } =
    useBidSheet();
  const templates: SpecSheetTemplateMeta[] = meta?.specSheetTemplates?.length
    ? meta.specSheetTemplates
    : defaultSpecSheetTemplates();
  const familyOptions = familiesFromMeta(meta?.specSheetEditor?.families);
  const coveringOptions = coveringsFromMeta(meta?.specSheetEditor?.coverings);
  const manufacturerOptions = manufacturersFromMeta(
    meta?.specSheetEditor?.manufacturers
  );
  const ductShapeOptions = ductShapesFromMeta(meta?.specSheetEditor?.ductShapes);

  const [sheets, setSheets] = useState<SpecSheet[]>(() =>
    normalizeSpecSheets(sheetsProp)
  );
  const sheetsRef = useRef(sheets);
  sheetsRef.current = sheets;
  const lastEmittedFp = useRef(specSheetsFingerprint(sheets));
  const onSheetsChangeRef = useRef(onSheetsChange);
  onSheetsChangeRef.current = onSheetsChange;

  useEffect(() => {
    const incoming = normalizeSpecSheets(sheetsProp);
    const inFp = specSheetsFingerprint(incoming);
    if (inFp === lastEmittedFp.current) return;

    const local = sheetsRef.current;
    const localFp = specSheetsFingerprint(local);
    if (inFp === localFp) {
      lastEmittedFp.current = inFp;
      return;
    }

    if (incoming.length === 0 && local.length > 0) return;

    if (local.length === 0 && incoming.length > 0) {
      sheetsRef.current = incoming;
      lastEmittedFp.current = inFp;
      setSheets(incoming);
      return;
    }

    const localIds = new Set(local.map((s) => s.id));
    const merged = mergeIncomingSheets(local, incoming);
    const extras = incoming.filter((s) => !localIds.has(s.id));
    const next = extras.length > 0 ? [...merged, ...extras] : merged;
    const nextFp = specSheetsFingerprint(next);
    if (nextFp === localFp) {
      lastEmittedFp.current = inFp;
      return;
    }
    sheetsRef.current = next;
    lastEmittedFp.current = nextFp;
    setSheets(next);
  }, [sheetsProp]);

  const commitSheets = useCallback((next: SpecSheet[]) => {
    sheetsRef.current = next;
    lastEmittedFp.current = specSheetsFingerprint(next);
    setSheets(next);
    onSheetsChangeRef.current(next);
  }, []);

  const [systems, setSystems] = useState<SpecSystem[]>([]);
  /**
   * Mike-code fallback only when BE ignores ?code=.
   * Do NOT use bare GET to fill Insulation — family-less → [] on purpose.
   */
  const [mikeMaterialsCache, setMikeMaterialsCache] = useState<SpecMaterial[]>(
    []
  );
  /** family → insulation-layer materials from ?family=&layer=insulation */
  const materialsByFamily = useRef<Record<string, SpecMaterial[]>>({});
  const [familyMaterials, setFamilyMaterials] = useState<
    Record<string, SpecMaterial[]>
  >({});
  const [areas, setAreas] = useState<SpecArea[]>([]);
  const [facings, setFacings] = useState<SpecFacing[]>([]);
  const systemsByKind = useRef<Partial<Record<SpecSheetKind, SpecSystem[]>>>(
    {}
  );
  const [mikeCodeByRow, setMikeCodeByRow] = useState<Record<string, string>>(
    {}
  );
  const [mikeCodeBusy, setMikeCodeBusy] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(
    sheets[0]?.id ?? null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{
    items: { url: string; attachment: BidAttachment }[];
    index: number;
  } | null>(null);
  const lightboxUrls = useRef<Map<number, string>>(new Map());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      biddingSpecsApi.getSpecAreas(),
      biddingSpecsApi.getSpecFacings(),
    ])
      .then(([ar, fac]) => {
        if (cancelled) return;
        setAreas(ar);
        setFacings(fac);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Lazy-load unfiltered materials only for Mike-code client match if ?code= is ignored. */
  const ensureMikeMaterialsCache = useCallback(async () => {
    if (mikeMaterialsCache.length) return mikeMaterialsCache;
    try {
      const list = await biddingSpecsApi.getSpecMaterials();
      setMikeMaterialsCache(list);
      return list;
    } catch {
      return [];
    }
  }, [mikeMaterialsCache]);

  useEffect(() => {
    if (!activeId && sheets[0]) setActiveId(sheets[0].id);
    if (activeId && !sheets.some((s) => s.id === activeId)) {
      setActiveId(sheets[0]?.id ?? null);
    }
  }, [sheets, activeId]);

  const active = sheets.find((s) => s.id === activeId) ?? null;
  const maxInsulationCols = active
    ? Math.max(
        1,
        ...active.rows.map((r) =>
          effectiveInsulationLayerCount(r.insulationLayerCount)
        )
      )
    : 1;

  useEffect(() => {
    if (!active?.kind) {
      setSystems([]);
      return;
    }
    const kind = active.kind;
    const cachedSys = systemsByKind.current[kind];
    if (cachedSys?.length) {
      setSystems(cachedSys);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        let byKind = await biddingSpecsApi.getSpecSystems({ kind });
        if (!byKind.length) byKind = await biddingSpecsApi.getSpecSystems();
        if (cancelled) return;
        if (byKind.length) systemsByKind.current[kind] = byKind;
        setSystems(byKind);
      } catch {
        if (cancelled) return;
        try {
          const all = await biddingSpecsApi.getSpecSystems();
          if (!cancelled) setSystems(all);
        } catch {
          if (!cancelled) setSystems([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active?.kind]);

  const ensureFamilyMaterials = useCallback(async (family: string) => {
    if (!family) return;
    try {
      const remote = await biddingSpecsApi.getSpecMaterials({
        family,
        layer: "insulation",
      });
      // Contract: bare/family-less → []. If BE still ignores ?family= and returns
      // everything untagged, heuristic-narrow so Insulation isn't the full dump.
      const tagged = remote.filter(
        (m) =>
          String(m.family ?? "").toLowerCase() === family.toLowerCase() &&
          (!m.layer || String(m.layer).toLowerCase() === "insulation")
      );
      const list =
        tagged.length > 0
          ? tagged
          : remote.length > 0
            ? filterMaterialsForFamily(remote, family)
            : [];
      materialsByFamily.current[family] = list;
      setFamilyMaterials((prev) => ({ ...prev, [family]: list }));
    } catch {
      materialsByFamily.current[family] = [];
      setFamilyMaterials((prev) => ({ ...prev, [family]: [] }));
    }
  }, []);

  const materialsForRow = (row: SpecSheetRow): SpecMaterial[] => {
    if (!row.insulationFamily) return [];
    return (
      familyMaterials[row.insulationFamily] ??
      materialsByFamily.current[row.insulationFamily] ??
      []
    );
  };

  // Prefetch materials for families already on the active sheet.
  useEffect(() => {
    if (!active) return;
    const families = new Set(
      active.rows
        .map((r) => r.insulationFamily)
        .filter((f): f is SpecSheetInsulationFamily => Boolean(f))
    );
    for (const f of families) void ensureFamilyMaterials(f);
  }, [active, ensureFamilyMaterials]);

  const dimsForRow = (row: SpecSheetRow, kind: SpecSheetKind) => {
    const empty = {
      sizes: [] as SpecSizeOption[],
      thicknesses: [] as SpecThicknessOption[],
    };
    const primaryName =
      row.insulationLayers?.[0]?.materialName ?? row.materialName;
    if (!primaryName) return empty;
    const pool = [...materialsForRow(row), ...mikeMaterialsCache];
    const mat = pool.find((m) => m.description === primaryName);
    if (!mat) return empty;
    // Duct / equipment: never pipe NPS from material sizes.
    const sizes =
      kind === "duct" || kind === "equipment"
        ? []
        : normalizeSpecDimOptions(mat.sizes ?? []);
    return {
      sizes,
      thicknesses: normalizeSpecDimOptions(mat.thicknesses ?? []),
    };
  };

  /** Downstream product fields cleared when an upstream cascade pick is cleared. */
  const clearFromFamilyDown = (): Partial<SpecSheetRow> => ({
    insulationFamily: null,
    insulationLayerCount: null,
    insulationLayers: [emptyInsulationLayer()],
    materialName: null,
    materialCode: null,
    sizeMin: null,
    sizeMax: null,
    thicknessIn: null,
    facing: null,
    jacket: null,
    ductShape: null,
    weight: null,
    otherNote: null,
  });

  const clearFromLayersDown = (): Partial<SpecSheetRow> => ({
    insulationLayerCount: null,
    insulationLayers: [emptyInsulationLayer()],
    materialName: null,
    materialCode: null,
    sizeMin: null,
    sizeMax: null,
    thicknessIn: null,
    facing: null,
    jacket: null,
    ductShape: null,
    weight: null,
  });

  const clearInsulationPicks = (): Partial<SpecSheetRow> => ({
    insulationLayers: [emptyInsulationLayer()],
    materialName: null,
    materialCode: null,
    sizeMin: null,
    sizeMax: null,
    thicknessIn: null,
    facing: null,
    jacket: null,
    ductShape: null,
    weight: null,
  });

  const replaceSheet = useCallback(
    (id: string, patch: Partial<SpecSheet>) => {
      const next = sheetsRef.current.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );
      commitSheets(next);
    },
    [commitSheets]
  );

  const patchRow = (
    sheetId: string,
    rowId: string,
    patch: Partial<SpecSheetRow>
  ) => {
    const next = sheetsRef.current.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      };
    });
    commitSheets(next);
  };

  const applyMaterialToLayer = (
    sheetId: string,
    row: SpecSheetRow,
    layerIndex: number,
    mat: SpecMaterial | null
  ) => {
    const count = effectiveInsulationLayerCount(row.insulationLayerCount);
    if (layerIndex < 0 || layerIndex >= count) return;
    const layers = resizeInsulationLayers(
      row.insulationLayers,
      row.insulationLayerCount
    ).map((L, i) => {
      if (i !== layerIndex) return L;
      if (!mat) {
        return {
          ...L,
          materialName: null,
          materialCode: null,
          thicknessIn: null,
        };
      }
      return {
        ...L,
        materialName: mat.description,
        materialCode: mat.code?.trim() || null,
        thicknessIn: null,
      };
    });
    const primary = syncPrimaryMaterialFields(layers);
    const next: Partial<SpecSheetRow> = {
      insulationLayers: layers,
      ...primary,
      sizeMin: null,
      sizeMax: null,
    };
    // blanks only from first layer material defaults
    if (layerIndex === 0 && mat) {
      if (!row.facing && mat.facing) {
        next.facing = String(mat.facing).trim() || null;
      }
      if (!row.jacket && mat.jacket) {
        next.jacket = String(mat.jacket).trim() || null;
      }
      if (
        row.weight == null &&
        mat.weight != null &&
        Number.isFinite(Number(mat.weight))
      ) {
        next.weight = Number(mat.weight);
      }
    }
    if (layerIndex === 0 && !mat) {
      next.facing = null;
      next.jacket = null;
      next.ductShape = null;
      next.weight = null;
    }
    patchRow(sheetId, row.id, next);
  };

  const pickSystem = (
    sheetId: string,
    row: SpecSheetRow,
    systemName: string
  ) => {
    if (!systemName) {
      patchRow(sheetId, row.id, {
        systemName: null,
        systemCode: null,
        unit: null,
        areaName: null,
        areaCode: null,
        ...clearFromFamilyDown(),
      });
      return;
    }
    const sys = systems.find((s) => s.systemName === systemName);
    patchRow(sheetId, row.id, {
      systemName,
      systemCode: sys?.code?.trim() || null,
      unit: sys?.unit?.trim() || null,
    });
  };

  const pickArea = (sheetId: string, row: SpecSheetRow, areaName: string) => {
    if (!areaName) {
      patchRow(sheetId, row.id, {
        areaName: null,
        areaCode: null,
        ...clearFromFamilyDown(),
      });
      return;
    }
    const area = areas.find((a) => a.areaName === areaName);
    patchRow(sheetId, row.id, {
      areaName,
      areaCode: area?.code?.trim() || null,
    });
  };

  const pickFamily = (
    sheetId: string,
    row: SpecSheetRow,
    family: string
  ) => {
    if (!family) {
      patchRow(sheetId, row.id, clearFromFamilyDown());
      return;
    }
    void ensureFamilyMaterials(family);
    patchRow(sheetId, row.id, {
      ...clearFromLayersDown(),
      insulationFamily: family as SpecSheetInsulationFamily,
    });
  };

  const pickLayerCount = (
    sheetId: string,
    row: SpecSheetRow,
    raw: string
  ) => {
    if (!raw) {
      // Back to default = 1 insulation column
      const layers = resizeInsulationLayers(row.insulationLayers, null);
      const primary = syncPrimaryMaterialFields(layers);
      patchRow(sheetId, row.id, {
        insulationLayerCount: null,
        insulationLayers: layers,
        ...primary,
      });
      return;
    }
    const count = Number(raw);
    if (!(SPEC_INSULATION_LAYER_COUNTS as readonly number[]).includes(count)) {
      return;
    }
    const layers = resizeInsulationLayers(row.insulationLayers, count);
    const primary = syncPrimaryMaterialFields(layers);
    patchRow(sheetId, row.id, {
      insulationLayerCount: count,
      insulationLayers: layers,
      ...primary,
      sizeMin: null,
      sizeMax: null,
    });
  };

  const pickMaterialAtLayer = (
    sheetId: string,
    row: SpecSheetRow,
    layerIndex: number,
    materialName: string
  ) => {
    if (!materialName) {
      applyMaterialToLayer(sheetId, row, layerIndex, null);
      return;
    }
    const mat =
      materialsForRow(row).find((m) => m.description === materialName) ?? null;
    applyMaterialToLayer(sheetId, row, layerIndex, mat);
  };

  const runMikeCode = async (sheetId: string, row: SpecSheetRow) => {
    const code = (mikeCodeByRow[row.id] ?? "").trim();
    if (!code) return;
    setMikeCodeBusy(row.id);
    try {
      let list = await biddingSpecsApi.getSpecMaterials({ code });
      if (
        !list.length ||
        !list.some(
          (m) => String(m.code ?? "").toUpperCase() === code.toUpperCase()
        )
      ) {
        const cache = await ensureMikeMaterialsCache();
        list = cache.filter(
          (m) => String(m.code ?? "").toUpperCase() === code.toUpperCase()
        );
      } else {
        list = list.filter(
          (m) => String(m.code ?? "").toUpperCase() === code.toUpperCase()
        );
      }
      const mat = list[0] ?? null;
      if (!mat) return;
      const inferred = inferMaterialFamily(mat) ?? row.insulationFamily;
      if (inferred) await ensureFamilyMaterials(String(inferred));
      // Mike code fills Insulation 1; keep default 1 layer unless already higher.
      const count = row.insulationLayerCount; // null → effective 1
      const layers = resizeInsulationLayers(row.insulationLayers, count).map(
        (L, i) =>
          i === 0
            ? {
                ...L,
                materialName: mat.description,
                materialCode: mat.code?.trim() || null,
                thicknessIn: null,
              }
            : L
      );
      const primary = syncPrimaryMaterialFields(layers);
      const next: Partial<SpecSheetRow> = {
        insulationFamily: inferred,
        insulationLayerCount: count,
        insulationLayers: layers,
        ...primary,
        sizeMin: null,
        sizeMax: null,
      };
      if (!row.facing && mat.facing) {
        next.facing = String(mat.facing).trim() || null;
      }
      if (!row.jacket && mat.jacket) {
        next.jacket = String(mat.jacket).trim() || null;
      }
      if (
        row.weight == null &&
        mat.weight != null &&
        Number.isFinite(Number(mat.weight))
      ) {
        next.weight = Number(mat.weight);
      }
      patchRow(sheetId, row.id, next);
    } finally {
      setMikeCodeBusy(null);
    }
  };

  const addSheet = (kind: SpecSheetKind) => {
    if (!editable || sheets.length >= MAX_SPEC_SHEETS) return;
    const created = mintSpecSheet(kind, templates);
    const next = [...sheetsRef.current, created];
    commitSheets(next);
    setActiveId(created.id);
  };

  const removeSheet = (id: string) => {
    if (!editable) return;
    const next = sheetsRef.current.filter((s) => s.id !== id);
    commitSheets(next);
    setActiveId(next[0]?.id ?? null);
  };

  const addRow = () => {
    if (!active || !editable || active.rows.length >= MAX_SPEC_ROWS) return;
    replaceSheet(active.id, {
      rows: [...active.rows, emptySpecSheetRow(active.kind)],
    });
  };

  const removeRow = (rowId: string) => {
    if (!active || !editable) return;
    replaceSheet(active.id, {
      rows: active.rows.filter((r) => r.id !== rowId),
    });
  };

  const attachImage = async (file: File) => {
    if (!active || !editable || !bid) return;
    if ((active.imageAttachmentIds?.length ?? 0) >= MAX_SPEC_IMAGES) {
      setUploadError(`Max ${MAX_SPEC_IMAGES} images per sheet`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadAttachment(file, SPEC_SHEET_IMAGE_LABEL);
      const updated = await biddingApi.getBid(bid.id);
      applyBidDetail(updated);
      const newest = [...(updated.attachments ?? [])]
        .filter((a) => a.label === SPEC_SHEET_IMAGE_LABEL)
        .sort((a, b) => b.id - a.id)[0];
      if (newest) {
        const ids = [
          ...(active.imageAttachmentIds ?? []),
          newest.id,
        ].slice(0, MAX_SPEC_IMAGES);
        const next = sheetsRef.current.map((s) =>
          s.id === active.id ? { ...s, imageAttachmentIds: ids } : s
        );
        commitSheets(next);
      }
    } catch (e) {
      setUploadError(getApiErrorMessage(e, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const detachImage = async (attachmentId: number) => {
    if (!active || !editable) return;
    setUploadError(null);
    try {
      await deleteAttachment(attachmentId);
      const ids = (active.imageAttachmentIds ?? []).filter(
        (id) => id !== attachmentId
      );
      const next = sheetsRef.current.map((s) =>
        s.id === active.id ? { ...s, imageAttachmentIds: ids } : s
      );
      commitSheets(next);
    } catch (e) {
      setUploadError(getApiErrorMessage(e, "Failed to delete photo"));
    }
  };

  const specs = (insulationSpecs ?? {}) as Record<string, unknown>;
  const attachments = bid?.attachments ?? [];
  const showDuctShape = active?.kind === "duct";
  const buyAmericanChecked = buyAmerican === true;
  const aPlusChecked = aPlus === true;

  return (
    <div className="flex flex-col gap-4">
      {showInsulationSpecs ? (
        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
          <h3 className="text-sm font-semibold text-ink">Spec PDFs that apply</h3>
          <p className="mt-0.5 mb-3 text-xs text-ink/45">
            Which client spec books apply — separate from the rules table below.
          </p>
          <div className="flex flex-wrap gap-3">
            {INSULATION_SPEC_KEYS.map(({ key, label }) => (
              <label
                key={key}
                className="inline-flex items-center gap-2 text-sm text-ink/80"
              >
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={Boolean(specs[key])}
                  onChange={(e) =>
                    onInsulationSpecsChange({
                      ...specs,
                      [key]: e.target.checked,
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {onBuyAmericanChange || onAPlusChange ? (
        <section className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-ink/[0.08] bg-surface p-4">
          {onBuyAmericanChange ? (
            <label className="inline-flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                disabled={!editable}
                checked={buyAmericanChecked}
                onChange={(e) =>
                  onBuyAmericanChange(e.target.checked ? true : null)
                }
              />
              <span>
                <span className="font-semibold text-ink">Buy American?</span>
                <span className="ml-1.5 text-ink/45">
                  Project-level · federal work
                </span>
              </span>
            </label>
          ) : null}
          {onAPlusChange ? (
            <label className="inline-flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                disabled={!editable}
                checked={aPlusChecked}
                onChange={(e) =>
                  onAPlusChange(e.target.checked ? true : null)
                }
              />
              <span>
                <span className="font-semibold text-ink">A+</span>
                <span className="ml-1.5 text-ink/45">
                  Bid-level · Setup only
                </span>
              </span>
            </label>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Spec sheets</h3>
            <p className="mt-0.5 text-xs text-ink/45">
              Cascade: System → Area → Family → Insulation (always 1). Layers
              2/3/4 add more Insulation columns. Facing after insulation (or
              Mike code).
            </p>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              {ADD_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={sheets.length >= MAX_SPEC_SHEETS}
                  onClick={() => addSheet(kind)}
                  className="rounded-xl border border-ink/10 bg-canvas/50 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
                >
                  + {kindLabel(kind)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {sheets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 bg-canvas/30 px-4 py-8 text-center text-sm text-ink/45">
            No rules yet — add Duct, HVAC pipe, Plumbing, or Equipment.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sheets.map((s) => {
                const on = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      on
                        ? "bg-brand text-white"
                        : "bg-ink/[0.05] text-ink/70 hover:bg-ink/[0.08]"
                    }`}
                  >
                    {s.title || kindLabel(s.kind)}
                  </button>
                );
              })}
            </div>

            {active ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                    <span className="text-xs font-semibold text-ink/60">
                      Title
                    </span>
                    <input
                      disabled={!editable}
                      className={selectClass(!editable)}
                      value={active.title}
                      onChange={(e) =>
                        replaceSheet(active.id, {
                          title: e.target.value.slice(0, 200),
                        })
                      }
                    />
                  </label>
                  <label className="flex w-36 flex-col gap-1">
                    <span className="text-xs font-semibold text-ink/60">
                      Spec #
                    </span>
                    <input
                      disabled={!editable}
                      className={selectClass(!editable)}
                      placeholder="230700"
                      value={active.specNumber ?? ""}
                      onChange={(e) =>
                        replaceSheet(active.id, {
                          specNumber: e.target.value.slice(0, 32) || null,
                        })
                      }
                    />
                  </label>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => removeSheet(active.id)}
                      className="rounded-xl border border-danger/25 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-tint/30"
                    >
                      Remove sheet
                    </button>
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-xl border border-ink/[0.08]">
                  <table className="w-max min-w-full border-collapse text-left text-xs leading-tight">
                    <thead className="bg-ink/[0.03] text-[11px] font-semibold text-ink/55">
                      <tr>
                        <th className="whitespace-nowrap px-1 py-1.5">System</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Code</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Unit</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Area</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Code</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Family</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Layers</th>
                        {Array.from({ length: maxInsulationCols }, (_, i) => (
                          <Fragment key={`ins-h-${i}`}>
                            <th className="whitespace-nowrap px-1 py-1.5">
                              Insulation {i + 1}
                            </th>
                            <th className="whitespace-nowrap px-1 py-1.5">
                              Code
                            </th>
                          </Fragment>
                        ))}
                        <th className="whitespace-nowrap px-1 py-1.5">
                          Mike code
                        </th>
                        <th className="whitespace-nowrap px-1 py-1.5">Facing</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Covering</th>
                        {showDuctShape ? (
                          <th className="whitespace-nowrap px-1 py-1.5">Shape</th>
                        ) : null}
                        <th className="whitespace-nowrap px-1 py-1.5">From</th>
                        <th className="whitespace-nowrap px-1 py-1.5">To</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Thick&quot;</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Mfr</th>
                        <th className="whitespace-nowrap px-1 py-1.5">
                          Preferred
                        </th>
                        <th className="whitespace-nowrap px-1 py-1.5">Accessories</th>
                        <th className="whitespace-nowrap px-1 py-1.5">§</th>
                        <th className="whitespace-nowrap px-1 py-1.5">¶</th>
                        <th className="whitespace-nowrap px-1 py-1.5">Notes</th>
                        {editable ? <th className="px-1 py-1.5" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {active.rows.map((row) => {
                        const rowMats = materialsForRow(row);
                        const rowDims = dimsForRow(row, active.kind);
                        const rowSizes = rowDims.sizes;
                        const rowThicks = rowDims.thicknesses;
                        const showPipeSizes =
                          (active.kind === "hydronic" ||
                            active.kind === "plumbing") &&
                          rowSizes.length > 0;
                        const showDuctSizeInputs = active.kind === "duct";
                        const showOtherNote = row.insulationFamily === "other";
                        const layerCount = effectiveInsulationLayerCount(
                          row.insulationLayerCount
                        );
                        const layerPicks = resizeInsulationLayers(
                          row.insulationLayers,
                          row.insulationLayerCount
                        );

                        // Cascade gates — next dropdown only after previous pick.
                        const canArea = Boolean(row.systemName);
                        const canFamily = Boolean(row.areaName);
                        const canLayers = Boolean(row.insulationFamily);
                        // Insulation 1 always once family is set; Layers only raises count.
                        const canPickInsulation = canLayers;
                        const hasProduct = layerPicks.some(
                          (L) => L.materialName || L.materialCode
                        );
                        const canLayersFinish = Boolean(
                          hasProduct &&
                            (row.insulationFamily || row.materialCode)
                        );
                        const canSize = hasProduct;

                        return (
                          <tr
                            key={row.id}
                            className="border-t border-ink/[0.06] align-middle"
                          >
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable}
                                className={selectClass(!editable)}
                                value={row.systemName ?? ""}
                                onChange={(e) =>
                                  pickSystem(active.id, row, e.target.value)
                                }
                              >
                                <option value="">—</option>
                                {systems.map((s) => (
                                  <option key={s.id} value={s.systemName}>
                                    {s.systemName}
                                  </option>
                                ))}
                                {row.systemName &&
                                !systems.some(
                                  (s) => s.systemName === row.systemName
                                ) ? (
                                  <option value={row.systemName}>
                                    {row.systemName}
                                  </option>
                                ) : null}
                              </select>
                            </td>
                            <td className="px-1 py-0.5">
                              <CodeChip code={row.systemCode} />
                            </td>
                            <td className="px-1 py-0.5 text-xs text-ink/50">
                              {row.unit ?? "—"}
                            </td>
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable || !canArea}
                                className={selectClass(!editable || !canArea)}
                                value={row.areaName ?? ""}
                                onChange={(e) =>
                                  pickArea(active.id, row, e.target.value)
                                }
                              >
                                <option value="">—</option>
                                {areas.map((a) => (
                                  <option key={a.id} value={a.areaName}>
                                    {a.areaName}
                                  </option>
                                ))}
                                {row.areaName &&
                                !areas.some(
                                  (a) => a.areaName === row.areaName
                                ) ? (
                                  <option value={row.areaName}>
                                    {row.areaName}
                                  </option>
                                ) : null}
                              </select>
                            </td>
                            <td className="px-1 py-0.5">
                              <CodeChip code={row.areaCode} />
                            </td>
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable || !canFamily}
                                className={selectClass(
                                  !editable || !canFamily
                                )}
                                value={row.insulationFamily ?? ""}
                                onChange={(e) =>
                                  pickFamily(active.id, row, e.target.value)
                                }
                              >
                                <option value="">—</option>
                                {familyOptions.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable || !canLayers}
                                className={selectClass(
                                  !editable || !canLayers
                                )}
                                value={
                                  row.insulationLayerCount != null
                                    ? String(row.insulationLayerCount)
                                    : ""
                                }
                                onChange={(e) =>
                                  pickLayerCount(
                                    active.id,
                                    row,
                                    e.target.value
                                  )
                                }
                                title="1 insulation always. Pick 2–4 for more columns."
                              >
                                <option value="">1</option>
                                {SPEC_INSULATION_LAYER_COUNTS.map((n) => (
                                  <option key={n} value={String(n)}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {Array.from(
                              { length: maxInsulationCols },
                              (_, i) => {
                                const activeSlot =
                                  canPickInsulation && i < layerCount;
                                const pick = layerPicks[i];
                                return (
                                  <Fragment key={`${row.id}-ins-${i}`}>
                                    <td className="px-1 py-0.5">
                                      {activeSlot ? (
                                        <select
                                          disabled={!editable}
                                          className={selectClass(!editable)}
                                          value={pick?.materialName ?? ""}
                                          onChange={(e) =>
                                            pickMaterialAtLayer(
                                              active.id,
                                              row,
                                              i,
                                              e.target.value
                                            )
                                          }
                                        >
                                          <option value="">—</option>
                                          {rowMats.map((m) => (
                                            <option
                                              key={m.id}
                                              value={m.description}
                                            >
                                              {m.code
                                                ? `${m.description} (${m.code})`
                                                : m.description}
                                            </option>
                                          ))}
                                          {pick?.materialName &&
                                          !rowMats.some(
                                            (m) =>
                                              m.description ===
                                              pick.materialName
                                          ) ? (
                                            <option value={pick.materialName}>
                                              {pick.materialName}
                                            </option>
                                          ) : null}
                                        </select>
                                      ) : (
                                        <span className="text-xs text-ink/25">
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-1 py-0.5">
                                      {activeSlot ? (
                                        <CodeChip code={pick?.materialCode} />
                                      ) : (
                                        <span className="text-xs text-ink/25">
                                          —
                                        </span>
                                      )}
                                    </td>
                                  </Fragment>
                                );
                              }
                            )}
                            <td className="px-1 py-0.5">
                              <div className="flex min-w-[6.5rem] gap-1">
                                <input
                                  disabled={!editable}
                                  className={`${selectClass(!editable)} w-20`}
                                  placeholder="FGA"
                                  title="Mike code — fills Insulation 1"
                                  value={mikeCodeByRow[row.id] ?? ""}
                                  onChange={(e) =>
                                    setMikeCodeByRow((prev) => ({
                                      ...prev,
                                      [row.id]: e.target.value
                                        .slice(0, 24)
                                        .toUpperCase(),
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void runMikeCode(active.id, row);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={
                                    !editable || mikeCodeBusy === row.id
                                  }
                                  onClick={() =>
                                    void runMikeCode(active.id, row)
                                  }
                                  className="rounded-lg border border-ink/10 px-1.5 text-[10px] font-semibold text-ink/60 hover:border-brand/40 hover:text-brand disabled:opacity-40"
                                >
                                  Go
                                </button>
                              </div>
                            </td>
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable || !canLayersFinish}
                                className={selectClass(
                                  !editable || !canLayersFinish
                                )}
                                value={row.facing ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    facing: e.target.value || null,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {facings.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label || f.value}
                                  </option>
                                ))}
                                {row.facing &&
                                !facings.some(
                                  (f) => f.value === row.facing
                                ) ? (
                                  <option value={row.facing}>
                                    {row.facing}
                                  </option>
                                ) : null}
                              </select>
                            </td>
                            <td className="px-1 py-0.5">
                              <select
                                disabled={!editable || !canLayersFinish}
                                className={selectClass(
                                  !editable || !canLayersFinish
                                )}
                                value={row.jacket ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    jacket: e.target.value || null,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {coveringOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {showDuctShape ? (
                              <td className="px-1 py-0.5">
                                <select
                                  disabled={!editable || !canLayersFinish}
                                  className={selectClass(
                                    !editable || !canLayersFinish
                                  )}
                                  value={row.ductShape ?? ""}
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      ductShape: (e.target.value ||
                                        null) as SpecSheetDuctShape | null,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {ductShapeOptions.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ) : null}
                            <td className="px-1 py-0.5">
                              {showPipeSizes ? (
                                <select
                                  disabled={!editable || !canSize}
                                  className={`${selectClass(!editable || !canSize)} w-24`}
                                  value={
                                    row.sizeMin != null
                                      ? String(row.sizeMin)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      sizeMin: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {rowSizes.map((s) => (
                                    <option
                                      key={s.value}
                                      value={String(s.value)}
                                    >
                                      {dimLabel(s)}
                                    </option>
                                  ))}
                                </select>
                              ) : showDuctSizeInputs ? (
                                <input
                                  type="number"
                                  step="any"
                                  disabled={!editable || !canSize}
                                  placeholder="any"
                                  className={`${selectClass(!editable || !canSize)} w-20`}
                                  value={row.sizeMin ?? ""}
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      sizeMin: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    })
                                  }
                                />
                              ) : (
                                <span className="text-xs text-ink/35">—</span>
                              )}
                            </td>
                            <td className="px-1 py-0.5">
                              {showPipeSizes ? (
                                <select
                                  disabled={!editable || !canSize}
                                  className={`${selectClass(!editable || !canSize)} w-24`}
                                  value={
                                    row.sizeMax != null
                                      ? String(row.sizeMax)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      sizeMax: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {rowSizes.map((s) => (
                                    <option
                                      key={s.value}
                                      value={String(s.value)}
                                    >
                                      {dimLabel(s)}
                                    </option>
                                  ))}
                                </select>
                              ) : showDuctSizeInputs ? (
                                <input
                                  type="number"
                                  step="any"
                                  disabled={!editable || !canSize}
                                  placeholder="any"
                                  className={`${selectClass(!editable || !canSize)} w-20`}
                                  value={row.sizeMax ?? ""}
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      sizeMax: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    })
                                  }
                                />
                              ) : (
                                <span className="text-xs text-ink/35">—</span>
                              )}
                            </td>
                            <td className="px-1 py-0.5">
                              {rowThicks.length === 0 ? (
                                <span className="text-xs text-ink/35">—</span>
                              ) : (
                                <select
                                  disabled={!editable || !canSize}
                                  className={`${selectClass(!editable || !canSize)} w-24`}
                                  value={
                                    row.thicknessIn != null
                                      ? String(row.thicknessIn)
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const thicknessIn = e.target.value
                                      ? Number(e.target.value)
                                      : null;
                                    const layers = resizeInsulationLayers(
                                      row.insulationLayers,
                                      row.insulationLayerCount
                                    ).map((L, idx) =>
                                      idx === 0 ? { ...L, thicknessIn } : L
                                    );
                                    patchRow(active.id, row.id, {
                                      thicknessIn,
                                      insulationLayers: layers,
                                    });
                                  }}
                                >
                                  <option value="">—</option>
                                  {rowThicks.map((t) => (
                                    <option
                                      key={t.value}
                                      value={String(t.value)}
                                    >
                                      {dimLabel(t)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-1 py-0.5">
                              <ManufacturerAllowedSelect
                                options={manufacturerOptions}
                                allowed={row.manufacturersAllowed ?? []}
                                preferred={row.manufacturerPreferred}
                                editable={editable}
                                onChange={(next) =>
                                  patchRow(active.id, row.id, next)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <ManufacturerPreferredSelect
                                options={manufacturerOptions}
                                allowed={row.manufacturersAllowed ?? []}
                                preferred={row.manufacturerPreferred}
                                editable={editable}
                                onChange={(next) =>
                                  patchRow(active.id, row.id, next)
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                disabled={!editable}
                                className={`${selectClass(!editable)} min-w-[6rem]`}
                                value={row.accessories ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    accessories:
                                      e.target.value.slice(0, 500) || null,
                                  })
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                disabled={!editable}
                                className={`${selectClass(!editable)} w-20`}
                                placeholder="230700"
                                value={row.specSection ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    specSection:
                                      e.target.value.slice(0, 32) || null,
                                  })
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                disabled={!editable}
                                className={`${selectClass(!editable)} w-14`}
                                placeholder="2.6"
                                value={row.specParagraph ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    specParagraph:
                                      e.target.value.slice(0, 32) || null,
                                  })
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <div className="flex min-w-[7rem] flex-col gap-0.5">
                                <input
                                  disabled={!editable}
                                  className={selectClass(!editable)}
                                  value={row.notes ?? ""}
                                  onChange={(e) =>
                                    patchRow(active.id, row.id, {
                                      notes:
                                        e.target.value.slice(0, 500) || null,
                                    })
                                  }
                                />
                                {showOtherNote ? (
                                  <input
                                    disabled={!editable}
                                    className={selectClass(!editable)}
                                    placeholder="Other note"
                                    value={row.otherNote ?? ""}
                                    onChange={(e) =>
                                      patchRow(active.id, row.id, {
                                        otherNote:
                                          e.target.value.slice(0, 500) || null,
                                      })
                                    }
                                  />
                                ) : null}
                              </div>
                            </td>
                            {editable ? (
                              <td className="px-1 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="text-xs font-medium text-danger/80 hover:text-danger"
                                >
                                  Delete
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {editable ? (
                  <button
                    type="button"
                    disabled={active.rows.length >= MAX_SPEC_ROWS}
                    onClick={addRow}
                    className="self-start rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand/40 hover:text-brand disabled:opacity-40"
                  >
                    + Add row
                  </button>
                ) : null}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-ink/60">
                    Footer note
                  </span>
                  <textarea
                    disabled={!editable}
                    value={active.footerNote ?? ""}
                    onChange={(e) =>
                      replaceSheet(active.id, {
                        footerNote: e.target.value.slice(0, 2000) || null,
                      })
                    }
                    placeholder="Optional (e.g. underground piping not insulated)"
                    className="min-h-[64px] w-full rounded-xl border border-amber-500/30 bg-amber-50/50 px-3 py-2 text-sm text-ink outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                </label>

                <div className="rounded-xl border border-ink/[0.08] bg-canvas/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Schedule photos
                      </p>
                      <p className="text-xs text-ink/45">
                        Client schedule scans — click a thumbnail to view
                      </p>
                    </div>
                    {editable ? (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void attachImage(f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileRef.current?.click()}
                          className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs font-semibold text-ink/70 hover:bg-ink/[0.03] disabled:opacity-40"
                        >
                          {uploading ? "Uploading…" : "Upload image"}
                        </button>
                      </>
                    ) : null}
                  </div>

                  {(active.imageAttachmentIds ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-ink/40">No photos yet.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(active.imageAttachmentIds ?? []).map((id) => {
                        const att = attachments.find((a) => a.id === id);
                        if (!att) {
                          return (
                            <div
                              key={id}
                              className="rounded-xl border border-ink/10 px-3 py-6 text-[11px] text-ink/40"
                            >
                              #{id} (missing)
                            </div>
                          );
                        }
                        return (
                          <div key={id} className="relative">
                            <SpecImageThumb
                              attachment={att}
                              onOpen={(url, attachment) => {
                                lightboxUrls.current.set(attachment.id, url);
                                void (async () => {
                                  const ids = active.imageAttachmentIds ?? [];
                                  const items: {
                                    url: string;
                                    attachment: BidAttachment;
                                  }[] = [];
                                  for (const aid of ids) {
                                    const a = attachments.find(
                                      (x) => x.id === aid
                                    );
                                    if (!a) continue;
                                    let u = lightboxUrls.current.get(aid);
                                    if (!u) {
                                      try {
                                        const blob =
                                          await biddingApi.fetchBidAttachmentBlob(
                                            a.downloadPath
                                          );
                                        u = URL.createObjectURL(blob);
                                        lightboxUrls.current.set(aid, u);
                                      } catch {
                                        continue;
                                      }
                                    }
                                    items.push({ url: u, attachment: a });
                                  }
                                  if (
                                    !items.some(
                                      (i) => i.attachment.id === attachment.id
                                    )
                                  ) {
                                    items.push({ url, attachment });
                                  }
                                  const idx = Math.max(
                                    0,
                                    items.findIndex(
                                      (i) => i.attachment.id === attachment.id
                                    )
                                  );
                                  setLightbox({ items, index: idx });
                                })();
                              }}
                            />
                            {editable ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void detachImage(id);
                                }}
                                className="absolute right-1.5 top-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-ink"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {uploadError ? (
                    <p className="mt-2 text-xs text-danger">{uploadError}</p>
                  ) : null}
                </div>

                {lightbox ? (
                  <SpecImageLightbox
                    items={lightbox.items}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onIndex={(i) =>
                      setLightbox((prev) =>
                        prev ? { ...prev, index: i } : prev
                      )
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
