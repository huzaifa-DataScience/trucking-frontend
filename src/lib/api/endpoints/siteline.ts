/**
 * Siteline Billing API – construction billing (FRONTEND_SITELINE.md).
 * Frontend uses ONLY the REST endpoints exposed by our backend (no direct GraphQL).
 */

import { get, getPublic } from "../client";

// --- Core types (aligned with FRONTEND_SITELINE.md) ---

export interface SitelineStatus {
  configured: boolean;
  message: string;
}

export interface SitelineError {
  error?: string;
  configured?: false;
  message?: string;
}

export interface SitelineLocation {
  id: string;
  nickname?: string;
  street1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timeZone?: string;
}

export interface SitelineCompany {
  id: string;
  name: string;
  phoneNumber?: string;
  locations?: SitelineLocation[];
}

export interface SitelineProject {
  id: string;
  name: string;
  projectNumber?: string;
  location?: unknown;
}

export interface SitelineSovLineItem {
  id: string;
  sortOrder?: number;
  code?: string;
  name?: string;
  originalTotalValue?: number;
  latestTotalValue?: number;
  totalBilled?: number;
  progressComplete?: number;
}

export interface SitelineSov {
  id?: string;
  totalValue?: number;
  totalBilled?: number;
  totalRetention?: number;
  progressComplete?: number;
  contractNumber?: string;
  contractDate?: string;
  lineItems?: SitelineSovLineItem[];
}

export interface SitelinePayAppProgressRow {
  id: string;
  progressBilled?: number;
  storedMaterialBilled?: number;
  totalValue?: number;
  sovLineItem?: {
    id: string;
    code?: string;
    name?: string;
  };
}

export interface SitelinePayApp {
  id: string;
  payAppNumber?: number;
  billingType?: string;
  billingStart?: string;
  billingEnd?: string;
  payAppDueDate?: string;
  status?: string;
  currentBilled?: number;
  currentRetention?: number;
  totalRetention?: number;
  totalValue?: number;
  balanceToFinish?: number;
  previousRetentionBilled?: number;
  retentionOnly?: boolean;
  timeZone?: string;
  updatedAt?: string;
  contract?: {
    id: string;
    internalProjectNumber?: string;
    project?: SitelineProject;
  };
  g702Values?: Record<string, unknown>;
  progress?: SitelinePayAppProgressRow[];
}

export interface SitelineContract {
  id: string;
  billingType: string;
  status: string;
  internalProjectNumber?: string;
  percentComplete?: number;
  project?: SitelineProject;
  sov?: SitelineSov;
  payApps?: SitelinePayApp[];
  changeOrderRequests?: Array<{
    id: string;
    name?: string;
    internalNumber?: string;
    amount?: number;
  }>;
}

export interface SitelinePaginatedContractRow {
  id: string;
  internalProjectNumber?: string;
  billingType?: string;
  percentComplete?: number;
  project?: {
    projectNumber?: string;
  };
  payApps?: Array<{
    id: string;
    status?: string;
    billingStart?: string;
    billingEnd?: string;
    timeZone?: string;
    updatedAt?: string;
  }>;
}

export interface SitelinePaginatedContractsResponse {
  cursor: string | null;
  hasNext: boolean;
  contracts: SitelinePaginatedContractRow[];
}

export interface SitelinePaginatedPayAppRow {
  id: string;
  payAppNumber?: number;
  billingType?: string;
  status?: string;
  updatedAt?: string;
  contract?: {
    id: string;
    internalProjectNumber?: string;
    project?: {
      projectNumber?: string;
    };
  };
}

export interface SitelinePaginatedPayAppsResponse {
  totalCount: number;
  cursor: string | null;
  hasNext: boolean;
  payApps: SitelinePaginatedPayAppRow[];
}

// --- API calls ---

/** Check if Siteline is configured (public, no token – per FRONTEND_SITELINE.md). */
export async function getSitelineStatus(): Promise<SitelineStatus | SitelineError> {
  return getPublic<SitelineStatus | SitelineError>("siteline/status");
}

/** Current company (name, locations). */
export async function getSitelineCompany(): Promise<SitelineCompany | SitelineError> {
  return get<SitelineCompany | SitelineError>("siteline/company");
}

/** Legacy list contracts endpoint (mostly empty list + message, see FRONTEND_SITELINE.md). */
export async function getSitelineContracts(): Promise<SitelineContract[] | SitelineError> {
  return get<SitelineContract[] | SitelineError>("siteline/contracts");
}

export interface SitelinePaginatedContractsParams {
  month?: string;
  payAppStatus?: string;
  contractStatus?: string;
  limit?: number;
  cursor?: string;
}

/** Paginated contracts for the main billing grid. */
export async function getSitelinePaginatedContracts(
  params: SitelinePaginatedContractsParams
): Promise<SitelinePaginatedContractsResponse | SitelineError> {
  const query = {
    month: params.month,
    payAppStatus: params.payAppStatus,
    contractStatus: params.contractStatus,
    limit: params.limit,
    cursor: params.cursor,
  };
  return get<SitelinePaginatedContractsResponse | SitelineError>("siteline/contracts/paginated", query);
}

export interface SitelinePaginatedPayAppsParams {
  submittedInMonth?: string;
  limit?: number;
  cursor?: string;
}

/** Paginated pay apps for "pay apps by month" grid. */
export async function getSitelinePaginatedPayApps(
  params: SitelinePaginatedPayAppsParams
): Promise<SitelinePaginatedPayAppsResponse | SitelineError> {
  const query = {
    submittedInMonth: params.submittedInMonth,
    limit: params.limit,
    cursor: params.cursor,
  };
  return get<SitelinePaginatedPayAppsResponse | SitelineError>("siteline/pay-apps/paginated", query);
}

/** Single contract by id, with full SOV line items, pay apps list, and change orders. */
export async function getSitelineContract(
  id: string
): Promise<SitelineContract | null | SitelineError> {
  return get<SitelineContract | null | SitelineError>(`siteline/contracts/${encodeURIComponent(id)}`);
}

/** Single pay app by id, with G702 summary and progress rows. */
export async function getSitelinePayApp(
  id: string
): Promise<SitelinePayApp | null | SitelineError> {
  return get<SitelinePayApp | null | SitelineError>(`siteline/pay-apps/${encodeURIComponent(id)}`);
}

// --- Aging report (FRONTEND_AGING_REPORT.md) ---

export const AGING_BUCKETS = [
  "Current",
  "1-30 Days",
  "31-60 Days",
  "61-90 Days",
  "91-120 Days",
  ">120 Days",
] as const;

export type AgingBucket = (typeof AGING_BUCKETS)[number];

export interface AgingReportRow {
  projectName: string;
  buckets: Record<string, number>;
  projectTotal: number;
}

export interface AgingReportTotals extends Record<string, number> {
  projectTotal: number;
}

export interface AgingReportResponse {
  buckets: readonly string[];
  rows: AgingReportRow[];
  totals: AgingReportTotals;
}

/** A/R aging report: net dollars per project in days-past-due buckets. */
export async function getSitelineAgingReport(): Promise<
  AgingReportResponse | SitelineError
> {
  return get<AgingReportResponse | SitelineError>("siteline/aging-report");
}

