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

export function useLookups(companyId?: string) {
  const [jobs, setJobs] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<LookupItem[]>([]);
  const [haulers, setHaulers] = useState<LookupItem[]>([]);
  const [truckTypes, setTruckTypes] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = companyId ? { companyId } : undefined;

    Promise.all([
      lookupsApi.getJobs(params),
      lookupsApi.getMaterials(params),
      lookupsApi.getHaulers(params),
      lookupsApi.getTruckTypes(params),
    ])
      .then(([j, m, h, t]) => {
        if (!cancelled) {
          setJobs(j);
          setMaterials(m);
          setHaulers(h);
          setTruckTypes(t);
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
  }, [companyId]);

  const filterOptions: FilterOptions = {
    jobs: [{ value: "all", label: "All" }, ...toOptions(jobs)],
    materials: [{ value: "all", label: "All" }, ...toOptions(materials)],
    haulers: [{ value: "all", label: "All" }, ...toOptions(haulers)],
    truckTypes: [{ value: "all", label: "All" }, ...toOptions(truckTypes)],
  };

  return { jobs, materials, haulers, truckTypes, filterOptions, loading, error };
}
