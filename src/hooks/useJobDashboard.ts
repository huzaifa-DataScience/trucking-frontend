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
  /** Our internal company (Ref_OurEntities). */
  entityId?: string;
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

export function useJobDashboard(filters: JobDashboardFilters, opts: { initialSearch?: string } = {}) {
  const [kpis, setKpis] = useState(defaultKpis);
  const [vendorTable, setVendorTable] = useState<{ companyName: string; truckType: string; totalTickets: number }[]>([]);
  const [materialTable, setMaterialTable] = useState<{ materialName: string; totalTickets: number }[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sort, setSort] = useState<{ by?: string; dir: "ASC" | "DESC" }>({ by: undefined, dir: "DESC" });
  const [search, setSearch] = useState(opts.initialSearch ?? "");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const sortBy = sort.by;
  const sortDir = sort.dir;

  const changeSort = useCallback((column: string) => {
    setPage(1);
    setSort((prev) =>
      prev.by === column ? { by: column, dir: prev.dir === "ASC" ? "DESC" : "ASC" } : { by: column, dir: "ASC" }
    );
  }, []);

  const changeSearch = useCallback((value: string) => {
    setPage(1);
    setSearch(value);
  }, []);

  const load = useCallback(() => {
    const apiFilters = {
      companyId: filters.companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      direction: filters.direction,
      entityId: filters.entityId,
    };

    setLoading(true);
    setError(null);

    Promise.all([
      jobApi.getJobKpis(apiFilters),
      jobApi.getJobVendorSummary(apiFilters),
      jobApi.getJobMaterialSummary(apiFilters),
      jobApi.getJobTickets(apiFilters, { page, pageSize, sortBy, sortDir, search }),
    ])
      .then(([k, v, m, t]) => {
        setKpis(k);
        setVendorTable(v);
        setMaterialTable(m);
        setTickets(t.items);
        setTotalTickets(t.total);
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  }, [
    filters.companyId,
    filters.startDate,
    filters.endDate,
    filters.jobId,
    filters.direction,
    filters.entityId,
    page,
    pageSize,
    sortBy,
    sortDir,
    search,
  ]);

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
    sortBy,
    sortDir,
    onSortChange: changeSort,
    search,
    onSearchChange: changeSearch,
    loading,
    initialLoading,
    error,
    refetch: load,
  };
}
