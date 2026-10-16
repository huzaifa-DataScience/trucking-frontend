import { del, get, patch, post } from "@/lib/api/client";
import type {
  CostReportResponse,
  DisposalRateCard,
  DisposalRateWriteBody,
  HaulerRateCard,
  HaulerRateWriteBody,
  HaulsQuery,
  HaulWriteBody,
  LeedReportRow,
  OperationsHaul,
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

export function reportByHaulers(query: ReportDateQuery = {}): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/haulers", dateParams(query));
}

export function reportByDestinations(query: ReportDateQuery = {}): Promise<CostReportResponse> {
  return get<CostReportResponse>("/operations/reports/destinations", dateParams(query));
}

export function reportLeed(query: ReportDateQuery = {}): Promise<LeedReportRow[]> {
  return get<LeedReportRow[]>("/operations/reports/leed", dateParams(query));
}
