import { del, get, patch, post } from "@/lib/api/client";
import type {
  CostReportResponse,
  DisposalRateCard,
  DisposalRatesPage,
  DisposalRateWriteBody,
  HaulerRateCard,
  HaulerRateWriteBody,
  HaulsPage,
  HaulsQuery,
  HaulWriteBody,
  LeedReportRow,
  OperationsHaul,
  HaulerRatesPage,
  ReportDateQuery,
} from "@/lib/operations/types";

function haulParams(q: HaulsQuery): Record<string, string | number | undefined> {
  return {
    from: q.from,
    to: q.to,
    jobNumber: q.jobNumber?.trim() || undefined,
    haulerRateId: q.haulerRateId,
    disposalRateId: q.disposalRateId,
  };
}

function dateParams(q: ReportDateQuery): Record<string, string | number | undefined> {
  return { from: q.from, to: q.to };
}

export function listHauls(query: HaulsQuery = {}): Promise<OperationsHaul[]> {
  return get<OperationsHaul[]>("/operations/hauls", haulParams(query));
}

/** Paged hauler rate cards for the Hauler rates page (dropdowns keep using listHaulerRates). */
export function listHaulerRatesPage(q: {
  page: number;
  pageSize: number;
  search?: string;
  company?: string;
  status: "active" | "inactive" | "all";
}): Promise<HaulerRatesPage | HaulerRateCard[]> {
  return get<HaulerRatesPage | HaulerRateCard[]>("/operations/hauler-rates", {
    page: q.page,
    pageSize: q.pageSize,
    search: q.search?.trim() || undefined,
    company: q.company || undefined,
    status: q.status,
  });
}

/** Paged haul log (server-side paging, search and totals). */
export function listHaulsPage(
  query: HaulsQuery & { page: number; pageSize: number; search?: string }
): Promise<HaulsPage | OperationsHaul[]> {
  return get<HaulsPage | OperationsHaul[]>("/operations/hauls", {
    ...haulParams(query),
    page: query.page,
    pageSize: query.pageSize,
    search: query.search?.trim() || undefined,
  });
}

export function getHaul(id: number): Promise<OperationsHaul> {
  return get<OperationsHaul>(`/operations/hauls/${id}`);
}

export function createHaul(body: HaulWriteBody): Promise<OperationsHaul> {
  return post<OperationsHaul>("/operations/hauls", body);
}

export function updateHaul(id: number, body: Partial<HaulWriteBody>): Promise<OperationsHaul> {
  return patch<OperationsHaul>(`/operations/hauls/${id}`, body);
}

export function deleteHaul(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/operations/hauls/${id}`);
}

export function listHaulerRates(): Promise<HaulerRateCard[]> {
  return get<HaulerRateCard[]>("/operations/hauler-rates");
}

export function createHaulerRate(body: HaulerRateWriteBody): Promise<HaulerRateCard> {
  return post<HaulerRateCard>("/operations/hauler-rates", body);
}

export function updateHaulerRate(
  id: number,
  body: Partial<HaulerRateWriteBody>
): Promise<HaulerRateCard> {
  return patch<HaulerRateCard>(`/operations/hauler-rates/${id}`, body);
}

export function listDisposalRates(): Promise<DisposalRateCard[]> {
  return get<DisposalRateCard[]>("/operations/disposal-rates");
}

/** Paged disposal rate cards (server-side filters, sorting and paging); an older backend returns the full list. */
export function listDisposalRatesPage(q: {
  page: number;
  pageSize: number;
  search?: string;
  company?: string;
  type?: string;
  status: "active" | "inactive" | "all";
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
}): Promise<DisposalRatesPage | DisposalRateCard[]> {
  return get<DisposalRatesPage | DisposalRateCard[]>("/operations/disposal-rates", {
    page: q.page,
    pageSize: q.pageSize,
    search: q.search?.trim() || undefined,
    company: q.company || undefined,
    type: q.type && q.type !== "all" ? q.type : undefined,
    status: q.status,
    sortBy: q.sortBy || undefined,
    sortDir: q.sortBy ? q.sortDir : undefined,
  });
}

export function createDisposalRate(body: DisposalRateWriteBody): Promise<DisposalRateCard> {
  return post<DisposalRateCard>("/operations/disposal-rates", body);
}

export function updateDisposalRate(
  id: number,
  body: Partial<DisposalRateWriteBody>
): Promise<DisposalRateCard> {
  return patch<DisposalRateCard>(`/operations/disposal-rates/${id}`, body);
}

export function reportByJobs(query: ReportDateQuery = {}): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/jobs", dateParams(query));
}

/** Cost by job, one page (server-side sort); totals still cover every job. An older backend returns every job. */
export function reportByJobsPage(
  query: ReportDateQuery & { page: number; pageSize: number; sortBy: string; sortDir: "asc" | "desc" }
): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/jobs", {
    ...dateParams(query),
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
}

export function reportByHaulers(query: ReportDateQuery = {}): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/haulers", dateParams(query));
}

export function reportByDestinations(query: ReportDateQuery = {}): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/destinations", dateParams(query));
}

export function reportLeed(query: ReportDateQuery = {}): Promise<LeedReportRow[]> {
  return get<LeedReportRow[]>("/operations/reports/leed", dateParams(query));
}
