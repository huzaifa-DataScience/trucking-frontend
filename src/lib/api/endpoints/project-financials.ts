import { get } from "@/lib/api/client";
import type {
  FinancialsFilters,
  FinancialsPageQuery,
  FinancialsQuery,
  JobsResponse,
  JobRow,
  SummaryResponse,
} from "@/lib/project-financials/types";

function queryParams(query: FinancialsQuery): Record<string, string | number | undefined> {
  return {
    entityId: query.entityId,
    pm: query.pm,
    search: query.search,
    view: query.view,
    alert: query.alert,
  };
}

export function getProjectFinancialsFilters(): Promise<FinancialsFilters> {
  return get<FinancialsFilters>("/project-financials/filters");
}

export function getProjectFinancialsSummary(query: FinancialsQuery): Promise<SummaryResponse> {
  return get<SummaryResponse>("/project-financials/summary", queryParams(query));
}

function pageParams(paging?: FinancialsPageQuery): Record<string, string | number | undefined> {
  if (!paging) return {};
  return {
    page: paging.page,
    pageSize: paging.pageSize,
    sortBy: paging.sortBy || undefined,
    sortDir: paging.sortBy ? paging.sortDir : undefined,
  };
}

/** With `paging`: one page, sorted on the server (an older backend ignores it and sends every job). */
export function getProjectFinancialsJobs(query: FinancialsQuery, paging?: FinancialsPageQuery): Promise<JobsResponse> {
  return get<JobsResponse>("/project-financials/jobs", { ...queryParams(query), ...pageParams(paging) });
}

/** Same payload as `/jobs` — paint `job.bom`. */
export function getProjectFinancialsBom(query: FinancialsQuery, paging?: FinancialsPageQuery): Promise<JobsResponse> {
  return get<JobsResponse>("/project-financials/bom", { ...queryParams(query), ...pageParams(paging) });
}

export function getProjectFinancialsJob(jobNumber: string): Promise<JobRow> {
  return get<JobRow>(`/project-financials/jobs/${encodeURIComponent(jobNumber)}`);
}
