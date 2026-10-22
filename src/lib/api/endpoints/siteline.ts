/**
 * Siteline Billing API – construction billing (FRONTEND_SITELINE.md).
 * Frontend uses ONLY the REST endpoints exposed by our backend (no direct GraphQL).
 */

import { ApiError, get, getPublic } from "../client";

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
  /** Siteline contract id (cached Siteline aging path); links to the billing project page. */
  contractId?: string;
  /** Set by the Billing page when "All companies" combines several reports. */
  entityId?: number;
  projectName: string;
  /** Primary PM for this project, when available (FRONTEND_RECENT_CHANGES_MAR2026.md). */
  leadPmName?: string | null;
  leadPmEmail?: string | null;
  /** Invoice/Pay App number (max/latest seen for this project), when available. */
  invoiceNumber?: number | null;
  /**
   * Billing period start for the pay app tied to `invoiceNumber` (ISO 8601).
   * Optional for older API responses; treat missing as no value (frontend-siteline-invoice-date.md).
   */
  invoiceDate?: string | null;
  buckets: Record<AgingBucket, number>;
  projectTotal: number;
}

export interface AgingReportTotals extends Record<AgingBucket, number> {
  projectTotal: number;
}

export interface AgingReportResponse {
  /** When Siteline's aging snapshot behind this report was taken (ISO). */
  lastAgingBreakdownSync?: string | null;
  buckets: readonly string[];
  rows: AgingReportRow[];
  totals: AgingReportTotals;
}

export interface SitelineAgingFilters {
  /** Our entity id (Ref_OurEntities); required for per-company Siteline snapshots. */
  entityId?: number;
  search?: string;
  overdueOnly?: boolean;
  minDaysPastDue?: number;
  maxDaysPastDue?: number;
  minNetDollars?: number;
  maxNetDollars?: number;
  includeStatuses?: string; // comma-separated
  excludeStatuses?: string; // comma-separated
}

/** A/R aging report: net dollars per project in days-past-due buckets. */
export async function getSitelineAgingReport(
  filters?: SitelineAgingFilters
): Promise<
  AgingReportResponse | SitelineError
> {
  return get<AgingReportResponse | SitelineError>("siteline/aging-report", {
    entityId: filters?.entityId,
    search: filters?.search,
    overdueOnly: filters?.overdueOnly ? "true" : undefined,
    minDaysPastDue: filters?.minDaysPastDue,
    maxDaysPastDue: filters?.maxDaysPastDue,
    minNetDollars: filters?.minNetDollars,
    maxNetDollars: filters?.maxNetDollars,
    includeStatuses: filters?.includeStatuses,
    excludeStatuses: filters?.excludeStatuses,
  });
}

// --- Aging overdue list (frontend-siteline-api.md: minDaysPastDue, default 51) ---

export interface AgingOverdueItem {
  contractId: string;
  /** Set by the Billing page when "All companies" combines several lists. */
  entityId?: number;
  projectName: string | null;
  projectNumber: string | null;
  internalProjectNumber: string | null;
  companyId: string | null;
  leadPmName: string | null;
  leadPmEmail: string | null;
  /** Invoice/Pay App number from Siteline (payAppNumber). */
  invoiceNumber: number | null;
  /** Billing period start for this pay app (ISO 8601); backend should always send key (may be null). */
  invoiceDate?: string | null;
  dueDate: string | null;
  daysPastDue: number;
  netDollars: number;
  status: string | null;
}

export interface AgingOverdueResponse {
  items: AgingOverdueItem[];
}

/** Past-due pay apps with PM info. Query `minDaysPastDue` = inclusive floor (default 51 ≈ prior “> 50”). */
export async function getSitelineAgingOverdue(
  filters?: SitelineAgingFilters
): Promise<
  AgingOverdueResponse | SitelineError
> {
  return get<AgingOverdueResponse | SitelineError>("siteline/aging-overdue", {
    entityId: filters?.entityId,
    search: filters?.search,
    overdueOnly: filters?.overdueOnly ? "true" : undefined,
    minDaysPastDue: filters?.minDaysPastDue,
    maxDaysPastDue: filters?.maxDaysPastDue,
    minNetDollars: filters?.minNetDollars,
    maxNetDollars: filters?.maxNetDollars,
    includeStatuses: filters?.includeStatuses,
    excludeStatuses: filters?.excludeStatuses,
  });
}

// --- Siteline ↔ Clearstory reconciliation gaps (FRONTEND_SITELINE_PM_EMAILS.md) ---

export type SitelineReconciliationGapReason =
  | "NO_CLEARSTORY_PROJECT"
  | "CLEARSTORY_EMPTY"
  | "NOT_COMPARABLE";

export interface SitelineReconciliationGapItem {
  contractId: string;
  projectName: string | null;
  projectNumber: string | null;
  internalProjectNumber: string | null;
  leadPmName: string | null;
  leadPmEmail: string | null;
  netDollars: number;
  daysPastDue?: number | null;
  clearstoryProjectId: string | null;
  clearstoryJobNumber: string | null;
  matchKeyTried: string | null;
  gapReason: SitelineReconciliationGapReason;
}

export interface SitelineReconciliationGapsResponse {
  items: SitelineReconciliationGapItem[];
  evaluatedAt?: string;
}

/** Projects with Siteline billing data but no usable Clearstory comparison. */
export async function getSitelineReconciliationGaps(params?: {
  entityId?: number;
}): Promise<SitelineReconciliationGapsResponse | SitelineError> {
  return get<SitelineReconciliationGapsResponse | SitelineError>(
    "siteline/reconciliation/gaps",
    { entityId: params?.entityId }
  );
}

/** Billing project page: one Siteline contract, its pay apps, and the matching Clearstory project. Money in dollars. */
export interface SitelineProjectDetailPayApp {
  id: string;
  number: number | null;
  status: string | null;
  billed: number | null;
  retention: number | null;
  /** billed − retention: what the GC owes on this pay app. */
  amountDue: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
}

export interface SitelineProjectDetailCor {
  id: string;
  corNumber: string | null;
  title: string | null;
  status: string | null;
  requestedAmount: number | null;
  dateSubmitted: string | null;
  daysInReview: number | null;
}

export interface SitelineProjectDetail {
  contract: {
    id: string;
    entityId: number | null;
    projectName: string | null;
    internalProjectNumber: string | null;
    contractNumber: string | null;
    billingType: string | null;
    status: string | null;
    percentComplete: number | null;
    contractValue: number | null;
    leadPmName: string | null;
    leadPmEmail: string | null;
    lastSyncedAt: string | null;
  };
  averageDaysToPaid: number | null;
  payApps: SitelineProjectDetailPayApp[];
  clearstory: {
    projectId: number;
    name: string | null;
    customerName: string | null;
    baseContractValue: number | null;
    cors: SitelineProjectDetailCor[];
  } | null;
}

export async function getSitelineProjectDetail(contractId: string): Promise<SitelineProjectDetail> {
  return get<SitelineProjectDetail>(`siteline/projects/${encodeURIComponent(contractId)}`);
}

/** One of our companies (GOEL / GOEL DC / DCB) and the Siteline company it bills as. */
export interface SitelineEntityConfigRow {
  entityId: number;
  entityName: string | null;
  sitelineCompanyName: string | null;
}

export async function getSitelineEntityConfig(): Promise<SitelineEntityConfigRow[]> {
  return get<SitelineEntityConfigRow[]>("siteline/entity-config");
}

// --- Billing tables, paged on the server (A/R aging + Past due) ---

/** Page / sort for the Billing tables. `all` = every row (CSV export); `nav` = only id + name (project prev / next). */
export interface BillingPageQuery {
  entityIds: readonly number[];
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
  all?: boolean;
  nav?: boolean;
}

export interface AgingReportPage extends AgingReportResponse {
  /** Rows on this page (every row with `all`). */
  rows: AgingReportRow[];
  /** Rows matching the filters, all pages. */
  total: number;
  page: number;
  pageSize: number;
  summary: {
    /** Projects with an amount in each bucket (all pages). */
    bucketProjectCounts: Record<AgingBucket, number>;
    byCompany: { entityId: number; total: number; over90: number; contracts: number }[];
  };
}

export interface AgingOverduePage extends AgingOverdueResponse {
  total: number;
  page: number;
  pageSize: number;
  summary: {
    netTotal: number;
    count: number;
    /** Distinct company + contract pairs. */
    contracts: number;
    biggest: AgingOverdueItem | null;
    byCompany: { entityId: number; older: number; withOlder: number; biggest: AgingOverdueItem | null }[];
  };
}

function billingPageParams(filters: SitelineAgingFilters, q: BillingPageQuery) {
  return {
    entityIds: q.entityIds.join(","),
    search: filters.search,
    overdueOnly: filters.overdueOnly ? "true" : undefined,
    minDaysPastDue: filters.minDaysPastDue,
    maxDaysPastDue: filters.maxDaysPastDue,
    minNetDollars: filters.minNetDollars,
    maxNetDollars: filters.maxNetDollars,
    includeStatuses: filters.includeStatuses,
    excludeStatuses: filters.excludeStatuses,
    page: q.all ? undefined : q.page,
    pageSize: q.all ? undefined : q.pageSize,
    sortBy: q.sortBy || undefined,
    sortDir: q.sortBy ? q.sortDir : undefined,
    all: q.all ? "1" : undefined,
    fields: q.all && q.nav ? "nav" : undefined,
  };
}

/** A/R aging table: one page for one or more companies, plus totals / summary for every matching row. */
export async function getSitelineAgingReportPage(
  filters: SitelineAgingFilters,
  q: BillingPageQuery
): Promise<AgingReportPage | SitelineError> {
  try {
    return await get<AgingReportPage | SitelineError>("siteline/aging-report/page", billingPageParams(filters, q));
  } catch (e) {
    if (isMissingRoute(e)) return agingReportPageFallback(filters, q);
    throw e;
  }
}

/** Past due table: one page for one or more companies, plus a summary of every matching item. */
export async function getSitelineAgingOverduePage(
  filters: SitelineAgingFilters,
  q: BillingPageQuery
): Promise<AgingOverduePage | SitelineError> {
  try {
    return await get<AgingOverduePage | SitelineError>("siteline/aging-overdue/page", {
      ...billingPageParams(filters, q),
      minDaysPastDue: filters.minDaysPastDue ?? 51,
    });
  } catch (e) {
    if (isMissingRoute(e)) return agingOverduePageFallback(filters, q);
    throw e;
  }
}

// --- Fallback for a backend without the paged routes (404): the old per-company calls, merged, sorted
// and paged here with the same rules as the server, so the page works the same either way. ---

const isMissingRoute = (e: unknown) => e instanceof ApiError && e.status === 404;

/** Same order as the server / the old table sort: blanks last, numbers numerically, text with natural numbers. */
function compareBillingValues(a: unknown, b: unknown, dir: "asc" | "desc"): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mul;
}

function pageOfRows<T>(rows: T[], q: BillingPageQuery, valueOf: (row: T, key: string) => unknown) {
  const sorted = q.sortBy
    ? [...rows].sort((x, y) => compareBillingValues(valueOf(x, q.sortBy!), valueOf(y, q.sortBy!), q.sortDir ?? "asc"))
    : rows;
  if (q.all) return { rows: sorted, total: sorted.length, page: 1, pageSize: Math.max(sorted.length, 1) };
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(pages, Math.max(1, q.page ?? 1));
  return { rows: sorted.slice((page - 1) * pageSize, page * pageSize), total: sorted.length, page, pageSize };
}

async function agingReportPageFallback(
  filters: SitelineAgingFilters,
  q: BillingPageQuery
): Promise<AgingReportPage | SitelineError> {
  const parts = await Promise.all(
    q.entityIds.map((entityId) => getSitelineAgingReport({ ...filters, entityId }).then((r) => ({ entityId, r })))
  );
  const failed = parts.find((p) => "error" in p.r || (p.r as SitelineError).configured === false);
  if (failed) return failed.r as SitelineError;
  const reports = parts.map((p) => ({ entityId: p.entityId, report: p.r as AgingReportResponse }));
  const rows = reports.flatMap((p) => p.report.rows.map((r) => ({ ...r, entityId: p.entityId })));
  const totals = { ...reports[0].report.totals };
  for (const key of Object.keys(totals) as (keyof AgingReportTotals)[]) {
    totals[key] = reports.reduce((sum, p) => sum + (Number(p.report.totals[key]) || 0), 0);
  }
  const bucketProjectCounts = Object.fromEntries(
    AGING_BUCKETS.map((b) => [b, rows.filter((r) => (r.buckets[b] ?? 0) > 0).length])
  ) as Record<AgingBucket, number>;
  const byCompany = q.entityIds.map((entityId) => {
    const mine = rows.filter((r) => r.entityId === entityId);
    return {
      entityId,
      total: mine.reduce((s, r) => s + (r.projectTotal || 0), 0),
      over90: mine.reduce((s, r) => s + (r.buckets["91-120 Days"] ?? 0) + (r.buckets[">120 Days"] ?? 0), 0),
      contracts: mine.length,
    };
  });
  const paged = pageOfRows(rows, q, (r, key) =>
    key.startsWith("bucket:") ? r.buckets[key.slice(7) as AgingBucket] : (r as unknown as Record<string, unknown>)[key]
  );
  return {
    ...reports[0].report,
    ...paged,
    rows: q.all && q.nav ? paged.rows.map((r) => ({ contractId: r.contractId, projectName: r.projectName }) as AgingReportRow) : paged.rows,
    totals,
    summary: { bucketProjectCounts, byCompany },
  };
}

async function agingOverduePageFallback(
  filters: SitelineAgingFilters,
  q: BillingPageQuery
): Promise<AgingOverduePage | SitelineError> {
  const parts = await Promise.all(
    q.entityIds.map((entityId) =>
      getSitelineAgingOverdue({ ...filters, entityId, minDaysPastDue: filters.minDaysPastDue ?? 51 }).then((r) => ({ entityId, r }))
    )
  );
  const failed = parts.find((p) => "error" in p.r || (p.r as SitelineError).configured === false);
  if (failed) return failed.r as SitelineError;
  const items = parts.flatMap((p) => (p.r as AgingOverdueResponse).items.map((it) => ({ ...it, entityId: p.entityId })));
  const biggestOf = (list: AgingOverdueItem[]) =>
    list.reduce<AgingOverdueItem | null>((best, it) => (!best || (it.netDollars || 0) > (best.netDollars || 0) ? it : best), null);
  const paged = pageOfRows(items, q, (it, key) => (it as unknown as Record<string, unknown>)[key]);
  return {
    items: q.all && q.nav ? paged.rows.map((it) => ({ contractId: it.contractId, projectName: it.projectName }) as AgingOverdueItem) : paged.rows,
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
    summary: {
      netTotal: items.reduce((s, it) => s + (it.netDollars || 0), 0),
      count: items.length,
      contracts: new Set(items.map((it) => `${it.entityId}:${it.contractId}`)).size,
      biggest: biggestOf(items),
      byCompany: q.entityIds.map((entityId) => {
        const late = items.filter((it) => it.entityId === entityId);
        return {
          entityId,
          older: late.reduce((s, it) => s + (it.netDollars || 0), 0),
          withOlder: new Set(late.map((it) => it.contractId)).size,
          biggest: biggestOf(late),
        };
      }),
    },
  };
}
