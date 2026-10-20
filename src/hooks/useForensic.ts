"use client";

import { useEffect, useMemo, useState } from "react";
import type { LateSubmissionRow, EfficiencyOutlierRow } from "@/lib/types";
import type { Direction } from "@/lib/types";
import * as forensicApi from "@/lib/api/endpoints/forensic";
import type { ForensicPage } from "@/lib/api/endpoints/forensic";
import { asDate, sortRows, type SortDir, type SortValue } from "@/lib/sort";

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

/** Rows per page in both forensic tables (server-side). */
export const FORENSIC_PAGE_SIZE = 50;

export const LATE_SORT: Record<string, (r: LateSubmissionRow) => SortValue> = {
  ticket: (r) => r.ticketNumber,
  ticketDate: (r) => asDate(r.ticketDate),
  entryDate: (r) => asDate(r.systemEntryDate),
  lag: (r) => r.lagTime,
  signedBy: (r) => r.signedBy,
  jobName: (r) => r.jobName,
  hauler: (r) => r.haulerCompanyName,
};

export const OUTLIER_SORT: Record<string, (r: EfficiencyOutlierRow) => SortValue> = {
  date: (r) => asDate(r.date),
  jobName: (r) => r.jobName,
  route: (r) => r.route,
  truck: (r) => r.truckNumber,
  hauler: (r) => r.haulerName,
  tickets: (r) => r.totalTickets,
  duration: (r) => r.workDuration,
  avgCycle: (r) => r.myAvgCycle,
  benchmark: (r) => r.fleetBenchmark,
  status: (r) => r.statusLabel,
};

export interface TableSortState {
  key: string | null;
  dir: SortDir;
}

/** An older backend sends every row; sort and page them here until it is updated. */
function localPage<T>(
  res: ForensicPage<T> & { paged: boolean },
  page: number,
  sort: TableSortState,
  accessors: Record<string, (r: T) => SortValue>
): ForensicPage<T> {
  if (res.paged) return res;
  const sorted = sort.key && accessors[sort.key] ? sortRows(res.items, accessors[sort.key], sort.dir) : res.items;
  const pages = Math.max(1, Math.ceil(sorted.length / FORENSIC_PAGE_SIZE));
  const p = Math.min(pages, Math.max(1, page));
  return {
    items: sorted.slice((p - 1) * FORENSIC_PAGE_SIZE, p * FORENSIC_PAGE_SIZE),
    total: sorted.length,
    page: p,
    pageSize: FORENSIC_PAGE_SIZE,
  };
}

/** Page + sort for one table; a filter or sort change goes back to page 1. Same click rule as useTableSort. */
function usePagedSort(filterKey: string) {
  const [sort, setSort] = useState<TableSortState>({ key: null, dir: "asc" });
  const toggle = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const key = `${filterKey}|${sort.key}|${sort.dir}`;
  const [pageState, setPageState] = useState({ key, page: 1 });
  const page = pageState.key === key ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key, page: next });
  return { sort, toggle, page, setPage };
}

export function useForensic(filters: ForensicFilters) {
  const apiFilters = useMemo(
    () => ({
      companyId: filters.companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      haulerId: filters.haulerId === "all" ? undefined : filters.haulerId,
      truckTypeId: filters.truckTypeId === "all" ? undefined : filters.truckTypeId,
      direction: filters.direction,
    }),
    [
      filters.companyId,
      filters.startDate,
      filters.endDate,
      filters.jobId,
      filters.materialId,
      filters.haulerId,
      filters.truckTypeId,
      filters.direction,
    ]
  );
  const filterKey = JSON.stringify(apiFilters);

  const lateCtl = usePagedSort(filterKey);
  const outlierCtl = usePagedSort(filterKey);

  const [lateTicketsFound, setLateTicketsFound] = useState(0);
  const [late, setLate] = useState<ForensicPage<LateSubmissionRow> | null>(null);
  const [outliers, setOutliers] = useState<ForensicPage<EfficiencyOutlierRow> | null>(null);
  // Which request each table last finished (and its error, if any); "loading" = the current request has not finished yet.
  const [lateDone, setLateDone] = useState<{ key: string; error: Error | null } | null>(null);
  const [outlierDone, setOutlierDone] = useState<{ key: string; error: Error | null } | null>(null);
  const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

  const latePage = lateCtl.page;
  const lateSortKey = lateCtl.sort.key;
  const lateSortDir = lateCtl.sort.dir;
  const lateKey = `${filterKey}|${latePage}|${lateSortKey}|${lateSortDir}`;
  useEffect(() => {
    let cancelled = false;
    const sort = { key: lateSortKey, dir: lateSortDir };
    forensicApi
      .getLateSubmissionsPage(apiFilters, { page: latePage, pageSize: FORENSIC_PAGE_SIZE, sortBy: sort.key, sortDir: sort.dir })
      .then((res) => {
        if (cancelled) return;
        setLateTicketsFound(res.lateTicketsFound);
        setLate(localPage(res, latePage, sort, LATE_SORT));
        setLateDone({ key: lateKey, error: null });
      })
      .catch((e) => {
        if (!cancelled) setLateDone({ key: lateKey, error: asError(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [apiFilters, latePage, lateSortKey, lateSortDir, lateKey]);

  const outlierPage = outlierCtl.page;
  const outlierSortKey = outlierCtl.sort.key;
  const outlierSortDir = outlierCtl.sort.dir;
  const outlierKey = `${filterKey}|${outlierPage}|${outlierSortKey}|${outlierSortDir}`;
  useEffect(() => {
    let cancelled = false;
    const sort = { key: outlierSortKey, dir: outlierSortDir };
    forensicApi
      .getEfficiencyOutliersPage(apiFilters, { page: outlierPage, pageSize: FORENSIC_PAGE_SIZE, sortBy: sort.key, sortDir: sort.dir })
      .then((res) => {
        if (cancelled) return;
        setOutliers(localPage(res, outlierPage, sort, OUTLIER_SORT));
        setOutlierDone({ key: outlierKey, error: null });
      })
      .catch((e) => {
        if (!cancelled) setOutlierDone({ key: outlierKey, error: asError(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [apiFilters, outlierPage, outlierSortKey, outlierSortDir, outlierKey]);

  const lateLoading = lateDone?.key !== lateKey;
  const outlierLoading = outlierDone?.key !== outlierKey;
  const error = (lateDone?.key === lateKey ? lateDone.error : null) ?? (outlierDone?.key === outlierKey ? outlierDone.error : null);

  return {
    lateTicketsFound,
    late,
    lateLoading,
    lateCtl,
    outliers,
    outlierLoading,
    outlierCtl,
    /** True only until both tables have their first page. */
    loading: (lateLoading && !late) || (outlierLoading && !outliers),
    error,
    /** Every row for the Excel export (the tables only hold one page). */
    exportLate: () => forensicApi.getLateSubmissions(apiFilters).then((d) => d.items),
    exportOutliers: () => forensicApi.getEfficiencyOutliers(apiFilters),
  };
}
