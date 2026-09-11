"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { normalizeSpecDimOptions } from "@/lib/api/endpoints/biddingSpecs";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
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
  MIKE_SIZE_MAX,
  normalizeSpecSheets,
  resizeInsulationLayers,
  SPEC_INSULATION_LAYER_COUNTS,
  syncPrimaryMaterialFields,
  specSheetsFingerprint,
} from "@/lib/bidding/specSheetMap";
import { newId } from "@/lib/bidding/newId";

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
        const serverLayers = sr.insulationLayers ?? [];
        const insulationLayers = (lr.insulationLayers ?? []).map((L, i) => ({
          ...L,
          materialName: L.materialName ?? serverLayers[i]?.materialName ?? null,
          materialCode: L.materialCode ?? serverLayers[i]?.materialCode ?? null,
          thicknessIn: L.thicknessIn ?? serverLayers[i]?.thicknessIn ?? null,
        }));
        return {
          ...lr,
          systemCode: lr.systemCode ?? sr.systemCode,
          areaCode: lr.areaCode ?? sr.areaCode,
          materialCode:
            lr.materialCode ??
            insulationLayers[0]?.materialCode ??
            sr.materialCode,
          materialName:
            lr.materialName ??
            insulationLayers[0]?.materialName ??
            sr.materialName,
          unit: lr.unit ?? sr.unit,
          insulationLayers:
            insulationLayers.length > 0
              ? insulationLayers
              : lr.insulationLayers,
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

/** Tiny spinner over a single cell control — never a full-section loader. */
function CellBusy({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      {children}
      {busy ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-1.5 z-[1] flex items-center"
          aria-label="Loading"
          role="status"
        >
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-brand" />
        </span>
      ) : null}
    </div>
  );
}

function dimLabel(opt: SpecSizeOption): string {
  return opt.label?.trim() || `${opt.value}"`;
}

type SpecColDef = { key: string; label: string; defaultWidth: number };

function buildSpecColDefs(opts: {
  maxInsulationCols: number;
  showDuctShape: boolean;
  editable: boolean;
}): SpecColDef[] {
  const cols: SpecColDef[] = [
    { key: "system", label: "System", defaultWidth: 140 },
    { key: "systemCode", label: "Code", defaultWidth: 56 },
    { key: "unit", label: "Unit", defaultWidth: 48 },
    { key: "area", label: "Area", defaultWidth: 110 },
    { key: "areaCode", label: "Code", defaultWidth: 56 },
    { key: "family", label: "Family", defaultWidth: 110 },
    { key: "layers", label: "Layers", defaultWidth: 64 },
  ];
  for (let i = 0; i < opts.maxInsulationCols; i++) {
    cols.push(
      { key: `ins-${i}`, label: `Insulation ${i + 1}`, defaultWidth: 140 },
      { key: `insCode-${i}`, label: "Code", defaultWidth: 56 }
    );
  }
  cols.push(
    { key: "mike", label: "Mike code", defaultWidth: 100 },
    { key: "facing", label: "Facing", defaultWidth: 88 },
    { key: "covering", label: "Covering", defaultWidth: 100 }
  );
  if (opts.showDuctShape) {
    cols.push({ key: "shape", label: "Shape", defaultWidth: 88 });
  }
  cols.push(
    { key: "from", label: "From", defaultWidth: 80 },
    { key: "to", label: "To", defaultWidth: 80 },
    { key: "width", label: 'Width"', defaultWidth: 72 },
    { key: "thick", label: 'Thick"', defaultWidth: 72 },
    { key: "mfr", label: "Mfr", defaultWidth: 110 },
    { key: "preferred", label: "Preferred", defaultWidth: 100 },
    { key: "accessories", label: "Accessories", defaultWidth: 120 },
    { key: "section", label: "§", defaultWidth: 56 },
    { key: "paragraph", label: "¶", defaultWidth: 56 },
    { key: "notes", label: "Notes", defaultWidth: 140 }
  );
  if (opts.editable) {
    cols.push({ key: "actions", label: "", defaultWidth: 64 });
  }
  return cols;
}

function ResizableTh({
  label,
  width,
  onResize,
}: {
  label: string;
  width: number;
  onResize: (next: number) => void;
}) {
  return (
    <th
      className="relative whitespace-nowrap px-1 py-1.5"
      style={{ width, minWidth: 40, maxWidth: width }}
    >
      {label}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        title="Drag to resize column"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startW = width;
          const onMove = (ev: MouseEvent) => {
            onResize(Math.max(40, Math.round(startW + (ev.clientX - startX))));
          };
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
          };
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize hover:bg-brand/40 active:bg-brand/60"
      />
    </th>
  );
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

function cellBusySelectClass(disabled: boolean, busy: boolean) {
  return `${selectClass(disabled)}${busy ? " pr-6" : ""}`;
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
  const confirmDialog = useConfirmDialog();
  const templates: SpecSheetTemplateMeta[] = meta?.specSheetTemplates?.length
    ? meta.specSheetTemplates
    : defaultSpecSheetTemplates();
  const familyOptions = familiesFromMeta(meta?.specSheetEditor?.families);
  const coveringOptions = coveringsFromMeta(meta?.specSheetEditor?.coverings);
  const manufacturerOptions = manufacturersFromMeta(
    meta?.specSheetEditor?.manufacturers
  );
  const ductShapeOptions = ductShapesFromMeta(meta?.specSheetEditor?.ductShapes);
  const mikeSizeMax =
    typeof meta?.specSheetEditor?.mikeSizeMax === "number"
      ? meta.specSheetEditor.mikeSizeMax
      : MIKE_SIZE_MAX;
  const sizeRangeMin =
    typeof meta?.specSheetEditor?.sizeRange?.min === "number"
      ? meta.specSheetEditor.sizeRange.min
      : 0;
  const sizeRangeMax =
    typeof meta?.specSheetEditor?.sizeRange?.max === "number"
      ? meta.specSheetEditor.sizeRange.max
      : 999;
  const clampInch = (n: number | null): number | null => {
    if (n == null || !Number.isFinite(n)) return null;
    return Math.min(sizeRangeMax, Math.max(sizeRangeMin, n));
  };
  const allowCopyRow = meta?.specSheetEditor?.copyRow !== false;
  const allowStackSheets = meta?.specSheetEditor?.stackSheets !== false;

  const [sheets, setSheets] = useState<SpecSheet[]>(() =>
    normalizeSpecSheets(sheetsProp)
  );
  const sheetsRef = useRef(sheets);
  sheetsRef.current = sheets;
  const lastEmittedFp = useRef(specSheetsFingerprint(sheets));
  const onSheetsChangeRef = useRef(onSheetsChange);
  onSheetsChangeRef.current = onSheetsChange;
  const [stackAll, setStackAll] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

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
  const [systemsLoading, setSystemsLoading] = useState(false);
  /**
   * Mike-code fallback only when BE ignores ?code=.
   * Do NOT use bare GET to fill Insulation — family-less → [] on purpose.
   */
  const [mikeMaterialsCache, setMikeMaterialsCache] = useState<SpecMaterial[]>(
    []
  );
  /** family → insulation-layer materials from ?family=&layer=insulation */
  const materialsByFamily = useRef<Record<string, SpecMaterial[]>>({});
  const familyLoadInflight = useRef<Record<string, Promise<void>>>({});
  const [familyMaterials, setFamilyMaterials] = useState<
    Record<string, SpecMaterial[]>
  >({});
  /** Per-family fetch in flight — drives Insulation / Size cell spinners. */
  const [familyLoading, setFamilyLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [areas, setAreas] = useState<SpecArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [facings, setFacings] = useState<SpecFacing[]>([]);
  const [facingsLoading, setFacingsLoading] = useState(true);
  const systemsByKind = useRef<Partial<Record<SpecSheetKind, SpecSystem[]>>>(
    {}
  );
  const [mikeCodeByRow, setMikeCodeByRow] = useState<Record<string, string>>(
    {}
  );
  const [mikeCodeBusy, setMikeCodeBusy] = useState<string | null>(null);

  /** Reload: Mike input is local-only — seed from saved materialCode. */
  useEffect(() => {
    setMikeCodeByRow((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const sheet of sheets) {
        for (const row of sheet.rows ?? []) {
          if (next[row.id]?.trim()) continue;
          const code = (
            row.materialCode ||
            row.insulationLayers?.[0]?.materialCode ||
            ""
          )
            .trim()
            .toUpperCase();
          if (!code) continue;
          next[row.id] = code;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [sheets]);

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
    setAreasLoading(true);
    setFacingsLoading(true);
    void Promise.all([
      biddingSpecsApi.getSpecAreas(),
      biddingSpecsApi.getSpecFacings(),
    ])
      .then(([ar, fac]) => {
        if (cancelled) return;
        setAreas(ar);
        setFacings(fac);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setAreasLoading(false);
        setFacingsLoading(false);
      });
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
      setSystemsLoading(false);
      return;
    }
    const kind = active.kind;
    const cachedSys = systemsByKind.current[kind];
    if (cachedSys?.length) {
      setSystems(cachedSys);
      setSystemsLoading(false);
      return;
    }

    let cancelled = false;
    setSystemsLoading(true);
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
      } finally {
        if (!cancelled) setSystemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active?.kind]);

  const ensureFamilyMaterials = useCallback(async (family: string) => {
    if (!family) return;
    if (
      Object.prototype.hasOwnProperty.call(materialsByFamily.current, family)
    ) {
      return;
    }
    const inflight = familyLoadInflight.current[family];
    if (inflight) return inflight;

    setFamilyLoading((prev) =>
      prev[family] ? prev : { ...prev, [family]: true }
    );

    const job = (async () => {
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
      } finally {
        setFamilyLoading((prev) => {
          if (!prev[family]) return prev;
          const next = { ...prev };
          delete next[family];
          return next;
        });
        delete familyLoadInflight.current[family];
      }
    })();

    familyLoadInflight.current[family] = job;
    return job;
  }, []);

  const materialsForRow = (row: SpecSheetRow): SpecMaterial[] => {
    if (!row.insulationFamily) return [];
    return (
      familyMaterials[row.insulationFamily] ??
      materialsByFamily.current[row.insulationFamily] ??
      []
    );
  };

  const isFamilyMaterialsLoading = (family: string | null | undefined) => {
    if (!family) return false;
    if (familyLoading[family]) return true;
    // Prefetch hasn't finished writing cache yet — treat as loading so the cell spins.
    return !Object.prototype.hasOwnProperty.call(
      materialsByFamily.current,
      family
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
    const withMikeMax =
      sizes.length === 0
        ? sizes
        : sizes.some((s) => Number(s.value) === mikeSizeMax)
          ? sizes
          : [
              ...sizes,
              {
                value: mikeSizeMax,
                label: `${mikeSizeMax} (and greater)`,
                sortOrder: 9999,
              },
            ];
    return {
      sizes: withMikeMax,
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
    widthIn: null,
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
    widthIn: null,
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
    widthIn: null,
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

  /**
   * After reload, Mike input is empty (local-only). Seed from saved code, or
   * from family catalog match by insulation name — display only, no dirty.
   */
  useEffect(() => {
    if (!active) return;
    setMikeCodeByRow((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of active.rows) {
        if (next[row.id]?.trim()) continue;
        let code = (
          row.materialCode ||
          row.insulationLayers?.[0]?.materialCode ||
          ""
        )
          .trim()
          .toUpperCase();
        if (!code && row.insulationFamily) {
          const mats =
            familyMaterials[row.insulationFamily] ??
            materialsByFamily.current[row.insulationFamily] ??
            [];
          const name =
            row.insulationLayers?.[0]?.materialName ?? row.materialName;
          const hit = name
            ? mats.find((m) => m.description === name)
            : null;
          code = hit?.code?.trim().toUpperCase() || "";
        }
        if (!code) continue;
        next[row.id] = code;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [active, familyMaterials]);

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
      widthIn: null,
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
      widthIn: null,
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
        widthIn: null,
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
    void (async () => {
      const ok = await confirmDialog({
        title: "Delete spec sheet?",
        message: "Delete this spec sheet? This cannot be undone from here.",
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      const next = sheetsRef.current.filter((s) => s.id !== id);
      commitSheets(next);
      setActiveId(next[0]?.id ?? null);
    })();
  };

  const addRow = () => {
    if (!active || !editable || active.rows.length >= MAX_SPEC_ROWS) return;
    replaceSheet(active.id, {
      rows: [...active.rows, emptySpecSheetRow(active.kind)],
    });
  };

  const copyRow = (rowId: string) => {
    if (!active || !editable || !allowCopyRow) return;
    if (active.rows.length >= MAX_SPEC_ROWS) return;
    const idx = active.rows.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const src = active.rows[idx];
    const clone: SpecSheetRow = {
      ...(JSON.parse(JSON.stringify(src)) as SpecSheetRow),
      id: newId(),
    };
    const rows = [...active.rows];
    rows.splice(idx + 1, 0, clone);
    replaceSheet(active.id, { rows });
  };

  const removeRow = (rowId: string) => {
    if (!active || !editable) return;
    void (async () => {
      const ok = await confirmDialog({
        title: "Delete row?",
        message: "Delete this row from the spec sheet?",
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      replaceSheet(active.id, {
        rows: active.rows.filter((r) => r.id !== rowId),
      });
    })();
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
    const ok = await confirmDialog({
      title: "Remove photo?",
      message: "Remove this schedule photo from the sheet?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
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
  const specColDefs = useMemo(
    () =>
      buildSpecColDefs({
        maxInsulationCols: maxInsulationCols || 1,
        showDuctShape,
        editable,
      }),
    [maxInsulationCols, showDuctShape, editable]
  );
  const widthFor = (key: string, fallback: number) =>
    colWidths[key] ?? fallback;
  const setColWidth = (key: string, next: number) =>
    setColWidths((prev) => ({ ...prev, [key]: next }));
  const startRowResize = (rowId: string, startY: number, startH: number) => {
    const onMove = (ev: MouseEvent) => {
      setRowHeights((prev) => ({
        ...prev,
        [rowId]: Math.max(28, Math.round(startH + (ev.clientY - startY))),
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="flex flex-col gap-4">
      {showInsulationSpecs ? (
        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
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
        <section className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-ink/[0.08] bg-surface p-5">
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

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
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
              {allowStackSheets ? (
                <button
                  type="button"
                  onClick={() => setStackAll((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    stackAll
                      ? "bg-ink text-white"
                      : "bg-ink/[0.05] text-ink/70 hover:bg-ink/[0.08]"
                  }`}
                >
                  {stackAll ? "Stacked view" : "Stack all"}
                </button>
              ) : null}
              {!stackAll
                ? sheets.map((s) => {
                    const on = s.id === activeId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStackAll(false);
                          setActiveId(s.id);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          on
                            ? "bg-brand text-white"
                            : "bg-ink/[0.05] text-ink/70 hover:bg-ink/[0.08]"
                        }`}
                      >
                        {s.title || kindLabel(s.kind)}
                      </button>
                    );
                  })
                : null}
            </div>

            {stackAll ? (
              <div className="mt-4 flex flex-col gap-6">
                {sheets.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-ink/[0.08] bg-canvas/20 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-ink">
                        {s.title || kindLabel(s.kind)}
                        {s.specNumber ? (
                          <span className="ml-2 text-xs font-normal text-ink/45">
                            § {s.specNumber}
                          </span>
                        ) : null}
                      </h4>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand hover:underline"
                        onClick={() => {
                          setStackAll(false);
                          setActiveId(s.id);
                        }}
                      >
                        Edit sheet
                      </button>
                    </div>
                    {s.rows.length === 0 ? (
                      <p className="text-xs text-ink/40">No rows</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-[11px]">
                          <thead className="text-ink/45">
                            <tr>
                              <th className="px-1 py-1">System</th>
                              <th className="px-1 py-1">Area</th>
                              <th className="px-1 py-1">Family</th>
                              <th className="px-1 py-1">Insulation</th>
                              <th className="px-1 py-1">Size</th>
                              <th className="px-1 py-1">Preferred</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.rows.map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-ink/[0.04]"
                              >
                                <td className="px-1 py-1">
                                  {r.systemName || "—"}
                                </td>
                                <td className="px-1 py-1">
                                  {r.areaName || "—"}
                                </td>
                                <td className="px-1 py-1">
                                  {r.insulationFamily || "—"}
                                </td>
                                <td className="px-1 py-1">
                                  {r.materialName || "—"}
                                </td>
                                <td className="px-1 py-1">
                                  {r.sizeMin === sizeRangeMin &&
                                  r.sizeMax === mikeSizeMax
                                    ? "All"
                                    : [
                                        r.sizeMin != null || r.sizeMax != null
                                          ? `${r.sizeMin ?? "?"}–${r.sizeMax ?? "?"}`
                                          : null,
                                        r.widthIn != null
                                          ? `W ${r.widthIn}"`
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                </td>
                                <td className="px-1 py-1">
                                  {r.manufacturerPreferred || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {!stackAll && active ? (
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
                  <table
                    className="w-max min-w-full border-collapse text-left text-xs leading-tight"
                    style={{ tableLayout: "fixed" }}
                  >
                    <colgroup>
                      {specColDefs.map((c) => (
                        <col
                          key={c.key}
                          style={{
                            width: widthFor(c.key, c.defaultWidth),
                          }}
                        />
                      ))}
                    </colgroup>
                    <thead className="bg-ink/[0.03] text-[11px] font-semibold text-ink/55">
                      <tr>
                        {specColDefs.map((c) => (
                          <ResizableTh
                            key={c.key}
                            label={c.label}
                            width={widthFor(c.key, c.defaultWidth)}
                            onResize={(next) => setColWidth(c.key, next)}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {active.rows.map((row) => {
                        const rowMats = materialsForRow(row);
                        const rowDims = dimsForRow(row, active.kind);
                        const rowSizes = rowDims.sizes;
                        const rowThicks = rowDims.thicknesses;
                        const rowH = rowHeights[row.id];
                        const showPipeSizes =
                          (active.kind === "hydronic" ||
                            active.kind === "plumbing") &&
                          rowSizes.length > 0;
                        const showDuctSizeInputs = active.kind === "duct";
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
                        const matsLoading =
                          canPickInsulation &&
                          isFamilyMaterialsLoading(row.insulationFamily);
                        const hasProduct =
                          layerPicks.some(
                            (L) => L.materialName || L.materialCode
                          ) || Boolean(row.materialName || row.materialCode);
                        const canLayersFinish = Boolean(
                          hasProduct &&
                            (row.insulationFamily || row.materialCode)
                        );
                        const mikeBusy = mikeCodeBusy === row.id;
                        const dimsLoading =
                          matsLoading &&
                          Boolean(
                            row.insulationLayers?.[0]?.materialName ??
                              row.materialName
                          );
                        const canSize = hasProduct;

                        return (
                          <tr
                            key={row.id}
                            className="relative border-t border-ink/[0.06] align-middle"
                            style={
                              rowH
                                ? { height: rowH, minHeight: rowH }
                                : undefined
                            }
                          >
                            <td className="relative px-1 py-0.5">
                              <span
                                role="separator"
                                aria-orientation="horizontal"
                                aria-label="Resize row"
                                title="Drag to resize row height"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const el = e.currentTarget.closest("tr");
                                  const startH =
                                    rowH ||
                                    el?.getBoundingClientRect().height ||
                                    36;
                                  startRowResize(row.id, e.clientY, startH);
                                }}
                                className="absolute inset-x-0 bottom-0 z-10 h-1 cursor-row-resize hover:bg-brand/40 active:bg-brand/60"
                              />
                              <CellBusy busy={systemsLoading}>
                                <select
                                  disabled={!editable || systemsLoading}
                                  className={cellBusySelectClass(
                                    !editable || systemsLoading,
                                    systemsLoading
                                  )}
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
                              </CellBusy>
                            </td>
                            <td className="px-1 py-0.5">
                              <CodeChip code={row.systemCode} />
                            </td>
                            <td className="px-1 py-0.5 text-xs text-ink/50">
                              {row.unit ?? "—"}
                            </td>
                            <td className="px-1 py-0.5">
                              <CellBusy busy={areasLoading && canArea}>
                                <select
                                  disabled={
                                    !editable || !canArea || areasLoading
                                  }
                                  className={cellBusySelectClass(
                                    !editable || !canArea || areasLoading,
                                    areasLoading && canArea
                                  )}
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
                              </CellBusy>
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
                                // Layer 0 may still be empty after older saves — fall back to row.
                                const displayName =
                                  pick?.materialName ??
                                  (i === 0 ? row.materialName : null);
                                const displayCode =
                                  pick?.materialCode ||
                                  (i === 0 ? row.materialCode : null) ||
                                  (displayName
                                    ? rowMats.find(
                                        (m) => m.description === displayName
                                      )?.code
                                    : null);
                                return (
                                  <Fragment key={`${row.id}-ins-${i}`}>
                                    <td className="px-1 py-0.5">
                                      {activeSlot ? (
                                        <CellBusy busy={matsLoading}>
                                          <select
                                            disabled={
                                              !editable || matsLoading
                                            }
                                            className={cellBusySelectClass(
                                              !editable || matsLoading,
                                              matsLoading
                                            )}
                                            value={displayName ?? ""}
                                            onChange={(e) =>
                                              pickMaterialAtLayer(
                                                active.id,
                                                row,
                                                i,
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="">
                                              {matsLoading
                                                ? "Loading…"
                                                : "—"}
                                            </option>
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
                                            {displayName &&
                                            !rowMats.some(
                                              (m) =>
                                                m.description === displayName
                                            ) ? (
                                              <option value={displayName}>
                                                {displayName}
                                              </option>
                                            ) : null}
                                          </select>
                                        </CellBusy>
                                      ) : (
                                        <span className="text-xs text-ink/25">
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-1 py-0.5">
                                      {activeSlot ? (
                                        <CodeChip code={displayCode} />
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
                                <CellBusy busy={mikeBusy}>
                                  <input
                                    disabled={!editable || mikeBusy}
                                    className={`${cellBusySelectClass(
                                      !editable || mikeBusy,
                                      mikeBusy
                                    )} w-20`}
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
                                </CellBusy>
                                <button
                                  type="button"
                                  disabled={!editable || mikeBusy}
                                  onClick={() =>
                                    void runMikeCode(active.id, row)
                                  }
                                  className="inline-flex min-w-[2rem] items-center justify-center rounded-lg border border-ink/10 px-1.5 text-[10px] font-semibold text-ink/60 hover:border-brand/40 hover:text-brand disabled:opacity-40"
                                  aria-label={mikeBusy ? "Loading" : "Apply Mike code"}
                                >
                                  {mikeBusy ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-brand" />
                                  ) : (
                                    "Go"
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-1 py-0.5">
                              <CellBusy
                                busy={facingsLoading && canLayersFinish}
                              >
                                <select
                                  disabled={
                                    !editable ||
                                    !canLayersFinish ||
                                    facingsLoading
                                  }
                                  className={cellBusySelectClass(
                                    !editable ||
                                      !canLayersFinish ||
                                      facingsLoading,
                                    facingsLoading && canLayersFinish
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
                              </CellBusy>
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
                              <CellBusy busy={dimsLoading && canSize}>
                                {showPipeSizes ? (
                                  row.sizeMin === sizeRangeMin &&
                                  row.sizeMax === mikeSizeMax ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] font-medium text-ink/55">
                                        All sizes
                                      </span>
                                      {editable && canSize ? (
                                        <button
                                          type="button"
                                          className="text-[10px] text-brand hover:underline"
                                          onClick={() =>
                                            patchRow(active.id, row.id, {
                                              sizeMin: null,
                                              sizeMax: null,
                                            })
                                          }
                                        >
                                          Clear
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <select
                                      disabled={
                                        !editable || !canSize || dimsLoading
                                      }
                                      className={`${cellBusySelectClass(
                                        !editable || !canSize || dimsLoading,
                                        dimsLoading && canSize
                                      )} w-24`}
                                      value={
                                        row.sizeMin != null
                                          ? String(row.sizeMin)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === "__all__") {
                                          patchRow(active.id, row.id, {
                                            sizeMin: sizeRangeMin,
                                            sizeMax: mikeSizeMax,
                                          });
                                          return;
                                        }
                                        patchRow(active.id, row.id, {
                                          sizeMin: v
                                            ? clampInch(Number(v))
                                            : null,
                                        });
                                      }}
                                    >
                                      <option value="">
                                        {dimsLoading ? "Loading…" : "—"}
                                      </option>
                                      <option value="__all__">All sizes</option>
                                      {rowSizes.map((s) => (
                                        <option
                                          key={s.value}
                                          value={String(s.value)}
                                        >
                                          {dimLabel(s)}
                                        </option>
                                      ))}
                                    </select>
                                  )
                                ) : showDuctSizeInputs ? (
                                  <input
                                    type="number"
                                    step="any"
                                    min={sizeRangeMin}
                                    max={sizeRangeMax}
                                    disabled={!editable || !canSize}
                                    placeholder="any"
                                    className={`${selectClass(!editable || !canSize)} w-20`}
                                    value={row.sizeMin ?? ""}
                                    onChange={(e) =>
                                      patchRow(active.id, row.id, {
                                        sizeMin: e.target.value
                                          ? clampInch(Number(e.target.value))
                                          : null,
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-ink/35">—</span>
                                )}
                              </CellBusy>
                            </td>
                            <td className="px-1 py-0.5">
                              <CellBusy busy={dimsLoading && canSize}>
                                {showPipeSizes ? (
                                  row.sizeMin === sizeRangeMin &&
                                  row.sizeMax === mikeSizeMax ? (
                                    <span className="text-[10px] text-ink/40">
                                      0–{mikeSizeMax}
                                    </span>
                                  ) : (
                                    <select
                                      disabled={
                                        !editable || !canSize || dimsLoading
                                      }
                                      className={`${cellBusySelectClass(
                                        !editable || !canSize || dimsLoading,
                                        dimsLoading && canSize
                                      )} w-24`}
                                      value={
                                        row.sizeMax != null
                                          ? String(row.sizeMax)
                                          : ""
                                      }
                                      onChange={(e) =>
                                        patchRow(active.id, row.id, {
                                          sizeMax: e.target.value
                                            ? clampInch(Number(e.target.value))
                                            : null,
                                        })
                                      }
                                    >
                                      <option value="">
                                        {dimsLoading ? "Loading…" : "—"}
                                      </option>
                                      {rowSizes.map((s) => (
                                        <option
                                          key={s.value}
                                          value={String(s.value)}
                                        >
                                          {dimLabel(s)}
                                        </option>
                                      ))}
                                    </select>
                                  )
                                ) : showDuctSizeInputs ? (
                                  <input
                                    type="number"
                                    step="any"
                                    min={sizeRangeMin}
                                    max={sizeRangeMax}
                                    disabled={!editable || !canSize}
                                    placeholder="any"
                                    className={`${selectClass(!editable || !canSize)} w-20`}
                                    value={row.sizeMax ?? ""}
                                    onChange={(e) =>
                                      patchRow(active.id, row.id, {
                                        sizeMax: e.target.value
                                          ? clampInch(Number(e.target.value))
                                          : null,
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-ink/35">—</span>
                                )}
                              </CellBusy>
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                type="number"
                                step="any"
                                min={sizeRangeMin}
                                max={sizeRangeMax}
                                disabled={!editable || !canSize}
                                placeholder="—"
                                title={`Width ${sizeRangeMin}–${sizeRangeMax} in`}
                                className={`${selectClass(!editable || !canSize)} w-20`}
                                value={row.widthIn ?? ""}
                                onChange={(e) =>
                                  patchRow(active.id, row.id, {
                                    widthIn: e.target.value
                                      ? clampInch(Number(e.target.value))
                                      : null,
                                  })
                                }
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <CellBusy busy={dimsLoading && canSize}>
                                {rowThicks.length === 0 && !dimsLoading ? (
                                  <span className="text-xs text-ink/35">—</span>
                                ) : (
                                  <select
                                    disabled={
                                      !editable || !canSize || dimsLoading
                                    }
                                    className={`${cellBusySelectClass(
                                      !editable || !canSize || dimsLoading,
                                      dimsLoading && canSize
                                    )} w-24`}
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
                                    <option value="">
                                      {dimsLoading ? "Loading…" : "—"}
                                    </option>
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
                              </CellBusy>
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
                            </td>
                            {editable ? (
                              <td className="px-1 py-0.5">
                                <div className="flex flex-row items-center gap-0.5">
                                  {allowCopyRow ? (
                                    <button
                                      type="button"
                                      title="Copy row"
                                      aria-label="Copy row"
                                      onClick={() => copyRow(row.id)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink/45 transition hover:bg-ink/[0.06] hover:text-brand"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden
                                      >
                                        <rect
                                          x="9"
                                          y="9"
                                          width="13"
                                          height="13"
                                          rx="2"
                                        />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    title="Delete row"
                                    aria-label="Delete row"
                                    onClick={() => removeRow(row.id)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-danger/70 transition hover:bg-danger-tint/40 hover:text-danger"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  </button>
                                </div>
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
