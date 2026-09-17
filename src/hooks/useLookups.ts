"use client";

import { useEffect, useState } from "react";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import type { LookupItem } from "@/lib/api/types";
import type { FilterOptions } from "@/components/reporting/ReportFilters";

function toOption(item: LookupItem): { value: string; label: string } {
  return { value: String(item.id), label: item.name };
}

function toOptions(list: LookupItem[]): { value: string; label: string }[] {
  return list.map(toOption);
}

type LookupField = "jobs" | "materials" | "haulers" | "truckTypes" | "ourEntities";
const ALL_FIELDS: LookupField[] = ["jobs", "materials", "haulers", "truckTypes", "ourEntities"];

/**
 * Pass `include` to skip lookups a caller doesn't need — this hook is mounted on every
 * page via Header's global search, so fetching all 5 unconditionally means every page
 * load fires unused hauler/truck-type/entity requests alongside the ones it actually uses.
 */
export function useLookups(companyId?: string, include: LookupField[] = ALL_FIELDS) {
  const [jobs, setJobs] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<LookupItem[]>([]);
  const [haulers, setHaulers] = useState<LookupItem[]>([]);
  const [truckTypes, setTruckTypes] = useState<LookupItem[]>([]);
  const [ourEntities, setOurEntities] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const includeKey = include.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = companyId ? { companyId } : undefined;
    const want = new Set(includeKey.split(",") as LookupField[]);

    Promise.all([
      want.has("jobs") ? lookupsApi.getJobs(params) : Promise.resolve<LookupItem[]>([]),
      want.has("materials") ? lookupsApi.getMaterials(params) : Promise.resolve<LookupItem[]>([]),
      want.has("haulers") ? lookupsApi.getHaulers(params) : Promise.resolve<LookupItem[]>([]),
      want.has("truckTypes") ? lookupsApi.getTruckTypes(params) : Promise.resolve<LookupItem[]>([]),
      want.has("ourEntities") ? lookupsApi.getOurEntities() : Promise.resolve<LookupItem[]>([]),
    ])
      .then(([j, m, h, t, e]) => {
        if (!cancelled) {
          setJobs(j);
          setMaterials(m);
          setHaulers(h);
          setTruckTypes(t);
          setOurEntities(e);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, includeKey]);

  const filterOptions: FilterOptions = {
    jobs: [{ value: "all", label: "All" }, ...toOptions(jobs)],
    materials: [{ value: "all", label: "All" }, ...toOptions(materials)],
    haulers: [{ value: "all", label: "All" }, ...toOptions(haulers)],
    truckTypes: [{ value: "all", label: "All" }, ...toOptions(truckTypes)],
    ourEntities: [{ value: "all", label: "All companies" }, ...toOptions(ourEntities)],
  };

  return { jobs, materials, haulers, truckTypes, ourEntities, filterOptions, loading, error };
}
