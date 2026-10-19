import { get } from "../client";
import type {
  ApiLateSubmissionResponse,
  ApiEfficiencyOutlierRow,
} from "../types";
import type { LateSubmissionRow, EfficiencyOutlierRow } from "@/lib/types";
import type { Direction } from "@/lib/types";

export interface ForensicFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId?: string;
  materialId?: string;
  haulerId?: string;
  truckTypeId?: string;
  direction?: Direction;
}

const toParams = (f: ForensicFilters) => ({
  startDate: f.startDate,
  endDate: f.endDate,
  // Convert IDs from string to number (backend expects numbers)
  jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
  materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
  haulerId: f.haulerId && f.haulerId !== "all" ? Number(f.haulerId) : undefined,
  truckTypeId: f.truckTypeId && f.truckTypeId !== "all" ? Number(f.truckTypeId) : undefined,
  direction: f.direction === "Both" ? undefined : f.direction,
  // Convert companyId string to number (backend expects number)
  companyId: f.companyId ? Number(f.companyId) : undefined,
});

export interface LateSubmissionData {
  lateTicketsFound: number;
  items: LateSubmissionRow[];
}

/** GET /forensic/late-submission – returns { lateTicketsFound, items }. */
export async function getLateSubmissions(
  filters: ForensicFilters
): Promise<LateSubmissionData> {
  const data = await get<ApiLateSubmissionResponse>(
    "/forensic/late-submission",
    toParams(filters)
  );
  return {
    lateTicketsFound: data.lateTicketsFound,
    items: data.items.map((r) => ({
      ticketNumber: r.ticketNumber,
      ticketDate: r.ticketDate,
      systemEntryDate: r.systemEntryDate,
      lagTime: r.lagTime,
      signedBy: r.signedBy,
      jobName: r.jobName,
      haulerCompanyName: r.haulerCompanyName,
    })),
  };
}

/** GET /forensic/efficiency-outlier – backend returns full shape (status, statusLabel, etc.). */
export async function getEfficiencyOutliers(
  filters: ForensicFilters
): Promise<EfficiencyOutlierRow[]> {
  const rows = await get<ApiEfficiencyOutlierRow[]>(
    "/forensic/efficiency-outlier",
    toParams(filters)
  );
  return rows.map((r) => ({
    date: r.date,
    jobName: r.jobName,
    route: r.route,
    truckNumber: r.truckNumber,
    haulerName: r.haulerName ?? "",
    totalTickets: r.totalTickets,
    workDuration: r.workDuration,
    myAvgCycle: r.myAvgCycle,
    fleetBenchmark: r.fleetBenchmark,
    status: r.status,
    statusLabel: r.statusLabel ?? (r.status === "RED" ? "SLOW (>15%)" : r.status === "Single Load" ? "Single Load" : "Within 15%"),
  }));
}

export interface ForensicPageQuery {
  page: number;
  pageSize: number;
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
}

/** One page of rows plus how many there are in all. */
export interface ForensicPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const pageParams = (q: ForensicPageQuery) => ({
  page: q.page,
  pageSize: q.pageSize,
  sortBy: q.sortBy || undefined,
  sortDir: q.sortBy ? q.sortDir : undefined,
});

/** Paged late submission audit (server-side sort / paging). An older backend returns every row (no `total`). */
export async function getLateSubmissionsPage(
  filters: ForensicFilters,
  q: ForensicPageQuery
): Promise<ForensicPage<LateSubmissionRow> & { lateTicketsFound: number; paged: boolean }> {
  const data = await get<ApiLateSubmissionResponse & { total?: number; page?: number; pageSize?: number }>(
    "/forensic/late-submission",
    { ...toParams(filters), ...pageParams(q) }
  );
  const items = data.items.map((r) => ({
    ticketNumber: r.ticketNumber,
    ticketDate: r.ticketDate,
    systemEntryDate: r.systemEntryDate,
    lagTime: r.lagTime,
    signedBy: r.signedBy,
    jobName: r.jobName,
    haulerCompanyName: r.haulerCompanyName,
  }));
  return {
    lateTicketsFound: data.lateTicketsFound,
    items,
    total: data.total ?? items.length,
    page: data.page ?? q.page,
    pageSize: data.pageSize ?? q.pageSize,
    paged: data.total != null,
  };
}

/** Paged efficiency outliers (server-side sort / paging). An older backend returns every row as an array. */
export async function getEfficiencyOutliersPage(
  filters: ForensicFilters,
  q: ForensicPageQuery
): Promise<ForensicPage<EfficiencyOutlierRow> & { paged: boolean }> {
  const data = await get<ApiEfficiencyOutlierRow[] | (ForensicPage<ApiEfficiencyOutlierRow>)>(
    "/forensic/efficiency-outlier",
    { ...toParams(filters), ...pageParams(q) }
  );
  const raw = Array.isArray(data) ? data : data.items;
  const items = raw.map((r) => ({
    date: r.date,
    jobName: r.jobName,
    route: r.route,
    truckNumber: r.truckNumber,
    haulerName: r.haulerName ?? "",
    totalTickets: r.totalTickets,
    workDuration: r.workDuration,
    myAvgCycle: r.myAvgCycle,
    fleetBenchmark: r.fleetBenchmark,
    status: r.status,
    statusLabel: r.statusLabel ?? (r.status === "RED" ? "SLOW (>15%)" : r.status === "Single Load" ? "Single Load" : "Within 15%"),
  }));
  return Array.isArray(data)
    ? { items, total: items.length, page: q.page, pageSize: q.pageSize, paged: false }
    : { items, total: data.total, page: data.page, pageSize: data.pageSize, paged: true };
}
