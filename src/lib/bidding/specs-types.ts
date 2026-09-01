/** Bidding Specs (Specs Plumb) — FRONTEND_BIDDING_SPECS.md */

export interface SpecSystem {
  id: number;
  systemName: string;
  code: string;
  unit: string;
  /** Sheet kind when filtered — duct | hydronic | plumbing */
  kind?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SpecDimOption {
  value: number;
  label?: string;
  sortOrder?: number;
}

export interface SpecMaterial {
  id: number;
  description: string;
  code: string;
  /** Present when filtered by ?kind= for Spec sheet (kind is ignored by BE). */
  kind?: string | null;
  /** Insulation family id — fiberglass | elastomeric | … */
  family?: string | null;
  /** insulation | covering */
  layer?: string | null;
  facing?: string | null;
  jacket?: string | null;
  thicknessIn?: number | null;
  weight?: number | null;
  /** Same as description (Excel List type label). */
  excelDescription?: string | null;
  /** Matching Trimble catalog rows for this type. */
  skuCount?: number | null;
  /** Unique pipe NPS from catalog SKUs for this material. */
  sizes?: SpecDimOption[] | null;
  /** Unique insulation thicknesses for this material. */
  thicknesses?: SpecDimOption[] | null;
  sortOrder: number;
  isActive: boolean;
}

export type SpecSizeOption = SpecDimOption;
export type SpecThicknessOption = SpecDimOption;

export interface SpecArea {
  id: number;
  areaName: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SpecFacing {
  id: number;
  value: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** Built-in Facing options — used when lookup empty / as merge base (doc §5). */
export const DEFAULT_SPEC_FACINGS: SpecFacing[] = [
  { id: 1, value: "ASJ", label: "ASJ", sortOrder: 1, isActive: true },
  { id: 2, value: "FSK", label: "FSK", sortOrder: 2, isActive: true },
  { id: 3, value: "PSK", label: "PSK", sortOrder: 3, isActive: true },
  { id: 4, value: "Aluminum", label: "Aluminum", sortOrder: 4, isActive: true },
  { id: 5, value: "All Service", label: "All Service", sortOrder: 5, isActive: true },
  { id: 6, value: "None", label: "None", sortOrder: 6, isActive: true },
];

/** Excel placeholder — never show or PATCH as a real facing value */
export function normalizeFacingValue(
  value: string | null | undefined
): string {
  const v = String(value ?? "").trim();
  if (!v || /^facing$/i.test(v)) return "";
  return v;
}

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
    // PascalCase fallback
    const pascal = k.charAt(0).toUpperCase() + k.slice(1);
    const pv = row[pascal];
    if (pv != null && String(pv).trim()) return String(pv).trim();
  }
  return "";
}

/** Map API / string shapes → SpecFacing[]; unwrap wrappers; drop placeholder “Facing”. */
export function normalizeSpecFacings(raw: unknown): SpecFacing[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.facings)) list = o.facings;
    else if (Array.isArray(o.rows)) list = o.rows;
    else if (Array.isArray(o.result)) list = o.result;
    else if (Array.isArray(o.results)) list = o.results;
  }

  const out: SpecFacing[] = [];
  list.forEach((item, i) => {
    if (typeof item === "string") {
      const v = normalizeFacingValue(item);
      if (!v) return;
      out.push({ id: i + 1, value: v, label: v, sortOrder: i, isActive: true });
      return;
    }
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const value = normalizeFacingValue(
      strField(row, "value", "code", "name", "facing", "description", "label")
    );
    if (!value) return;
    const label =
      normalizeFacingValue(
        strField(row, "label", "name", "description", "value", "code")
      ) || value;
    const active = row.isActive ?? row.IsActive;
    out.push({
      id: typeof row.id === "number" ? row.id : typeof row.Id === "number" ? row.Id : i + 1,
      value,
      label,
      sortOrder:
        typeof row.sortOrder === "number"
          ? row.sortOrder
          : typeof row.SortOrder === "number"
            ? row.SortOrder
            : i,
      isActive: active !== false && active !== 0 && active !== "false",
    });
  });

  return out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Merge API facings with defaults so dropdown never empty. */
export function mergeSpecFacings(api: SpecFacing[]): SpecFacing[] {
  const byKey = new Map<string, SpecFacing>();
  for (const f of DEFAULT_SPEC_FACINGS) {
    byKey.set(f.value.toLowerCase(), f);
  }
  for (const f of api) {
    if (f.isActive === false) continue;
    byKey.set(f.value.toLowerCase(), f);
  }
  return [...byKey.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Doc §5: backend should fill facing from Structshare name (FSK/ASJ/…).
 * If still empty on the line, infer for display so select shows the right option.
 */
export function inferFacingFromText(
  ...texts: Array<string | null | undefined>
): string {
  const blob = texts.filter(Boolean).join(" ").toUpperCase();
  if (!blob) return "";
  // Longer / more specific first
  const tokens = [
    "ALL SERVICE",
    "ALUMINUM",
    "PSK",
    "FSK",
    "ASJ",
    "NONE",
  ];
  for (const t of tokens) {
    if (blob.includes(t)) {
      if (t === "ALL SERVICE") return "All Service";
      if (t === "ALUMINUM") return "Aluminum";
      if (t === "NONE") return "None";
      return t;
    }
  }
  return "";
}

/** Resolve line.facing → option value (case-insensitive). */
export function resolveFacingSelectValue(
  facing: string | null | undefined,
  facings: SpecFacing[]
): string {
  const n = normalizeFacingValue(facing);
  if (!n) return "";
  const hit = facings.find(
    (f) =>
      f.value.toLowerCase() === n.toLowerCase() ||
      f.label.toLowerCase() === n.toLowerCase()
  );
  return hit?.value ?? n;
}

export type CatalogMatchMode = "pipe" | "roll";

export interface CatalogItem {
  id: number;
  itemName: string;
  price: number | null;
  size1: number | null;
  size2: number | null;
}

/** One Structshare catalog match on a Spec line — FRONTEND_BIDDING_SPECS.md §5.2 */
export interface StructshareOption {
  /** Product text — vendor branding stripped by API */
  itemName: string;
  /** Optional / ignored for Specs UI (no cheapest pick) */
  price: number | null;
}

export interface MikeRowInput {
  excelRowNumber?: number;
  systemAndType?: string;
  thickness?: number | null;
  size?: number | null;
  quantity?: number;
  materialCost?: number | null;
  hours?: number | null;
  materialPhrase?: string | null;
  materialBase?: string | null;
}

/** Parsed from Mike CSV row 1 metadata (Estimate, job#, title…) */
export interface MikeFileMeta {
  jobNumberHint?: string;
  projectLabel?: string;
}

export interface MikeParseResult {
  rows: MikeRowInput[];
  meta: MikeFileMeta;
}

export type JobLinkStatus =
  | "auto_linked"
  | "already_set"
  | "not_found"
  | "no_hint";

export interface JobLinkInfo {
  status: JobLinkStatus;
  message?: string;
  matchedJobNumber?: string | null;
  jobId?: number | null;
  trimbleProjectId?: number | null;
}

export interface SpecLineWrite {
  type?: string | null;
  systemName: string;
  areaName?: string | null;
  insulation: string;
  size: number;
  thickness: number;
  weight?: string | null;
  facing?: string | null;
  addJacket?: string | null;
  layers?: string | null;
  extraNotes?: string | null;
  sortOrder?: number;
}

/** Persisted inputs + server-computed display fields */
export interface SpecLine extends SpecLineWrite {
  id: number;
  bidId: number;
  sortOrder: number;
  trimbleProjectId?: number | null;
  code: string | null;
  areaCode: string | null;
  materialCode: string | null;
  /** Spec/List system unit (LF/SF) — Est side */
  unit: string | null;
  /** Trimble UoM on matched recv (Roll, LF, …) — null → "—" */
  trimbleUnit?: string | null;
  materialBase: string | null;
  keyword: string | null;
  /** Backend catalog size rule — pipe IPS×thick vs roll thickness-only */
  catalogMatchMode?: CatalogMatchMode | null;
  qtyEstimated: number;
  productionPerHour: number | null;
  qtyReceived: number;
  qtyRemain: number;
  /** Mike hours for this Spec stack (optional on Specs; main view is Production) */
  hoursEstimated?: number | null;
  /** Earned hours from received (optional on Specs) */
  hoursEstimatedFromReceived?: number | null;
  /** Always null — no cheapest / vendor pick (2026-08-09) */
  structshareItem: string | null;
  /** Always null — do not show a single price */
  structshareUnitPrice: number | null;
  /**
   * Collective catalog item matches (vendor stripped from itemName).
   * Name-sorted; price optional/ignored. Max 100.
   */
  structshareOptions?: StructshareOption[];
  /** Roll mode only — else null */
  structshareSfPerRoll?: number | null;
  /** Roll mode only — else null */
  qtyReceivedSf?: number | null;
  /** Roll mode only — e.g. "3 rolls of 400 sq ft" */
  qtyReceivedSummary?: string | null;
}

export interface MikeRowsListResponse {
  bidId?: number;
  rows?: MikeRowInput[];
  count?: number;
  mikeFileId?: number | null;
}

/** One estimation / Mike file — FRONTEND_BIDDING_SPECS.md §7 global library */
export interface MikeFileInfo {
  id: number;
  bidId: number;
  fileName: string;
  rowCount: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  jobNumberHint?: string | null;
  projectLabel?: string | null;
  estimateNumber?: string | null;
  bidName?: string | null;
  bidStatus?: string | null;
}

export interface EstimationFileDetail {
  id: number;
  bidId: number;
  fileName: string;
  rowCount: number;
  isActive: boolean;
  createdAt?: string | null;
  jobNumberHint?: string | null;
  projectLabel?: string | null;
  estimateNumber?: string | null;
  bidName?: string | null;
  bidStatus?: string | null;
  bid?: {
    id: number;
    estimateNumber?: string | null;
    bidName?: string | null;
    status?: string | null;
    jobId?: number | null;
    trimbleProjectId?: number | null;
  } | null;
  rows: MikeRowInput[];
}

export interface MikeFilesListResponse {
  bidId?: number;
  activeMikeFileId?: number | null;
  files: MikeFileInfo[];
}

export interface CreateMikeFileBody {
  fileName: string;
  rows: MikeRowInput[];
  /** User-picked job — preferred over jobNumberHint alone */
  jobId?: number | null;
  jobNumberHint?: string;
  projectLabel?: string;
  activate?: boolean;
}

export interface CreateMikeFileResponse {
  bidId?: number;
  imported: number;
  appended?: boolean;
  mikeFile?: MikeFileInfo | null;
  jobId?: number | null;
  trimbleProjectId?: number | null;
  jobLink?: JobLinkInfo | null;
  /** Present when backend auto-rebuilds Specs on upload (2026-08-10) */
  specsRegenerated?: {
    created: number;
    lineCount?: number;
    lines?: SpecLine[];
  } | null;
}

export interface PatchMikeFileBody {
  fileName?: string;
  jobId?: number | null;
  jobNumberHint?: string | null;
  projectLabel?: string | null;
}

export interface ActivateMikeFileResponse {
  bidId?: number;
  activeMikeFileId?: number | null;
  files: MikeFileInfo[];
}

/** @deprecated Prefer CreateMikeFileBody — POST mike-rows is legacy add alias */
export interface ReplaceMikeRowsBody {
  rows: MikeRowInput[];
  fileName?: string;
  jobNumberHint?: string;
  projectLabel?: string;
  activate?: boolean;
}

export interface ReplaceMikeRowsResponse {
  bidId?: number;
  imported: number;
  mikeFile?: MikeFileInfo | null;
  jobId?: number | null;
  trimbleProjectId?: number | null;
  jobLink?: JobLinkInfo | null;
}

export interface AutoFromMikeResponse {
  bidId: number;
  created: number;
  lines: SpecLine[];
}

export interface MikeUploadBuildResult {
  imported: number;
  created: number;
  lines: SpecLine[];
  jobId: number | null;
  trimbleProjectId: number | null;
  jobLink: JobLinkInfo | null;
  mikeFile?: MikeFileInfo | null;
  files?: MikeFileInfo[];
  activeMikeFileId?: number | null;
}

export const SPEC_TYPES = ["Plumbing", "HVAC", "Duct"] as const;
