import { get, getBlob } from "../client";
import type {
  JobKpis,
  VendorSummaryRow,
  MaterialSummaryRow,
  PagedResult,
  ApiTicketRow,
  ApiTicketDetail,
} from "../types";
import type { Direction } from "@/lib/types";

export interface JobDashboardFilters {
  companyId?: string;
  /** Optional — omit for an unbounded date range (e.g. global search across all tickets). */
  startDate?: string;
  endDate?: string;
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

const toParams = (f: JobDashboardFilters, opts?: TicketListOptions) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert jobId string to number if it's not "all" (backend expects number)
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

export async function getJobKpis(filters: JobDashboardFilters): Promise<JobKpis> {
  return get<JobKpis>("/job-dashboard/kpis", toParams(filters));
}

export async function getJobVendorSummary(filters: JobDashboardFilters): Promise<VendorSummaryRow[]> {
  return get<VendorSummaryRow[]>("/job-dashboard/summary/vendor", toParams(filters));
}

export async function getJobMaterialSummary(filters: JobDashboardFilters): Promise<MaterialSummaryRow[]> {
  return get<MaterialSummaryRow[]>("/job-dashboard/summary/material", toParams(filters));
}

export async function getJobTickets(
  filters: JobDashboardFilters,
  opts: TicketListOptions = {}
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/job-dashboard/tickets", toParams(filters, opts));
}

export async function getJobTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/job-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  const data = await get<ApiTicketDetail | null>(path);
  return data;
}

export async function getJobTicketsExportBlob(filters: JobDashboardFilters): Promise<Blob> {
  return getBlob("/job-dashboard/tickets/export", toParams(filters));
}
