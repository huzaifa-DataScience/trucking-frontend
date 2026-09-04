import { get, getBlob } from "../client";
import type {
  MaterialKpis,
  SitesSummaryRow,
  JobsSummaryRow,
  PagedResult,
  ApiTicketRow,
  ApiTicketDetail,
} from "../types";
import type { Direction } from "@/lib/types";

export interface MaterialDashboardFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  materialId?: string;
  jobId?: string;
  direction?: Direction;
  /** Our internal company (Ref_OurEntities). */
  entityId?: string;
}

export interface TicketListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  search?: string;
}

const toParams = (f: MaterialDashboardFilters, opts?: TicketListOptions) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert IDs from string to number (backend expects numbers)
    materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
    jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
    direction: f.direction === "Both" ? undefined : f.direction,
    // Our internal company filter (Ref_OurEntities)
    entityId: f.entityId ? Number(f.entityId) : undefined,
  };
  if (opts?.page != null) p.page = opts.page;
  if (opts?.pageSize != null) p.pageSize = opts.pageSize;
  if (opts?.sortBy) p.sortBy = opts.sortBy;
  if (opts?.sortDir) p.sortDir = opts.sortDir;
  if (opts?.search) p.search = opts.search;
  return p;
};

export async function getMaterialKpis(filters: MaterialDashboardFilters): Promise<MaterialKpis> {
  return get<MaterialKpis>("/material-dashboard/kpis", toParams(filters));
}

export async function getMaterialSitesSummary(filters: MaterialDashboardFilters): Promise<SitesSummaryRow[]> {
  return get<SitesSummaryRow[]>("/material-dashboard/summary/sites", toParams(filters));
}

export async function getMaterialJobsSummary(filters: MaterialDashboardFilters): Promise<JobsSummaryRow[]> {
  return get<JobsSummaryRow[]>("/material-dashboard/summary/jobs", toParams(filters));
}

export async function getMaterialTickets(
  filters: MaterialDashboardFilters,
  opts: TicketListOptions = {}
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/material-dashboard/tickets", toParams(filters, opts));
}

export async function getMaterialTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/material-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  return get<ApiTicketDetail | null>(path);
}

export async function getMaterialTicketsExportBlob(filters: MaterialDashboardFilters): Promise<Blob> {
  return getBlob("/material-dashboard/tickets/export", toParams(filters));
}
