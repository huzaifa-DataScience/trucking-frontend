/**
 * WFS API — FRONTEND_WFS.md
 */
import { get, patch, post } from "../client";
import type {
  WfsAgingLine,
  WfsAgingSide,
  WfsCashRow,
  WfsCompanyKey,
  WfsDashboard,
  WfsStaticItem,
  WfsStaticPatchItem,
  WfsStatus,
} from "@/lib/wfs/types";

function asArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["items", "data", "rows", "result", "results", "lines"]) {
      if (Array.isArray(o[key])) return o[key] as T[];
    }
  }
  return [];
}

export async function getWfsStatus(): Promise<WfsStatus> {
  return get<WfsStatus>("/wfs/status");
}

export async function getWfsDashboard(): Promise<WfsDashboard> {
  return get<WfsDashboard>("/wfs/dashboard");
}

/** Writes/overwrites today’s History Log row — needs wfs:write. */
export async function postWfsSnapshot(): Promise<WfsDashboard | { ok?: boolean }> {
  return post<WfsDashboard | { ok?: boolean }>("/wfs/snapshot", {});
}

export async function getWfsAging(params: {
  company: WfsCompanyKey | string;
  side: WfsAgingSide;
}): Promise<WfsAgingLine[]> {
  const raw = await get<unknown>("/wfs/aging", {
    company: params.company,
    side: params.side,
  });
  return asArray<WfsAgingLine>(raw);
}

export async function getWfsCash(): Promise<WfsCashRow[]> {
  const raw = await get<unknown>("/wfs/cash");
  return asArray<WfsCashRow>(raw);
}

export async function getWfsStatic(): Promise<WfsStaticItem[]> {
  const raw = await get<unknown>("/wfs/static");
  return asArray<WfsStaticItem>(raw);
}

export async function patchWfsStatic(
  items: WfsStaticPatchItem[]
): Promise<WfsStaticItem[]> {
  const raw = await patch<unknown>("/wfs/static", { items });
  return asArray<WfsStaticItem>(raw);
}
