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
}

const toParams = (f: MaterialDashboardFilters, page?: number, pageSize?: number) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert IDs from string to number (backend expects numbers)
    materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
    jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
    direction: f.direction === "Both" ? undefined : f.direction,
    // Convert companyId string to number (backend expects number)
    companyId: f.companyId ? Number(f.companyId) : undefined,
  };
  if (page != null) p.page = page;
  if (pageSize != null) p.pageSize = pageSize;
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
  page = 1,
  pageSize = 50
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/material-dashboard/tickets", toParams(filters, page, pageSize));
}

export async function getMaterialTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/material-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  return get<ApiTicketDetail | null>(path);
}

export async function getMaterialTicketsExportBlob(filters: MaterialDashboardFilters): Promise<Blob> {
  return getBlob("/material-dashboard/tickets/export", toParams(filters));
}
