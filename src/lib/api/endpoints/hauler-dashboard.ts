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

const toParams = (f: HaulerDashboardFilters, opts?: TicketListOptions) => {
  const p: Record<string, string | number | undefined> = {
    startDate: f.startDate,
    endDate: f.endDate,
    // Convert IDs from string to number (backend expects numbers)
    haulerId: f.haulerId && f.haulerId !== "all" ? Number(f.haulerId) : undefined,
    jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
    materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
    truckTypeId: f.truckTypeId && f.truckTypeId !== "all" ? Number(f.truckTypeId) : undefined,
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
  opts: TicketListOptions = {}
): Promise<PagedResult<ApiTicketRow>> {
  return get<PagedResult<ApiTicketRow>>("/hauler-dashboard/tickets", toParams(filters, opts));
}

export async function getHaulerTicketDetail(ticketNumber: string): Promise<ApiTicketDetail | null> {
  const path = `/hauler-dashboard/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  return get<ApiTicketDetail | null>(path);
}

export async function getHaulerTicketsExportBlob(filters: HaulerDashboardFilters): Promise<Blob> {
  return getBlob("/hauler-dashboard/tickets/export", toParams(filters));
}
