"use client";

import { useCallback, useEffect, useState } from "react";
import type { LateSubmissionRow, EfficiencyOutlierRow } from "@/lib/types";
import type { Direction } from "@/lib/types";
import * as forensicApi from "@/lib/api/endpoints/forensic";

export interface ForensicFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  haulerId: string;
  truckTypeId: string;
  direction: Direction;
}

export function useForensic(filters: ForensicFilters) {
  const [lateRows, setLateRows] = useState<LateSubmissionRow[]>([]);
  const [efficiencyRows, setEfficiencyRows] = useState<EfficiencyOutlierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    const apiFilters = {
      companyId: filters.companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      haulerId: filters.haulerId === "all" ? undefined : filters.haulerId,
      truckTypeId: filters.truckTypeId === "all" ? undefined : filters.truckTypeId,
      direction: filters.direction,
    };

    setLoading(true);
    setError(null);

    Promise.all([
      forensicApi.getLateSubmissions(apiFilters),
      forensicApi.getEfficiencyOutliers(apiFilters),
    ])
      .then(([late, eff]) => {
        setLateRows(late);
        setEfficiencyRows(eff);
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }, [
    filters.companyId,
    filters.startDate,
    filters.endDate,
    filters.jobId,
    filters.materialId,
    filters.haulerId,
    filters.truckTypeId,
    filters.direction,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { lateRows, efficiencyRows, loading, error, refetch: load };
}
