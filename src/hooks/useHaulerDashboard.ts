"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicketRow } from "@/lib/types";
import type { Direction } from "@/lib/types";
import * as haulerApi from "@/lib/api/endpoints/hauler-dashboard";

export interface HaulerDashboardFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  haulerId: string;
  truckTypeId: string;
  direction: Direction;
  /** Our internal company (Ref_OurEntities). */
  entityId?: string;
}

export function useHaulerDashboard(filters: HaulerDashboardFilters) {
  const [kpis, setKpis] = useState({ totalTickets: 0, uniqueTrucks: 0, activeJobs: 0 });
  const [billableUnits, setBillableUnits] = useState<{ truckType: string; totalTickets: number }[]>([]);
  const [costCenter, setCostCenter] = useState<{ jobName: string; totalTickets: number }[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sort, setSort] = useState<{ by?: string; dir: "ASC" | "DESC" }>({ by: undefined, dir: "DESC" });
  const [search, setSearch] = useState("");
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
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      haulerId: filters.haulerId === "all" ? undefined : filters.haulerId,
      truckTypeId: filters.truckTypeId === "all" ? undefined : filters.truckTypeId,
      direction: filters.direction,
      entityId: filters.entityId,
    };

    setLoading(true);
    setError(null);

    Promise.all([
      haulerApi.getHaulerKpis(apiFilters),
      haulerApi.getHaulerBillableUnits(apiFilters),
      haulerApi.getHaulerCostCenter(apiFilters),
      haulerApi.getHaulerTickets(apiFilters, { page, pageSize, sortBy, sortDir, search }),
    ])
      .then(([k, b, c, t]) => {
        setKpis(k);
        setBillableUnits(b);
        setCostCenter(c);
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
    filters.materialId,
    filters.haulerId,
    filters.truckTypeId,
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
    billableUnits,
    costCenter,
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
