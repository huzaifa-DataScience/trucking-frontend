"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicketRow } from "@/lib/types";
import type { Direction } from "@/lib/types";
import * as jobApi from "@/lib/api/endpoints/job-dashboard";

export interface JobDashboardFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId: string;
  direction: Direction;
}

export interface JobDashboardState {
  kpis: { totalTickets: number; flowBalance: string; lastActive: string };
  vendorTable: { companyName: string; truckType: string; totalTickets: number }[];
  materialTable: { materialName: string; totalTickets: number }[];
  tickets: TicketRow[];
  totalTickets: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: Error | null;
}

const defaultKpis = { totalTickets: 0, flowBalance: "0 Imports / 0 Exports", lastActive: "—" };

export function useJobDashboard(filters: JobDashboardFilters) {
  const [kpis, setKpis] = useState(defaultKpis);
  const [vendorTable, setVendorTable] = useState<{ companyName: string; truckType: string; totalTickets: number }[]>([]);
  const [materialTable, setMaterialTable] = useState<{ materialName: string; totalTickets: number }[]>([]);
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
      direction: filters.direction,
    };

    setLoading(true);
    setError(null);

    Promise.all([
      jobApi.getJobKpis(apiFilters),
      jobApi.getJobVendorSummary(apiFilters),
      jobApi.getJobMaterialSummary(apiFilters),
      jobApi.getJobTickets(apiFilters, page, pageSize),
    ])
      .then(([k, v, m, t]) => {
        setKpis(k);
        setVendorTable(v);
        setMaterialTable(m);
        setTickets(t.items);
        setTotalTickets(t.total);
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }, [filters.companyId, filters.startDate, filters.endDate, filters.jobId, filters.direction, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    kpis,
    vendorTable,
    materialTable,
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
