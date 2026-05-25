/**
 * Clearstory mirror API — construction change orders (frontend-clearstory-api.md).
 */

import { get, post } from "../client";

/** Normalize API money fields that may arrive as number or string (decimal serialization). */
export function normalizeMoney(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function formatUsdWhole(value: number | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsdDetailed(value: number | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export interface ClearstoryProjectRowAllColumns {
  id: number;
  jobNumber: string | null;
  customerJobNumber: string | null;
  name: string | null;
  customerName: string | null;
  customerId: number | null;
  officeId: number | null;
  officeName: string | null;
  companyId: number | null;
  originType: string | null;
  archived: boolean | null;
  siteProjectAddress: string | null;
  siteStreetAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  siteZipCode: string | null;
  siteCountry: string | null;
  baseContractValue: number | string | null;
  updatedAt: string | null;
  createdAt: string | null;
  // Allow backend to add more mirror fields without breaking the UI.
  [k: string]: unknown;
}

export type ClearstoryProjectsResponse =
  | { projects: ClearstoryProjectRowAllColumns[] }
  | { page: number; pageSize: number; total: number; projects: ClearstoryProjectRowAllColumns[] };

export interface ClearstoryProjectDetail {
  id: string;
  jobNumber?: string;
  name?: string;
  office?: string;
  region?: string;
  division?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  baseContractValue?: number | string;
}

export interface ClearstorySummaryTotals {
  approved?: number | string;
  atp?: number | string;
  inReview?: number | string;
  placeholder?: number | string;
  void?: number | string;
}

export interface ClearstoryProjectSummaryResponse {
  project: ClearstoryProjectDetail;
  totals: ClearstorySummaryTotals;
  revisedContractValue?: number | string;
  reconciliation?: unknown;
}

export type ClearstoryCorBucket =
  | "APPROVED"
  | "ATP"
  | "IN_REVIEW"
  | "PLACEHOLDER"
  | "VOID";

export interface ClearstoryCorItem {
  id: string;
  numericId?: number;
  uuid?: string;
  projectId?: string;
  jobNumber?: string;
  corNumber?: string;
  issueNumber?: string;
  type?: string;
  status?: string;
  stage?: string;
  statusBucket?: string;
  ballInCourt?: string;
  version?: string;
  requestedAmount?: number | string;
  totalAmount?: number | string;
  voidAmount?: number | string;
  voidDate?: string;
  approvedOrVoidDate?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ClearstoryCorsResponse {
  projectId: string;
  items: ClearstoryCorItem[];
}

export interface ClearstorySyncResponse {
  ok: boolean;
  message?: string;
}

/** `GET /clearstory/status` — see frontend-clearstory-api.md. */
export interface ClearstoryStatusResponse {
  module?: string;
  ready?: boolean;
  syncRunning?: boolean;
  lastSuccessfulRunAt?: string | null;
  message?: string;
  /** Legacy field; prefer `ready` when both exist. */
  ok?: boolean;
}

export async function getClearstoryProjects(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
  allColumns?: boolean;
  full?: boolean;
}): Promise<ClearstoryProjectsResponse> {
  return get<ClearstoryProjectsResponse>("clearstory/projects", {
    search: params?.search?.trim() || undefined,
    page: params?.page,
    pageSize: params?.pageSize,
    allColumns: params?.allColumns ? "true" : undefined,
    full: params?.full ? "true" : undefined,
  });
}

export async function getClearstoryProjectSummary(
  projectId: string
): Promise<ClearstoryProjectSummaryResponse> {
  return get<ClearstoryProjectSummaryResponse>(
    `clearstory/projects/${encodeURIComponent(projectId)}/summary`
  );
}

export async function getClearstoryProjectCors(
  projectId: string,
  filters?: {
    bucket?: ClearstoryCorBucket;
    status?: string;
    stage?: string;
  }
): Promise<ClearstoryCorsResponse> {
  return get<ClearstoryCorsResponse>(
    `clearstory/projects/${encodeURIComponent(projectId)}/cors`,
    {
      bucket: filters?.bucket,
      status: filters?.status?.trim() || undefined,
      stage: filters?.stage?.trim() || undefined,
    }
  );
}

export async function postClearstorySync(): Promise<ClearstorySyncResponse> {
  return post<ClearstorySyncResponse>("clearstory/sync", {});
}

export async function getClearstoryStatus(): Promise<ClearstoryStatusResponse> {
  return get<ClearstoryStatusResponse>("clearstory/status");
}

export interface ClearstoryApiPayloadResponse {
  resourceType: string;
  resourceKey: string;
  lastFetchedAt?: string;
  payload: unknown;
}

/** Full Clearstory JSON for one synced resource (Swagger-shaped). See frontend-clearstory-api.md. */
export async function getClearstoryApiPayload(params: {
  type: string;
  key?: string;
  cnId?: string;
  contractId?: string;
  projectId?: string;
  rateType?: string;
  recordId?: string;
}): Promise<ClearstoryApiPayloadResponse> {
  return get<ClearstoryApiPayloadResponse>("clearstory/api-payload", {
    type: params.type,
    key: params.key,
    cnId: params.cnId,
    contractId: params.contractId,
    projectId: params.projectId,
    rateType: params.rateType,
    recordId: params.recordId,
  });
}

// --- Table modules (frontend-clearstory-tables-draft.md + Nest ClearstoryTableService) ---
//
// Backend confirmation (envelope only — no snake_case; Nest serializes DTOs as-is):
// - `swagger`: always present per row as `null` or a plain object (never omitted). Invalid/missing payload → null + payloadMissing: true.
// - `typedMirror`: always a plain object, camelCase keys from entities; never omitted.
// - Pagination field is `total` (not totalCount).
// - `projectId` (cors/tags): missing or not a finite integer → no filter (full list), not 400.
// - Keys *inside* `swagger` mirror Clearstory’s API (often camelCase; not guaranteed by our mirror).
//
// Sample — GET /clearstory/tables/cors?page=1&pageSize=2:
// {
//   "module": "cors",
//   "page": 1,
//   "pageSize": 2,
//   "total": 42,
//   "rows": [{
//     "resourceKey": "12345",
//     "swagger": { "id": 12345, "status": "in_review" },
//     "lastFetchedAt": "2026-04-10T12:00:00.000Z",
//     "lastSyncedAt": "2026-04-10T12:00:00.000Z",
//     "typedMirror": { "id": "12345", "projectId": 7, "status": "in_review", "lastSyncedAt": "..." },
//     "payloadMissing": false
//   }]
// }
// Sample — GET /clearstory/tables/company (nothing synced):
// { "module": "company", "row": null }

/** Path segment for `GET /clearstory/tables/:module` and list response `module` field. */
export type ClearstoryTableModuleName = "cors" | "tags" | "customers" | "contracts";

export interface ClearstoryTableRow {
  resourceKey: string;
  /** Clearstory snapshot; always `null` or object in JSON (never undefined). */
  swagger: Record<string, unknown> | null;
  /** ISO or null when unknown (key always present in JSON per Table grid API). */
  lastFetchedAt?: string | null;
  lastSyncedAt?: string | null;
  /** Mirror columns; always an object in JSON. Values may be string | number | … */
  typedMirror: Record<string, unknown>;
  payloadMissing: boolean;
}

export interface ClearstoryTablePageResponse {
  module: ClearstoryTableModuleName;
  page: number;
  pageSize: number;
  total: number;
  rows: ClearstoryTableRow[];
}

export interface ClearstoryCompanyTableResponse {
  module: "company";
  row: ClearstoryTableRow | null;
}

const TABLE_PAGE_SIZE_DEFAULT = 50;
const TABLE_PAGE_SIZE_MAX = 200;

function clampTablePageSize(n: number): number {
  if (!Number.isFinite(n) || n < 1) return TABLE_PAGE_SIZE_DEFAULT;
  return Math.min(TABLE_PAGE_SIZE_MAX, Math.max(1, Math.floor(n)));
}

/** Omitted when empty; backend ignores missing/non-finite integer `projectId` (no filter, not 400). */
export async function getClearstoryTablePage(
  module: ClearstoryTableModuleName,
  params: { page: number; pageSize: number; projectId?: string }
): Promise<ClearstoryTablePageResponse> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = clampTablePageSize(params.pageSize);
  return get<ClearstoryTablePageResponse>(`clearstory/tables/${module}`, {
    page,
    pageSize,
    projectId: params.projectId?.trim() || undefined,
  });
}

export async function getClearstoryCompanyTable(): Promise<ClearstoryCompanyTableResponse> {
  return get<ClearstoryCompanyTableResponse>("clearstory/tables/company");
}
