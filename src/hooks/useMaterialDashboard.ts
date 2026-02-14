"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicketRow } from "@/lib/types";
import type { Direction } from "@/lib/types";
import * as materialApi from "@/lib/api/endpoints/material-dashboard";

export interface MaterialDashboardFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  direction: Direction;
}

export function useMaterialDashboard(filters: MaterialDashboardFilters) {
  const [kpis, setKpis] = useState({ totalTickets: 0, topSource: "—", topDestination: "—", activeJobs: 0 });
  const [sitesTable, setSitesTable] = useState<{ externalSiteName: string; direction: string; totalTickets: number }[]>([]);
  const [jobsTable, setJobsTable] = useState<{ jobName: string; direction: string; totalTickets: number }[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    const apiFilters = {
      companyId: filters.companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      direction: filters.direction,
    };

    setLoading(true);
    setError(null);

    Promise.all([
      materialApi.getMaterialKpis(apiFilters),
      materialApi.getMaterialSitesSummary(apiFilters),
      materialApi.getMaterialJobsSummary(apiFilters),
      materialApi.getMaterialTickets(apiFilters, page, pageSize),
    ])
      .then(([k, s, j, t]) => {
        setKpis(k);
        setSitesTable(s);
        setJobsTable(j);
        setTickets(t.items);
        setTotalTickets(t.total);
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }, [
    filters.companyId,
    filters.startDate,
    filters.endDate,
    filters.jobId,
    filters.materialId,
    filters.direction,
    page,
    pageSize,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    kpis,
    sitesTable,
    jobsTable,
    tickets,
    totalTickets,
    page,
    pageSize,
    setPage,
    loading,
    error,
    refetch: load,
  };
}
