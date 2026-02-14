import { get, getBlob } from "../client";
import type {
  HaulerKpis,
  BillableUnitsRow,
  CostCenterRow,
  PagedResult,
  ApiTicketRow,
  ApiTicketDetail,
} from "../types";
import type { Direction } from "@/lib/types";

export interface HaulerDashboardFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  haulerId?: string;
  jobId?: string;
  materialId?: string;
  truckTypeId?: string;
  direction?: Direction;
}

const toParams = (f: HaulerDashboardFilters, page?: number, pageSize?: number) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert IDs from string to number (backend expects numbers)
    haulerId: f.haulerId && f.haulerId !== "all" ? Number(f.haulerId) : undefined,
    jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
    materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
    truckTypeId: f.truckTypeId && f.truckTypeId !== "all" ? Number(f.truckTypeId) : undefined,
    direction: f.direction === "Both" ? undefined : f.direction,
    // Convert companyId string to number (backend expects number)
    companyId: f.companyId ? Number(f.companyId) : undefined,
  };
  if (page != null) p.page = page;
  if (pageSize != null) p.pageSize = pageSize;
  return p;
};

export async function getHaulerKpis(filters: HaulerDashboardFilters): Promise<HaulerKpis> {
  return get<HaulerKpis>("/hauler-dashboard/kpis", toParams(filters));
}

export async function getHaulerBillableUnits(filters: HaulerDashboardFilters): Promise<BillableUnitsRow[]> {
  return get<BillableUnitsRow[]>("/hauler-dashboard/summary/billable-units", toParams(filters));
}

export async function getHaulerCostCenter(filters: HaulerDashboardFilters): Promise<CostCenterRow[]> {
  return get<CostCenterRow[]>("/hauler-dashboard/summary/cost-center", toParams(filters));
}

export async function getHaulerTickets(
  filters: HaulerDashboardFilters,
  page = 1,
  pageSize = 50
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/hauler-dashboard/tickets", toParams(filters, page, pageSize));
}

export async function getHaulerTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/hauler-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  return get<ApiTicketDetail | null>(path);
}

export async function getHaulerTicketsExportBlob(filters: HaulerDashboardFilters): Promise<Blob> {
  return getBlob("/hauler-dashboard/tickets/export", toParams(filters));
}
