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
  startDate: string;
  endDate: string;
  jobId?: string;
  direction?: Direction;
  /** Our internal company (Ref_OurEntities). */
  entityId?: string;
}

const toParams = (f: JobDashboardFilters, page?: number, pageSize?: number) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert jobId string to number if it's not "all" (backend expects number)
    jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
    direction: f.direction === "Both" ? undefined : f.direction,
    // Our internal company filter (Ref_OurEntities)
    entityId: f.entityId ? Number(f.entityId) : undefined,
  };
  if (page != null) p.page = page;
  if (pageSize != null) p.pageSize = pageSize;
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
  page = 1,
  pageSize = 50
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/job-dashboard/tickets", toParams(filters, page, pageSize));
}

export async function getJobTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/job-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  const data = await get<ApiTicketDetail | null>(path);
  return data;
}

export async function getJobTicketsExportBlob(filters: JobDashboardFilters): Promise<Blob> {
  return getBlob("/job-dashboard/tickets/export", toParams(filters));
}
