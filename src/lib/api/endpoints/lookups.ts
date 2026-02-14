import { get } from "../client";
import type { LookupItem } from "../types";

/** Optional companyId for when backend supports it. */
type LookupParams = { companyId?: string };

const toLookupParams = (params?: LookupParams) => {
  if (!params?.companyId) return undefined;
  return { companyId: Number(params.companyId) };
};

export async function getJobs(params?: LookupParams): Promise<LookupItem[]> {
  return get<LookupItem[]>("/lookups/jobs", toLookupParams(params));
}

export async function getMaterials(params?: LookupParams): Promise<LookupItem[]> {
  return get<LookupItem[]>("/lookups/materials", toLookupParams(params));
}

export async function getHaulers(params?: LookupParams): Promise<LookupItem[]> {
  return get<LookupItem[]>("/lookups/haulers", toLookupParams(params));
}

export async function getTruckTypes(params?: LookupParams): Promise<LookupItem[]> {
  return get<LookupItem[]>("/lookups/truck-types", toLookupParams(params));
}

export async function getExternalSites(params?: LookupParams): Promise<LookupItem[]> {
  return get<LookupItem[]>("/lookups/external-sites", toLookupParams(params));
}
