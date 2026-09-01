/**
 * Spec sheet helpers — FRONTEND_SPEC_SHEET.md
 * Dropdown rules (not FortuneSheet). Save display names as strings.
 */
import type {
  SpecSheet,
  SpecSheetDuctShape,
  SpecSheetInsulationFamily,
  SpecSheetInsulationLayer,
  SpecSheetKind,
  SpecSheetMetaOption,
  SpecSheetRow,
  SpecSheetSizeMode,
  SpecSheetTemplateMeta,
} from "@/lib/bidding/process-types";
import { newId } from "@/lib/bidding/newId";

export const MAX_SPEC_SHEETS = 12;
export const MAX_SPEC_ROWS = 60;
export const MAX_SPEC_IMAGES = 20;
export const SPEC_SHEET_IMAGE_LABEL = "spec-sheet-image";

/** Extra layer counts in the Layers dropdown — 1 is never listed (always default). */
export const SPEC_INSULATION_LAYER_COUNTS = [2, 3, 4] as const;

/** Default is always 1 insulation column when Layers is unset. */
export function effectiveInsulationLayerCount(
  count: number | null | undefined
): number {
  if (count != null && Number.isFinite(count) && count >= 1) {
    return Math.min(4, Math.floor(count));
  }
  return 1;
}
const KIND_TITLES: Record<SpecSheetKind, string> = {
  duct: "Duct Insulation Schedule",
  hydronic: "HVAC Piping Insulation",
  plumbing: "Plumbing Piping Insulation",
  equipment: "Equipment Insulation",
};

const KIND_LABELS: Record<SpecSheetKind, string> = {
  duct: "Duct",
  hydronic: "HVAC pipe",
  plumbing: "Plumbing",
  equipment: "Equipment",
};

const DEFAULT_KIND_HINTS: Record<SpecSheetKind, string[]> = {
  duct: ["air", "duct", "exhaust", "supply", "return", "hvac"],
  hydronic: ["chill", "heat", "steam", "hydronic", "hot water", "chw", "hw"],
  plumbing: ["domestic", "sanitary", "storm", "plumbing", "drain", "waste"],
  equipment: ["equipment", "tank", "chiller", "pump", "boiler", "ahu"],
};

/** Exact ids from FRONTEND_SPEC_SHEET.md when process-meta lists are missing. */
export const DEFAULT_SPEC_FAMILIES: { id: string; label: string }[] = [
  { id: "fiberglass", label: "Fiberglass" },
  { id: "elastomeric", label: "Elastomeric" },
  { id: "polyiso", label: "Polyiso" },
  { id: "phenolic", label: "Phenolic foam" },
  { id: "mineral_wool", label: "Mineral wool" },
  { id: "calcium_silicate", label: "Calcium silicate" },
  { id: "foamglas", label: "Foamglas" },
  { id: "fire_rated_duct_wrap", label: "Fire-rated duct wrap" },
  {
    id: "closed_cell_polyethylene",
    label: "Closed-cell polyethylene / bubble wrap",
  },
  { id: "other", label: "Other" },
];

export const DEFAULT_SPEC_COVERINGS: { id: string; label: string }[] = [
  { id: "none", label: "None" },
  { id: "aluminum_016", label: 'Aluminum 0.016"' },
  { id: "aluminum_020", label: 'Aluminum 0.020"' },
  { id: "aluminum_024", label: 'Aluminum 0.024"' },
  { id: "stainless", label: "Stainless" },
  { id: "pvc", label: "PVC" },
  { id: "canvas", label: "Canvas" },
  { id: "sound_lag", label: "Sound lag" },
  { id: "other", label: "Other" },
];

export const DEFAULT_SPEC_MANUFACTURERS: { id: string; label: string }[] = [
  { id: "owens_corning", label: "Owens Corning" },
  { id: "johns_manville", label: "Johns Manville" },
  { id: "knauf", label: "Knauf" },
  { id: "manson", label: "Manson" },
  { id: "other", label: "Other" },
];

export const DEFAULT_SPEC_DUCT_SHAPES: { id: string; label: string }[] = [
  { id: "rectangular", label: "Rectangular" },
  { id: "square", label: "Square" },
  { id: "round", label: "Round" },
  { id: "oval", label: "Oval" },
];

const FAMILY_IDS = new Set(DEFAULT_SPEC_FAMILIES.map((f) => f.id));
const DUCT_SHAPE_IDS = new Set(DEFAULT_SPEC_DUCT_SHAPES.map((d) => d.id));
const SIZE_MODES = new Set<SpecSheetSizeMode>([
  "nps",
  "circumference",
  "any",
]);

export function defaultSizeModeForKind(kind: SpecSheetKind): SpecSheetSizeMode {
  if (kind === "hydronic" || kind === "plumbing") return "nps";
  if (kind === "duct") return "circumference";
  return "any";
}

export function emptyInsulationLayer(): SpecSheetInsulationLayer {
  return {
    id: newId(),
    materialName: null,
    materialCode: null,
    thicknessIn: null,
  };
}

export function asInsulationLayerCount(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // 1 is the implicit default — store as null so UI shows "—"
  if (n === 1) return null;
  if ((SPEC_INSULATION_LAYER_COUNTS as readonly number[]).includes(n)) return n;
  return null;
}

/** Resize layer picks; null count → 1 slot (default insulation always shown). */
export function resizeInsulationLayers(
  existing: SpecSheetInsulationLayer[] | null | undefined,
  count: number | null
): SpecSheetInsulationLayer[] {
  const n = effectiveInsulationLayerCount(count);
  const cur = Array.isArray(existing) ? existing : [];
  if (cur.length === n) return cur;
  if (cur.length > n) return cur.slice(0, n);
  return [
    ...cur,
    ...Array.from({ length: n - cur.length }, () => emptyInsulationLayer()),
  ];
}

/** Keep legacy material* fields in sync with layers[0]. */
export function syncPrimaryMaterialFields(
  layers: SpecSheetInsulationLayer[]
): Pick<SpecSheetRow, "materialName" | "materialCode" | "thicknessIn"> {
  const first = layers[0];
  return {
    materialName: first?.materialName ?? null,
    materialCode: first?.materialCode ?? null,
    thicknessIn: first?.thicknessIn ?? null,
  };
}

export function emptySpecSheetRow(
  kind?: SpecSheetKind | null
): SpecSheetRow {
  return {
    id: newId(),
    systemName: null,
    systemCode: null,
    unit: null,
    areaName: null,
    areaCode: null,
    sizeMin: null,
    sizeMax: null,
    sizeMode: kind ? defaultSizeModeForKind(kind) : null,
    ductShape: null,
    insulationFamily: null,
    insulationLayerCount: null,
    insulationLayers: [emptyInsulationLayer()],
    materialName: null,
    materialCode: null,
    thicknessIn: null,
    weight: null,
    facing: null,
    jacket: null,
    manufacturersAllowed: [],
    manufacturerPreferred: null,
    accessories: null,
    specSection: null,
    specParagraph: null,
    otherNote: null,
    notes: null,
  };
}

function blankRows(count = 6, kind?: SpecSheetKind): SpecSheetRow[] {
  return Array.from({ length: count }, () => emptySpecSheetRow(kind));
}

function asKind(raw: unknown): SpecSheetKind {
  const s = String(raw ?? "").toLowerCase();
  if (s === "hydronic" || s === "hvac" || s === "hvac_pipe") return "hydronic";
  if (s === "plumbing") return "plumbing";
  if (s === "equipment") return "equipment";
  return "duct";
}

function asNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function asNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asSizeMode(v: unknown): SpecSheetSizeMode | null {
  const s = String(v ?? "").toLowerCase();
  if (SIZE_MODES.has(s as SpecSheetSizeMode)) return s as SpecSheetSizeMode;
  return null;
}

function asDuctShape(v: unknown): SpecSheetDuctShape | null {
  const s = String(v ?? "").toLowerCase();
  if (DUCT_SHAPE_IDS.has(s)) return s as SpecSheetDuctShape;
  return null;
}

function asInsulationFamily(v: unknown): SpecSheetInsulationFamily | null {
  const s = String(v ?? "").toLowerCase();
  if (FAMILY_IDS.has(s)) return s as SpecSheetInsulationFamily;
  return null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

function metaOptions(
  raw: SpecSheetMetaOption[] | string[] | undefined,
  fallback: { id: string; label: string }[]
): { id: string; label: string }[] {
  if (!raw || raw.length === 0) return fallback;
  return raw.map((item) => {
    if (typeof item === "string") {
      const hit = fallback.find((f) => f.id === item);
      return {
        id: item,
        label:
          hit?.label ??
          item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    }
    return {
      id: item.id,
      label:
        item.label ||
        fallback.find((f) => f.id === item.id)?.label ||
        item.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  });
}

export function familiesFromMeta(
  families: SpecSheetMetaOption[] | string[] | null | undefined
) {
  return metaOptions(families ?? undefined, DEFAULT_SPEC_FAMILIES);
}

export function coveringsFromMeta(
  coverings: SpecSheetMetaOption[] | string[] | null | undefined
) {
  return metaOptions(coverings ?? undefined, DEFAULT_SPEC_COVERINGS);
}

export function manufacturersFromMeta(
  manufacturers: SpecSheetMetaOption[] | string[] | null | undefined
) {
  return metaOptions(manufacturers ?? undefined, DEFAULT_SPEC_MANUFACTURERS);
}

export function ductShapesFromMeta(
  ductShapes: SpecSheetMetaOption[] | string[] | null | undefined
) {
  return metaOptions(ductShapes ?? undefined, DEFAULT_SPEC_DUCT_SHAPES);
}

/**
 * Infer insulation family when BE omits `family` on the material row.
 */
export function inferMaterialFamily(m: {
  code?: string | null;
  description?: string | null;
  family?: string | null;
}): SpecSheetInsulationFamily | null {
  if (m.family) {
    const f = String(m.family).trim().toLowerCase();
    if (FAMILY_IDS.has(f)) return f as SpecSheetInsulationFamily;
  }
  const code = String(m.code ?? "")
    .trim()
    .toUpperCase();
  const desc = String(m.description ?? "").toLowerCase();
  const COVERING_CODES = new Set([
    "ALM",
    "CAN",
    "PVC",
    "PVJ",
    "PVI",
    "PWI",
    "SS",
    "ESS",
    "ELJ",
    "ELG",
    "LAG",
    "SIZ",
    "GFM",
    "PSG",
    "MSC",
    "MSH",
  ]);
  if (COVERING_CODES.has(code)) return null;

  if (
    code.startsWith("FG") ||
    ["DUW", "DWF", "DWP", "DBW", "DUB", "PT", "FRW", "FAL", "FVA", "FVC", "FVP", "FVS"].includes(
      code
    ) ||
    desc.includes("fiberglass") ||
    desc.includes("duct wrap")
  ) {
    return "fiberglass";
  }
  if (
    code.startsWith("FL") ||
    ["RUB", "RAA", "RVB", "ATF"].includes(code) ||
    desc.includes("armaflex") ||
    desc.includes("elastomer") ||
    desc.includes("rubber")
  ) {
    return "elastomeric";
  }
  if (
    code === "FMW" ||
    code === "GDW" ||
    desc.includes("fire master") ||
    desc.includes("grease duct") ||
    desc.includes("fire-rated") ||
    desc.includes("fire rated")
  ) {
    return "fire_rated_duct_wrap";
  }
  if (
    code.startsWith("FM") ||
    ["FAV", "FCV", "FPV", "FSV"].includes(code) ||
    desc.includes("foamglas") ||
    desc.includes("foamglass")
  ) {
    return "foamglas";
  }
  if (
    code.startsWith("CA") ||
    code.startsWith("CS") ||
    desc.includes("cal sil") ||
    desc.includes("calcium sil")
  ) {
    return "calcium_silicate";
  }
  if (
    ["MIN", "MMB", "BLK", "BLC"].includes(code) ||
    desc.includes("mineral wool") ||
    desc.includes("tiw") ||
    desc.includes("insul quick")
  ) {
    return "mineral_wool";
  }
  if (desc.includes("polyiso") || desc.includes("polyisocyanurate")) {
    return "polyiso";
  }
  if (desc.includes("phenolic")) return "phenolic";
  if (
    desc.includes("polyethylene") ||
    desc.includes("bubble") ||
    code === "URE" ||
    desc.includes("urethane")
  ) {
    return "closed_cell_polyethylene";
  }
  return "other";
}

/**
 * Filter insulation materials for a family.
 * Live BE (2026-08) often omits `family`/`layer` and ignores ?family=&layer= —
 * fall back to code/description heuristics so the Insulation dropdown is not empty.
 */
export function filterMaterialsForFamily<
  T extends {
    code?: string | null;
    description?: string | null;
    family?: string | null;
    layer?: string | null;
  },
>(materials: T[], family: string | null | undefined): T[] {
  const fam = String(family ?? "")
    .trim()
    .toLowerCase();
  if (!fam || !materials.length) return [];

  const tagged = materials.filter(
    (m) => String(m.family ?? "").toLowerCase() === fam
  );
  if (tagged.length > 0) {
    return tagged.filter(
      (m) =>
        !m.layer || String(m.layer).toLowerCase() === "insulation"
    );
  }

  const matched = materials.filter((m) => inferMaterialFamily(m) === fam);
  if (matched.length > 0) return matched;

  // Last resort so the row stays usable while BE catches up.
  return materials.filter((m) => inferMaterialFamily(m) != null);
}

function normalizeInsulationLayers(
  raw: unknown,
  count: number | null,
  legacyName: string | null,
  legacyCode: string | null,
  legacyThick: number | null
): SpecSheetInsulationLayer[] {
  const fromArray = Array.isArray(raw)
    ? raw.map((item) => {
        const o =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return {
          id:
            typeof o.id === "string" && o.id
              ? o.id
              : newId(),
          materialName: asNullableString(o.materialName),
          materialCode: asNullableString(o.materialCode),
          thicknessIn: asNullableNumber(o.thicknessIn),
        };
      })
    : [];

  let layers = resizeInsulationLayers(fromArray, count);
  // Hydrate from legacy single material if layers empty but name exists.
  if (
    count != null &&
    layers.length > 0 &&
    !layers[0].materialName &&
    (legacyName || legacyCode)
  ) {
    layers = layers.map((L, i) =>
      i === 0
        ? {
            ...L,
            materialName: legacyName,
            materialCode: legacyCode,
            thicknessIn: legacyThick,
          }
        : L
    );
  }
  return layers;
}

export function normalizeSpecSheetRow(
  raw: unknown,
  kind?: SpecSheetKind | null
): SpecSheetRow {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const sizeMode =
    asSizeMode(o.sizeMode) ??
    (kind ? defaultSizeModeForKind(kind) : null);
  const materialName = asNullableString(o.materialName);
  const materialCode = asNullableString(o.materialCode);
  const thicknessIn = asNullableNumber(o.thicknessIn);
  let insulationLayerCount = asInsulationLayerCount(o.insulationLayerCount);
  const insulationLayers = normalizeInsulationLayers(
    o.insulationLayers,
    insulationLayerCount,
    materialName,
    materialCode,
    thicknessIn
  );
  const primary = syncPrimaryMaterialFields(insulationLayers);
  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    systemName: asNullableString(o.systemName),
    systemCode: asNullableString(o.systemCode),
    unit: asNullableString(o.unit),
    areaName: asNullableString(o.areaName),
    areaCode: asNullableString(o.areaCode),
    sizeMin: asNullableNumber(o.sizeMin),
    sizeMax: asNullableNumber(o.sizeMax),
    sizeMode,
    ductShape: asDuctShape(o.ductShape),
    insulationFamily: asInsulationFamily(o.insulationFamily),
    insulationLayerCount,
    insulationLayers,
    materialName: primary.materialName ?? materialName,
    materialCode: primary.materialCode ?? materialCode,
    thicknessIn: primary.thicknessIn ?? thicknessIn,
    weight: asNullableNumber(o.weight),
    facing: asNullableString(o.facing),
    jacket: asNullableString(o.jacket),
    manufacturersAllowed: asStringArray(o.manufacturersAllowed),
    manufacturerPreferred: asNullableString(o.manufacturerPreferred),
    accessories: asNullableString(o.accessories),
    specSection: asNullableString(o.specSection),
    specParagraph: asNullableString(o.specParagraph),
    otherNote: asNullableString(o.otherNote),
    notes: asNullableString(o.notes),
  };
}

/** Coerce API / legacy Fortune-shaped sheets into dropdown-rules shape. */
export function normalizeSpecSheet(raw: unknown): SpecSheet {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const kind = asKind(o.kind ?? o.template);
  const rowsRaw = Array.isArray(o.rows) ? o.rows : [];
  const rows =
    rowsRaw.length > 0
      ? rowsRaw.slice(0, MAX_SPEC_ROWS).map((r) => normalizeSpecSheetRow(r, kind))
      : blankRows(6, kind);
  const imageIds = Array.isArray(o.imageAttachmentIds)
    ? o.imageAttachmentIds
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n))
        .slice(0, MAX_SPEC_IMAGES)
    : [];

  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    kind,
    title:
      asNullableString(o.title) ??
      KIND_TITLES[kind],
    specNumber: asNullableString(o.specNumber),
    rows,
    footerNote: asNullableString(o.footerNote),
    imageAttachmentIds: imageIds,
  };
}

export function normalizeSpecSheets(raw: unknown): SpecSheet[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SPEC_SHEETS).map(normalizeSpecSheet);
}

/** Primary add-sheet kinds — FRONTEND_SPEC_SHEET.md includes Equipment. */
export function defaultSpecSheetTemplates(): SpecSheetTemplateMeta[] {
  return (
    ["duct", "hydronic", "plumbing", "equipment"] as SpecSheetKind[]
  ).map((kind) => ({
    id: kind,
    label: KIND_LABELS[kind],
    empty: {
      id: `new-${kind}`,
      kind,
      title: KIND_TITLES[kind],
      specNumber: null,
      rows: blankRows(6, kind),
      footerNote: null,
      imageAttachmentIds: [],
    },
  }));
}

/** Clone template.empty with fresh ids on sheet + every row. */
export function mintSpecSheet(
  kindOrTemplateId: string,
  templates?: SpecSheetTemplateMeta[]
): SpecSheet {
  const list = templates?.length ? templates : defaultSpecSheetTemplates();
  const kind = asKind(kindOrTemplateId);
  const tpl =
    list.find((t) => String(t.id).toLowerCase() === String(kindOrTemplateId).toLowerCase()) ??
    list.find((t) => asKind(t.id) === kind) ??
    list[0];

  const base = tpl?.empty
    ? normalizeSpecSheet(tpl.empty)
    : normalizeSpecSheet({ kind, title: KIND_TITLES[kind] });

  const resolvedKind = asKind(tpl?.id ?? kind);
  return {
    ...base,
    id: newId(),
    kind: resolvedKind,
    title: base.title || KIND_TITLES[resolvedKind],
    rows: (base.rows.length ? base.rows : blankRows(6, resolvedKind)).map(
      (r) => ({
        ...r,
        id: newId(),
        sizeMode: r.sizeMode ?? defaultSizeModeForKind(resolvedKind),
      })
    ),
    imageAttachmentIds: [],
  };
}

export function systemKindHintsFromMeta(
  hints: Partial<Record<SpecSheetKind, string[]>> | null | undefined
): Record<SpecSheetKind, string[]> {
  return {
    duct: hints?.duct?.length ? hints.duct : DEFAULT_KIND_HINTS.duct,
    hydronic: hints?.hydronic?.length
      ? hints.hydronic
      : DEFAULT_KIND_HINTS.hydronic,
    plumbing: hints?.plumbing?.length
      ? hints.plumbing
      : DEFAULT_KIND_HINTS.plumbing,
    equipment: hints?.equipment?.length
      ? hints.equipment
      : DEFAULT_KIND_HINTS.equipment,
  };
}

/**
 * Leftover fallback only — prefer GET /spec-systems?kind=…
 * Do not use for day-1 Spec sheet UI (drops real List rows).
 */
export function filterSystemsForKind<T extends { systemName: string }>(
  systems: T[],
  kind: SpecSheetKind,
  hints: Partial<Record<SpecSheetKind, string[]>> | null | undefined
): T[] {
  const needles = systemKindHintsFromMeta(hints)[kind].map((h) =>
    h.toLowerCase()
  );
  const matched = systems.filter((s) => {
    const name = (s.systemName ?? "").toLowerCase();
    return needles.some((n) => name.includes(n));
  });
  return matched.length > 0 ? matched : systems;
}

export function kindLabel(kind: SpecSheetKind): string {
  return KIND_LABELS[kind] ?? kind;
}

export function specSheetsFingerprint(sheets: SpecSheet[]): string {
  return JSON.stringify(
    sheets.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      specNumber: s.specNumber,
      footerNote: s.footerNote,
      imageAttachmentIds: s.imageAttachmentIds ?? [],
      rows: (s.rows ?? []).map((r) => ({
        id: r.id,
        systemName: r.systemName,
        systemCode: r.systemCode,
        unit: r.unit,
        areaName: r.areaName,
        areaCode: r.areaCode,
        sizeMin: r.sizeMin,
        sizeMax: r.sizeMax,
        sizeMode: r.sizeMode,
        ductShape: r.ductShape,
        insulationFamily: r.insulationFamily,
        insulationLayerCount: r.insulationLayerCount,
        insulationLayers: r.insulationLayers ?? [],
        materialName: r.materialName,
        materialCode: r.materialCode,
        thicknessIn: r.thicknessIn,
        weight: r.weight,
        facing: r.facing,
        jacket: r.jacket,
        manufacturersAllowed: r.manufacturersAllowed ?? [],
        manufacturerPreferred: r.manufacturerPreferred,
        accessories: r.accessories,
        specSection: r.specSection,
        specParagraph: r.specParagraph,
        otherNote: r.otherNote,
        notes: r.notes,
      })),
    }))
  );
}
