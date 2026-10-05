import { get } from "@/lib/api/client";
import type {
  FinancialsFilters,
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

export function getProjectFinancialsJobs(query: FinancialsQuery): Promise<JobsResponse> {
  return get<JobsResponse>("/project-financials/jobs", queryParams(query));
}

export function getProjectFinancialsJob(jobNumber: string): Promise<JobRow> {
  return get<JobRow>(`/project-financials/jobs/${encodeURIComponent(jobNumber)}`);
}
