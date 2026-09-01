/**
 * Bidding Specs API — FRONTEND_BIDDING_SPECS.md
 */
import { del, get, patch, post } from "../client";
import type {
  ActivateMikeFileResponse,
  AutoFromMikeResponse,
  CatalogItem,
  CreateMikeFileBody,
  CreateMikeFileResponse,
  EstimationFileDetail,
  MikeFileInfo,
  MikeFilesListResponse,
  MikeRowInput,
  MikeRowsListResponse,
  PatchMikeFileBody,
  SpecArea,
  SpecFacing,
  SpecLine,
  SpecLineWrite,
  SpecMaterial,
  SpecSizeOption,
  SpecSystem,
  SpecThicknessOption,
} from "@/lib/bidding/specs-types";
import { mergeSpecFacings, normalizeSpecFacings } from "@/lib/bidding/specs-types";

// ——— Lookups ———

export async function getSpecSystems(params?: {
  kind?: "duct" | "hydronic" | "plumbing" | "equipment" | string;
}): Promise<SpecSystem[]> {
  const raw = await get<unknown>("/lookups/bidding/spec-systems", {
    kind: params?.kind,
  });
  return asLookupArray<SpecSystem>(raw);
}

/** Spec sheet: pass kind. Takeoff Specs qty grid: omit kind. */
export async function getSpecMaterials(params?: {
  family?: string;
  layer?: string;
  code?: string;
  q?: string;
  /** Ignored by BE; kept for callers. Prefer family+layer. */
  kind?: "duct" | "hydronic" | "plumbing" | "equipment" | string;
}): Promise<SpecMaterial[]> {
  const raw = await get<unknown>("/lookups/bidding/spec-materials", {
    family: params?.family,
    layer: params?.layer,
    code: params?.code,
    q: params?.q,
    kind: params?.kind,
  });
  return asLookupArray<SpecMaterial>(raw);
}

export async function getSpecAreas(): Promise<SpecArea[]> {
  const raw = await get<unknown>("/lookups/bidding/spec-areas");
  return asLookupArray<SpecArea>(raw);
}

function asLookupArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["items", "data", "rows", "result", "results"]) {
      if (Array.isArray(o[key])) return o[key] as T[];
    }
  }
  return [];
}

/** Per-material Trimble NPS. Without `code` returns [] — never invent a global list. */
export async function getSpecSizes(params?: {
  kind?: string;
  code?: string;
}): Promise<SpecSizeOption[]> {
  const code = params?.code?.trim();
  if (!code) return [];
  try {
    const raw = await get<unknown>("/lookups/bidding/spec-sizes", {
      kind: params?.kind,
      code,
    });
    return normalizeNumericLookup(raw);
  } catch {
    return [];
  }
}

/** Per-material thicknesses. Without `code` returns [] — never invent a global list. */
export async function getSpecThicknesses(params?: {
  kind?: string;
  code?: string;
}): Promise<SpecThicknessOption[]> {
  const code = params?.code?.trim();
  if (!code) return [];
  try {
    const raw = await get<unknown>("/lookups/bidding/spec-thicknesses", {
      kind: params?.kind,
      code,
    });
    return normalizeNumericLookup(raw);
  } catch {
    return [];
  }
}

function normalizeNumericLookup(raw: unknown): SpecSizeOption[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.values)) list = o.values;
  }
  const out: SpecSizeOption[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (typeof item === "number" && Number.isFinite(item)) {
      out.push({ value: item, label: `${item}"`, sortOrder: i });
      continue;
    }
    if (item && typeof item === "object") {
      const r = item as Record<string, unknown>;
      const v = Number(r.value ?? r.size ?? r.thickness ?? r.inches);
      if (!Number.isFinite(v)) continue;
      const labelRaw = r.label != null ? String(r.label).trim() : "";
      out.push({
        value: v,
        label: labelRaw || `${v}"`,
        sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : i,
      });
      continue;
    }
    const n = Number(item);
    if (Number.isFinite(n)) {
      out.push({ value: n, label: `${n}"`, sortOrder: i });
    }
  }
  return out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Normalize material.sizes / material.thicknesses from lookup. */
export function normalizeSpecDimOptions(raw: unknown): SpecSizeOption[] {
  return normalizeNumericLookup(raw);
}

export async function getSpecFacings(): Promise<SpecFacing[]> {
  try {
    const raw = await get<unknown>("/lookups/bidding/spec-facings");
    return mergeSpecFacings(normalizeSpecFacings(raw));
  } catch {
    return mergeSpecFacings([]);
  }
}

export async function searchItemCatalog(params?: {
  search?: string;
  size1?: number;
  size2?: number;
  limit?: number;
}): Promise<CatalogItem[]> {
  return get<CatalogItem[]>("/lookups/bidding/item-catalog", {
    search: params?.search,
    size1: params?.size1,
    size2: params?.size2,
    limit: params?.limit,
  });
}

export async function patchCatalogItemPrice(
  id: number,
  price: number
): Promise<CatalogItem> {
  return patch<CatalogItem>(`/lookups/bidding/item-catalog/${id}`, { price });
}

// ——— Global estimation-files library ———

function asFileList(raw: unknown): MikeFileInfo[] {
  if (Array.isArray(raw)) return raw as MikeFileInfo[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.files)) return o.files as MikeFileInfo[];
    if (Array.isArray(o.items)) return o.items as MikeFileInfo[];
    if (Array.isArray(o.data)) return o.data as MikeFileInfo[];
  }
  return [];
}

export async function listEstimationFiles(params?: {
  q?: string;
  bidId?: number;
  limit?: number;
}): Promise<MikeFileInfo[]> {
  const raw = await get<unknown>("/estimation-files", {
    q: params?.q,
    bidId: params?.bidId,
    limit: params?.limit,
  });
  return asFileList(raw);
}

export async function getEstimationFile(
  fileId: string | number
): Promise<EstimationFileDetail> {
  const raw = await get<
    EstimationFileDetail | { file: EstimationFileDetail; bid?: EstimationFileDetail["bid"]; rows?: MikeRowInput[] }
  >(`/estimation-files/${fileId}`);
  if (raw && typeof raw === "object" && "file" in raw && raw.file) {
    return {
      ...raw.file,
      bid: raw.bid ?? raw.file.bid,
      rows: raw.rows ?? raw.file.rows ?? [],
    };
  }
  const detail = raw as EstimationFileDetail;
  return { ...detail, rows: detail.rows ?? [] };
}

export async function deleteEstimationFile(
  fileId: string | number
): Promise<void> {
  await del(`/estimation-files/${fileId}`);
}

export async function activateEstimationFile(
  fileId: string | number
): Promise<{ bidId?: number; activeMikeFileId?: number }> {
  return post(`/estimation-files/${fileId}/activate`, {});
}

// ——— Bid-scoped Mike files (upload) ———

function normalizeMikeFilesList(raw: unknown): MikeFilesListResponse {
  if (Array.isArray(raw)) {
    const files = raw as MikeFileInfo[];
    const active = files.find((f) => f.isActive);
    return { files, activeMikeFileId: active?.id ?? null };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const files = (Array.isArray(o.files) ? o.files : []) as MikeFileInfo[];
    return {
      bidId: typeof o.bidId === "number" ? o.bidId : undefined,
      activeMikeFileId:
        typeof o.activeMikeFileId === "number" ? o.activeMikeFileId : null,
      files,
    };
  }
  return { files: [], activeMikeFileId: null };
}

export async function getMikeFiles(
  bidId: string | number
): Promise<MikeFilesListResponse> {
  const raw = await get<unknown>(`/bids/${bidId}/mike-files`);
  return normalizeMikeFilesList(raw);
}

export async function createMikeFile(
  bidId: string | number,
  body: CreateMikeFileBody
): Promise<CreateMikeFileResponse> {
  return post<CreateMikeFileResponse>(`/bids/${bidId}/mike-files`, {
    fileName: body.fileName,
    rows: body.rows,
    activate: body.activate !== false,
    ...(body.jobId != null ? { jobId: body.jobId } : {}),
    ...(body.jobNumberHint ? { jobNumberHint: body.jobNumberHint } : {}),
    ...(body.projectLabel ? { projectLabel: body.projectLabel } : {}),
  });
}

/** Rename takeoff / set job without re-upload */
export async function patchMikeFile(
  bidId: string | number,
  fileId: number,
  body: PatchMikeFileBody
): Promise<MikeFileInfo> {
  return patch<MikeFileInfo>(`/bids/${bidId}/mike-files/${fileId}`, body);
}

export async function patchEstimationFile(
  fileId: string | number,
  body: PatchMikeFileBody
): Promise<MikeFileInfo> {
  return patch<MikeFileInfo>(`/estimation-files/${fileId}`, body);
}

export async function activateMikeFile(
  bidId: string | number,
  fileId: number
): Promise<ActivateMikeFileResponse> {
  const raw = await post<ActivateMikeFileResponse | MikeFilesListResponse>(
    `/bids/${bidId}/mike-files/${fileId}/activate`,
    {}
  );
  const normalized = normalizeMikeFilesList(raw);
  return {
    bidId: normalized.bidId,
    activeMikeFileId: normalized.activeMikeFileId ?? fileId,
    files: normalized.files,
  };
}

export async function deleteMikeFile(
  bidId: string | number,
  fileId: number
): Promise<ActivateMikeFileResponse | { ok: true }> {
  return del(`/bids/${bidId}/mike-files/${fileId}`);
}

export async function getMikeRows(
  bidId: string | number,
  fileId?: number
): Promise<MikeRowInput[]> {
  const res = await get<MikeRowsListResponse | MikeRowInput[]>(
    `/bids/${bidId}/mike-rows`,
    fileId != null ? { fileId } : undefined
  );
  if (Array.isArray(res)) return res;
  return res.rows ?? [];
}

/** @deprecated Prefer createMikeFile */
export async function replaceMikeRows(
  bidId: string | number,
  body: CreateMikeFileBody
): Promise<CreateMikeFileResponse> {
  return createMikeFile(bidId, body);
}

// ——— Spec lines ———

export async function getSpecLines(bidId: string | number): Promise<SpecLine[]> {
  const res = await get<SpecLine[] | { lines: SpecLine[] }>(`/bids/${bidId}/spec-lines`);
  return Array.isArray(res) ? res : (res.lines ?? []);
}

export async function createSpecLine(
  bidId: string | number,
  body: SpecLineWrite
): Promise<SpecLine> {
  return post<SpecLine>(`/bids/${bidId}/spec-lines`, body);
}

export async function patchSpecLine(
  bidId: string | number,
  lineId: number,
  body: Partial<SpecLineWrite>
): Promise<SpecLine> {
  return patch<SpecLine>(`/bids/${bidId}/spec-lines/${lineId}`, body);
}

export async function deleteSpecLine(
  bidId: string | number,
  lineId: number
): Promise<{ ok: true }> {
  return del<{ ok: true }>(`/bids/${bidId}/spec-lines/${lineId}`);
}

export async function autoFromMike(
  bidId: string | number,
  replace = true
): Promise<AutoFromMikeResponse> {
  return post<AutoFromMikeResponse>(`/bids/${bidId}/spec-lines/auto-from-mike`, {
    replace,
  });
}
