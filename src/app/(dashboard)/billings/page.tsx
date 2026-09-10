"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  useSitelineStatus,
  useSitelineCompany,
  useSitelineContract,
  useSitelinePayApp,
} from "@/hooks/useSiteline";
import {
  getSitelinePaginatedContracts,
  getSitelinePaginatedPayApps,
  getSitelineAgingReport,
  getSitelineAgingOverdue,
} from "@/lib/api/endpoints/siteline";
import type {
  SitelineContract,
  SitelinePaginatedContractsResponse,
  SitelinePaginatedPayAppsResponse,
  SitelinePaginatedContractRow,
  SitelinePaginatedPayAppRow,
  SitelinePayApp,
  SitelineError,
  AgingReportResponse,
  AgingOverdueResponse,
  AgingOverdueItem,
  SitelineAgingFilters,
} from "@/lib/api/endpoints/siteline";
import { ContractDetailModal } from "@/components/billings/ContractDetailModal";
import { PayAppDetailModal } from "@/components/billings/PayAppDetailModal";
import { useCompany } from "@/contexts/CompanyContext";
import { sitelineEntityIdFromContext } from "@/lib/siteline-entity";
import { SitelineClearstoryGapsBanner } from "@/components/billings/SitelineClearstoryGapsBanner";

const formatCurrency = (value: number | undefined) =>
  value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";

const formatAgingCurrency = (value: number | undefined) =>
  value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : "—";

const formatPercent = (value: number | undefined) =>
  value != null ? `${(value * 100).toFixed(1)}%` : "—";

/**
 * Full text color/weight class for an aging bucket cell, given the caller's own default
 * (body row vs. bold totals row). Only overrides the default when the bucket carries a
 * balance in a past-due-enough range — combining two conflicting `text-*` utilities on one
 * element relies on Tailwind's generated CSS order rather than className order, so we pick
 * exactly one final class instead.
 */
const agingBucketCellClass = (bucket: string, value: number | undefined, defaultClass: string): string => {
  if (value) {
    if (bucket === ">120 Days") return "font-semibold text-red-700 dark:text-red-400";
    if (bucket === "91-120 Days") return "font-medium text-red-600 dark:text-red-400";
    if (bucket === "61-90 Days") return "font-medium text-amber-700 dark:text-amber-400";
  }
  return defaultClass;
};

const formatInvoiceNumber = (value: number | null | undefined) =>
  value != null ? `${value}` : "—";

/** ISO 8601 invoice / billing start date; same locale style as due date (frontend-siteline-invoice-date.md). */
const formatInvoiceDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

const formatDateTimeParts = (value?: string, timeZone?: string) => {
  if (!value) return { date: "—", time: "—" };
  const d = new Date(value);
  const tz = timeZone || "UTC";
  const date = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: tz,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return { date, time };
};

const formatMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

interface SortState {
  by: string | null;
  dir: "ASC" | "DESC";
}

function toggleSort(current: SortState, key: string): SortState {
  if (current.by !== key) return { by: key, dir: "ASC" };
  return { by: key, dir: current.dir === "ASC" ? "DESC" : "ASC" };
}

function compareValues(a: unknown, b: unknown, dir: "ASC" | "DESC"): number {
  const mul = dir === "ASC" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mul;
}

/** White card, urgent "Past Due" badge, skeleton-in-place while data loads (no layout shift). */
function PastDueMetricCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow dark:border-stone-700 dark:bg-stone-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Past Due
        </span>
        <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-stone-400">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-28 animate-pulse rounded bg-slate-100 dark:bg-stone-800" aria-hidden />
        ) : (
          <p className="mt-1 animate-[fade-in_200ms_ease] text-xl font-bold tracking-tight text-slate-900 dark:text-stone-100">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.by === sortKey;
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-stone-900 dark:hover:text-stone-100 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-stone-900 dark:text-stone-100" : ""}`}
      >
        {label}
        <svg
          className={`h-3 w-3 shrink-0 transition ${active ? "text-brand" : "text-stone-400/60 dark:text-stone-500/60"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          {active && sort.dir === "ASC" ? (
            <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>
    </th>
  );
}

// Siteline-style threshold labels for aging columns.
const SITELINE_AGING_DISPLAY_MAP: Record<string, string> = {
  Current: "Current",
  "31-60 Days": ">30 days",
  "61-90 Days": ">60 days",
  "91-120 Days": ">90 days",
  ">120 Days": ">120 days",
};

/** Fills remaining card size; scroll inside viewport (Billings aging / overdue). */
const BILLING_TABLE_FILL_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto";

/** Contracts / pay apps tab (fixed max height when that tab is enabled). */
const BILLING_TABLE_SCROLL_WRAPPER =
  "min-w-0 w-full overflow-x-auto overflow-y-auto min-h-[12rem] max-h-[min(70dvh,calc(100dvh-13.5rem))] sm:max-h-[min(72dvh,calc(100dvh-14rem))]";

function isSitelineError(value: unknown): value is SitelineError {
  return (
    value !== null &&
    typeof value === "object" &&
    ("error" in value || (value as SitelineError).configured === false)
  );
}

/** Set to true to show the "Contracts & Pay apps" tab again. See ENABLE_SIGNIN.md § Billings. */
const CONTRACTS_PAYAPPS_TAB_ENABLED = false;

export default function BillingsPage() {
  const { status, error: statusError, loading: statusLoading, refetch: refetchStatus } = useSitelineStatus();
  const configured = status?.configured ?? false;

  const { companyId, company: ourCompany } = useCompany();
  const sitelineEntityId = useMemo(
    () => sitelineEntityIdFromContext(companyId),
    [companyId]
  );

  const { company } = useSitelineCompany(configured);

  const [contractsFilters, setContractsFilters] = useState(() => ({
    month: formatMonth(new Date()),
    contractStatus: "ACTIVE",
    payAppStatus: "ALL",
  }));
  const [contractsPage, setContractsPage] = useState<SitelinePaginatedContractsResponse | null>(null);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [payAppsFilters, setPayAppsFilters] = useState(() => ({
    submittedInMonth: formatMonth(new Date()),
  }));
  const [payAppsPage, setPayAppsPage] = useState<SitelinePaginatedPayAppsResponse | null>(null);
  const [payAppsLoading, setPayAppsLoading] = useState(false);
  const [payAppsError, setPayAppsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"contracts" | "aging" | "overdue">(
    CONTRACTS_PAYAPPS_TAB_ENABLED ? "contracts" : "aging"
  );
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [gapsChecking, setGapsChecking] = useState(true);

  const [agingReport, setAgingReport] = useState<AgingReportResponse | null>(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingError, setAgingError] = useState<string | null>(null);
  const [agingFilters, setAgingFilters] = useState<SitelineAgingFilters>(() => ({
    search: "",
    overdueOnly: false,
  }));
  const agingFiltersRef = useRef(agingFilters);

  const [agingOverdue, setAgingOverdue] = useState<AgingOverdueResponse | null>(null);
  const [agingOverdueLoading, setAgingOverdueLoading] = useState(false);
  const [agingOverdueError, setAgingOverdueError] = useState<string | null>(null);
  const [overdueFilters, setOverdueFilters] = useState<SitelineAgingFilters>(() => ({
    search: "",
    overdueOnly: true,
    /** Inclusive minimum days past due; 51 matches backend default / legacy “> 50”. */
    minDaysPastDue: 51,
  }));
  const overdueFiltersRef = useRef(overdueFilters);

  const defaultAgingFilters: SitelineAgingFilters = {
    search: "",
    overdueOnly: false,
  };

  const defaultOverdueFilters: SitelineAgingFilters = {
    search: "",
    overdueOnly: true,
    minDaysPastDue: 51,
  };

  const overdueMinDays = overdueFilters.minDaysPastDue ?? 51;

  // Keep refs updated so our fetch callbacks don't change identity on every input change.
  // That prevents the auto-fetch useEffect from re-running continuously while the user types.
  useEffect(() => {
    agingFiltersRef.current = agingFilters;
  }, [agingFilters]);
  useEffect(() => {
    overdueFiltersRef.current = overdueFilters;
  }, [overdueFilters]);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedPayAppId, setSelectedPayAppId] = useState<string | null>(null);

  const { contract, error: contractError, loading: contractLoading } = useSitelineContract(selectedContractId, !!selectedContractId);
  const { payApp, error: payAppError, loading: payAppLoading } = useSitelinePayApp(selectedPayAppId, !!selectedPayAppId);

  const openContract = useCallback((row: SitelinePaginatedContractRow) => {
    setSelectedContractId(row.id);
  }, []);
  const closeContract = useCallback(() => setSelectedContractId(null), []);

  const openPayApp = useCallback((pa: SitelinePayApp) => setSelectedPayAppId(pa.id), []);
  const closePayApp = useCallback(() => setSelectedPayAppId(null), []);

  const loadContracts = useCallback(async () => {
    if (!configured) return;
    setContractsLoading(true);
    setContractsError(null);
    try {
      const result = await getSitelinePaginatedContracts({
        month: contractsFilters.month || undefined,
        contractStatus: contractsFilters.contractStatus === "ALL" ? undefined : contractsFilters.contractStatus,
        payAppStatus: contractsFilters.payAppStatus === "ALL" ? undefined : contractsFilters.payAppStatus,
        limit: 50,
      });
      if (isSitelineError(result)) {
        setContractsPage(null);
        setContractsError(result.error ?? result.message ?? "Failed to load contracts");
      } else {
        setContractsPage(result);
      }
    } catch (e) {
      setContractsPage(null);
      setContractsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setContractsLoading(false);
    }
  }, [configured, contractsFilters.month, contractsFilters.contractStatus, contractsFilters.payAppStatus]);

  const loadPayApps = useCallback(async () => {
    if (!configured) return;
    setPayAppsLoading(true);
    setPayAppsError(null);
    try {
      const result = await getSitelinePaginatedPayApps({
        submittedInMonth: payAppsFilters.submittedInMonth || undefined,
        limit: 50,
      });
      if (isSitelineError(result)) {
        setPayAppsPage(null);
        setPayAppsError(result.error ?? result.message ?? "Failed to load pay apps");
      } else {
        setPayAppsPage(result);
      }
    } catch (e) {
      setPayAppsPage(null);
      setPayAppsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setPayAppsLoading(false);
    }
  }, [configured, payAppsFilters.submittedInMonth]);

  const loadAgingReport = useCallback(async (filtersOverride?: SitelineAgingFilters) => {
    if (!configured) return;
    if (sitelineEntityId == null) {
      setAgingReport(null);
      setAgingError("Select GOEL, GOEL DC, or DCB in the header to view Siteline billing.");
      return;
    }
    setAgingLoading(true);
    setAgingError(null);
    try {
      const result = await getSitelineAgingReport({
        ...(filtersOverride ?? agingFiltersRef.current),
        entityId: sitelineEntityId,
      });
      if (isSitelineError(result)) {
        setAgingReport(null);
        setAgingError((result as SitelineError).error ?? (result as SitelineError).message ?? "Failed to load aging report");
      } else {
        setAgingReport(result);
      }
    } catch (e) {
      setAgingReport(null);
      setAgingError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAgingLoading(false);
    }
  }, [configured, sitelineEntityId]);

  const loadAgingOverdue = useCallback(async (filtersOverride?: SitelineAgingFilters) => {
    if (!configured) return;
    if (sitelineEntityId == null) {
      setAgingOverdue(null);
      setAgingOverdueError("Select GOEL, GOEL DC, or DCB in the header to view Siteline billing.");
      return;
    }
    setAgingOverdueLoading(true);
    setAgingOverdueError(null);
    try {
      const base = filtersOverride ?? overdueFiltersRef.current;
      const result = await getSitelineAgingOverdue({
        ...base,
        entityId: sitelineEntityId,
        minDaysPastDue: base.minDaysPastDue ?? 51,
      });
      if (isSitelineError(result)) {
        setAgingOverdue(null);
        setAgingOverdueError(
          (result as SitelineError).error ??
            (result as SitelineError).message ??
            "Failed to load overdue aging items"
        );
      } else {
        setAgingOverdue(result);
      }
    } catch (e) {
      setAgingOverdue(null);
      setAgingOverdueError(
        e instanceof Error ? e.message : "Unknown error loading overdue items"
      );
    } finally {
      setAgingOverdueLoading(false);
    }
  }, [configured, sitelineEntityId]);

  const clearAgingFiltersAndReload = useCallback(async () => {
    setAgingFilters(defaultAgingFilters);
    await loadAgingReport(defaultAgingFilters);
  }, [loadAgingReport]);

  const clearOverdueFiltersAndReload = useCallback(async () => {
    setOverdueFilters(defaultOverdueFilters);
    await loadAgingOverdue(defaultOverdueFilters);
  }, [loadAgingOverdue]);

  const agingDisplayBuckets = useMemo(
    () =>
      (agingReport?.buckets ?? []).filter((bucket) => bucket !== "1-30 Days"),
    [agingReport]
  );

  useEffect(() => {
    if (configured && CONTRACTS_PAYAPPS_TAB_ENABLED) {
      loadContracts();
      loadPayApps();
    }
  }, [configured, loadContracts, loadPayApps]);

  useEffect(() => {
    if (!configured) return;
    if (activeTab === "aging") {
      loadAgingReport();
    } else if (activeTab === "overdue") {
      loadAgingOverdue();
    }
  }, [configured, activeTab, companyId, loadAgingReport, loadAgingOverdue]);

  // Keep the past-due exposure KPI fresh regardless of which tab is active.
  useEffect(() => {
    if (!configured) return;
    loadAgingOverdue();
  }, [configured, companyId, loadAgingOverdue]);

  const pastDueTotal = useMemo(
    () => agingOverdue?.items.reduce((sum, item) => sum + (item.netDollars || 0), 0) ?? 0,
    [agingOverdue]
  );
  const pastDueCount = agingOverdue?.items.length ?? 0;

  const [agingSort, setAgingSort] = useState<SortState>({ by: null, dir: "ASC" });
  const onAgingSort = useCallback((key: string) => setAgingSort((s) => toggleSort(s, key)), []);
  const sortedAgingRows = useMemo(() => {
    const rows = agingReport?.rows ?? [];
    if (!agingSort.by) return rows;
    const key = agingSort.by;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = key.startsWith("bucket:")
        ? a.buckets[key.slice(7) as keyof typeof a.buckets]
        : (a as unknown as Record<string, unknown>)[key];
      const vb = key.startsWith("bucket:")
        ? b.buckets[key.slice(7) as keyof typeof b.buckets]
        : (b as unknown as Record<string, unknown>)[key];
      return compareValues(va, vb, agingSort.dir);
    });
    return copy;
  }, [agingReport, agingSort]);

  const [overdueSort, setOverdueSort] = useState<SortState>({ by: null, dir: "ASC" });
  const onOverdueSort = useCallback((key: string) => setOverdueSort((s) => toggleSort(s, key)), []);
  const sortedOverdueItems = useMemo(() => {
    const items = agingOverdue?.items ?? [];
    if (!overdueSort.by) return items;
    const key = overdueSort.by;
    const copy = [...items];
    copy.sort((a, b) =>
      compareValues(
        (a as unknown as Record<string, unknown>)[key],
        (b as unknown as Record<string, unknown>)[key],
        overdueSort.dir
      )
    );
    return copy;
  }, [agingOverdue, overdueSort]);

  const topError = statusError;

  const contracts = contractsPage?.contracts ?? [];
  const payApps = payAppsPage?.payApps ?? [];
  // One combined signal for "something is fetching" — status check, aging report,
  // overdue list, or the Clearstory gap check. Feeding statusLoading into the tab
  // skeletons too (below) means the page goes straight from first paint to shape-matched
  // skeletons to content, with no separate generic loading flash in between.
  const isSyncing =
    statusLoading ||
    agingLoading ||
    agingOverdueLoading ||
    (configured && sitelineEntityId != null && gapsChecking);
  const showAgingSkeleton = statusLoading || agingLoading;
  const showOverdueSkeleton = statusLoading || agingOverdueLoading;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6">
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Billing
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Syncing with Clearstory…
              </span>
            )}
            {configured && sitelineEntityId != null && (
              <button
                type="button"
                onClick={() => setShowSyncDetails((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {showSyncDetails ? "Hide sync details" : "View sync details"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Siteline construction billing, covering contracts, schedule of values, and pay applications.
          {ourCompany ? ` Showing ${ourCompany.name}.` : null}
        </p>
      </div>

      {showSyncDetails && (
        <div className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300">
          A/R aging data syncs from Siteline automatically every 10 minutes. Past due and Clearstory
          reconciliation checks run in the background whenever this page is open.
        </div>
      )}

      {configured && sitelineEntityId != null ? (
        <SitelineClearstoryGapsBanner
          entityId={sitelineEntityId}
          className="shrink-0"
          onLoadingChange={setGapsChecking}
        />
      ) : null}

      {!statusLoading && !configured && (
        <Card className="border-brand/30 bg-brand/5 dark:border-brand/40 dark:bg-brand/10">
          <CardHeader title="Siteline not configured" subtitle={status?.message ?? "Billing is not available."} />
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Set SITELINE_API_URL and SITELINE_API_TOKEN in the backend .env to enable construction billing.
          </p>
          <button
            type="button"
            onClick={refetchStatus}
            className="rounded-lg bg-brand/80 px-4 py-2 text-sm font-medium text-white hover:bg-brand-secondary dark:bg-brand dark:hover:bg-brand"
          >
            Check again
          </button>
        </Card>
      )}

      {topError && configured && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {topError}
        </div>
      )}

      {(statusLoading || configured) && (
        <>
          {company && (
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
                <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M3 21h18M6 21V7l6-4 6 4v14M10 21v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {company.name}
              </span>
            </div>
          )}

          <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <PastDueMetricCard
              label="Past Due Exposure"
              value={formatAgingCurrency(pastDueTotal)}
              loading={showOverdueSkeleton && !agingOverdue}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M12 3v18M17 7.5c0-1.93-2.24-3.5-5-3.5s-5 1.57-5 3.5 2.24 3.5 5 3.5 5 1.57 5 3.5-2.24 3.5-5 3.5-5-1.57-5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <PastDueMetricCard
              label="Past Due Contracts"
              value={pastDueCount}
              loading={showOverdueSkeleton && !agingOverdue}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12h6M9 16h6" strokeLinecap="round" />
                </svg>
              }
            />
          </div>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <div className="shrink-0 flex w-full min-w-0 gap-5 border-b border-slate-200 dark:border-stone-700">
            {CONTRACTS_PAYAPPS_TAB_ENABLED && (
              <button
                type="button"
                onClick={() => setActiveTab("contracts")}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  activeTab === "contracts"
                    ? "text-slate-900 dark:text-stone-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                Contracts & Pay apps
                {activeTab === "contracts" && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("aging")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === "aging"
                  ? "text-slate-900 dark:text-stone-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              A/R Aging
              {activeTab === "aging" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overdue")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === "overdue"
                  ? "text-slate-900 dark:text-stone-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              Past due
              {activeTab === "overdue" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          </div>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col pt-2">
          {CONTRACTS_PAYAPPS_TAB_ENABLED && activeTab === "contracts" && (
          <>
          <Card>
            <CardHeader
              title="Contracts"
              subtitle="Paginated contracts from Siteline (by month, status, pay app status)."
            />
            <div className="mb-3 flex flex-wrap gap-3 px-1 sm:px-0">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span>Billing month</span>
                <input
                  type="month"
                  value={contractsFilters.month}
                  onChange={(e) =>
                    setContractsFilters((prev) => ({ ...prev, month: e.target.value }))
                  }
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span>Contract status</span>
                <select
                  value={contractsFilters.contractStatus}
                  onChange={(e) =>
                    setContractsFilters((prev) => ({ ...prev, contractStatus: e.target.value }))
                  }
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                >
                  <option value="ALL">Any</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span>Pay app status</span>
                <select
                  value={contractsFilters.payAppStatus}
                  onChange={(e) =>
                    setContractsFilters((prev) => ({ ...prev, payAppStatus: e.target.value }))
                  }
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                >
                  <option value="ALL">Any</option>
                  <option value="SUBMITTED_SYNCED_PAID">Submitted / Synced / Paid</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </label>
              <button
                type="button"
                onClick={loadContracts}
                className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Apply filters
              </button>
            </div>
            {(contractsLoading && contractsPage) && (
              <div className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                Refreshing contracts…
              </div>
            )}
            {contractsError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                {contractsError}
              </div>
            )}
            {contracts.length === 0 && !contractsError ? (
              <p className="py-6 text-sm text-stone-500 dark:text-stone-400 text-center">
                No contracts found for this filter.
              </p>
            ) : (
              <div className={BILLING_TABLE_SCROLL_WRAPPER}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-700">
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Contract / Internal #
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Project #
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Billing type
                      </th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Percent complete
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Latest pay app (month)
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Status
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((row) => {
                      const latestPayApp = row.payApps?.[0];
                      const start = latestPayApp
                        ? formatDateTimeParts(latestPayApp.billingStart, latestPayApp.timeZone)
                        : null;
                      const end = latestPayApp
                        ? formatDateTimeParts(latestPayApp.billingEnd, latestPayApp.timeZone)
                        : null;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-stone-100 last:border-0 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                        >
                          <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                            {row.internalProjectNumber ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                            {row.project?.projectNumber ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                            {row.billingType ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                            {formatPercent(row.percentComplete)}
                          </td>
                          <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                            {latestPayApp && start && end ? (
                              <div className="flex flex-col">
                                <span>
                                  {start.date} – {end.date}
                                </span>
                                <span className="text-xs text-stone-500 dark:text-stone-400">
                                  {start.time} – {end.time}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                            {latestPayApp?.status ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-sm">
                            <button
                              type="button"
                              onClick={() => openContract(row)}
                              className="text-brand hover:text-brand-secondary dark:text-brand dark:hover:text-white font-medium"
                            >
                              View contract
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Pay apps by month"
              subtitle="Paginated pay apps from Siteline (by submitted month)."
            />
            <div className="mb-3 flex flex-wrap gap-3 px-1 sm:px-0">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span>Submitted in month</span>
                <input
                  type="month"
                  value={payAppsFilters.submittedInMonth}
                  onChange={(e) =>
                    setPayAppsFilters((prev) => ({ ...prev, submittedInMonth: e.target.value }))
                  }
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </label>
              <button
                type="button"
                onClick={loadPayApps}
                className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Apply filters
              </button>
            </div>
            {(payAppsLoading && payAppsPage) && (
              <div className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                Refreshing pay apps…
              </div>
            )}
            {payAppsError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                {payAppsError}
              </div>
            )}
            {payApps.length === 0 && !payAppsError ? (
              <p className="py-6 text-sm text-stone-500 dark:text-stone-400 text-center">
                No pay apps found for this filter.
              </p>
            ) : (
              <div className={BILLING_TABLE_SCROLL_WRAPPER}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-700">
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Pay app #
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Project / Contract
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Billing type
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Status
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Updated at
                      </th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payApps.map((row: SitelinePaginatedPayAppRow) => (
                      <tr
                        key={row.id}
                        className="border-b border-stone-100 last:border-0 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                      >
                        <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                          {row.payAppNumber ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                          {row.contract?.project?.projectNumber ?? "—"}{" "}
                          {row.contract?.internalProjectNumber
                            ? `· ${row.contract.internalProjectNumber}`
                            : ""}
                        </td>
                        <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                          {row.billingType ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                          {row.status ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                          {row.updatedAt ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <button
                            type="button"
                            onClick={() => setSelectedPayAppId(row.id)}
                            className="text-brand hover:text-brand-secondary dark:text-brand dark:hover:text-white font-medium"
                          >
                            Open pay app
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </>
          )}

          {activeTab === "aging" && (
            <Card className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
              <div className="shrink-0 w-full min-w-0">
              <CardHeader
                title="A/R Aging"
                subtitle="Net dollars by project and days past due. Data syncs every 10 minutes."
              />
              <div className="mb-3 w-full min-w-0">
                <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700 dark:bg-transparent">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                    <span>Search</span>
                    <input
                      value={agingFilters.search ?? ""}
                      onChange={(e) => setAgingFilters((p) => ({ ...p, search: e.target.value }))}
                      placeholder="Project, PM, numbers…"
                      className="h-8 w-72 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </label>

                  <label className="flex items-center gap-2 pb-[2px] text-xs text-stone-600 dark:text-stone-400">
                    <input
                      type="checkbox"
                      checked={!!agingFilters.overdueOnly}
                      onChange={(e) => setAgingFilters((p) => ({ ...p, overdueOnly: e.target.checked }))}
                    />
                    <span>Overdue only</span>
                  </label>

                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadAgingReport()}
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAgingFiltersAndReload()}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/30 dark:text-stone-100 dark:hover:bg-stone-900/60"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer select-none text-xs font-medium text-stone-700 dark:text-stone-200">
                    Advanced filters
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <div className="grid grid-cols-2 gap-1">
                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Min days past due</span>
                          <input
                            type="number"
                            step={1}
                            value={agingFilters.minDaysPastDue ?? ""}
                            onChange={(e) =>
                              setAgingFilters((p) => ({
                                ...p,
                                minDaysPastDue: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Max days past due</span>
                          <input
                            type="number"
                            step={1}
                            value={agingFilters.maxDaysPastDue ?? ""}
                            onChange={(e) =>
                              setAgingFilters((p) => ({
                                ...p,
                                maxDaysPastDue: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <div className="grid grid-cols-2 gap-1">
                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Min net ($)</span>
                          <input
                            type="number"
                            step={0.01}
                            value={agingFilters.minNetDollars ?? ""}
                            onChange={(e) =>
                              setAgingFilters((p) => ({
                                ...p,
                                minNetDollars: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Max net ($)</span>
                          <input
                            type="number"
                            step={0.01}
                            value={agingFilters.maxNetDollars ?? ""}
                            onChange={(e) =>
                              setAgingFilters((p) => ({
                                ...p,
                                maxNetDollars: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                        <span>Status</span>
                        <input
                          value={agingFilters.includeStatuses ?? ""}
                          onChange={(e) =>
                            setAgingFilters((p) => ({
                              ...p,
                              includeStatuses: e.target.value || undefined,
                            }))
                          }
                          placeholder="PROPOSED,SIGNED"
                          className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </label>
                    </div>
                  </div>
                </details>
                </div>
              </div>
              </div>
              {agingError && (
                <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {agingError}
                  <button
                    type="button"
                    onClick={() => loadAgingReport()}
                    className="ml-3 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!showAgingSkeleton && !agingError && agingReport && agingReport.rows.length === 0 && (
                <p className="shrink-0 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                  No aging data yet. Data syncs every 10 minutes.
                </p>
              )}
              {!agingError && (showAgingSkeleton || (agingReport && agingReport.rows.length > 0)) && (
                <div className={BILLING_TABLE_FILL_SCROLL}>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-700">
                        <SortableTh
                          label="Project"
                          sortKey="projectName"
                          sort={agingSort}
                          onSort={onAgingSort}
                          className="sticky left-0 z-20 bg-stone-50 dark:bg-stone-800/50"
                        />
                        <SortableTh label="PM" sortKey="leadPmName" sort={agingSort} onSort={onAgingSort} />
                        <SortableTh
                          label="Invoice #"
                          sortKey="invoiceNumber"
                          sort={agingSort}
                          onSort={onAgingSort}
                          align="right"
                        />
                        <SortableTh label="Invoice date" sortKey="invoiceDate" sort={agingSort} onSort={onAgingSort} />
                        {agingDisplayBuckets.map((b) => (
                          <SortableTh
                            key={b}
                            label={SITELINE_AGING_DISPLAY_MAP[b] ?? b}
                            sortKey={`bucket:${b}`}
                            sort={agingSort}
                            onSort={onAgingSort}
                            align="right"
                          />
                        ))}
                        <SortableTh
                          label="Project Total"
                          sortKey="projectTotal"
                          sort={agingSort}
                          onSort={onAgingSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {showAgingSkeleton &&
                        Array.from({ length: 8 }, (_, i) => (
                          <tr key={`skeleton-${i}`} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                            {Array.from({ length: agingDisplayBuckets.length + 5 }, (_, j) => (
                              <td key={j} className="px-3 py-2.5">
                                <div className="h-3.5 w-full max-w-24 animate-pulse rounded bg-stone-200/80 dark:bg-stone-700/60" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      {!showAgingSkeleton &&
                        sortedAgingRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                        >
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-stone-900 dark:bg-stone-900 dark:text-stone-100">
                            {row.projectName}
                          </td>
                          <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                            <div className="flex flex-col">
                              <span>{row.leadPmName ?? "—"}</span>
                              {row.leadPmEmail && (
                                <a
                                  href={`mailto:${row.leadPmEmail}`}
                                  className="text-xs text-brand-secondary hover:underline dark:text-brand"
                                >
                                  {row.leadPmEmail}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-stone-800 dark:text-stone-200 tabular-nums">
                            {formatInvoiceNumber(row.invoiceNumber)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-left text-stone-800 dark:text-stone-200">
                            {formatInvoiceDate(row.invoiceDate)}
                          </td>
                          {agingDisplayBuckets.map((b) => {
                            const bucketValue = row.buckets[b as keyof typeof row.buckets];
                            return (
                              <td
                                key={b}
                                className={`px-3 py-2 text-right tabular-nums ${agingBucketCellClass(b, bucketValue, "text-stone-800 dark:text-stone-200")}`}
                              >
                                {formatAgingCurrency(bucketValue)}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right font-medium text-stone-800 dark:text-stone-200 tabular-nums">
                            {formatAgingCurrency(row.projectTotal)}
                          </td>
                        </tr>
                      ))}
                      {!showAgingSkeleton && agingReport && (
                        <tr className="border-t-2 border-stone-300 bg-stone-50 font-semibold dark:border-stone-600 dark:bg-stone-800/50">
                          <td className="sticky left-0 z-10 bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                            TOTALS
                          </td>
                          <td className="px-3 py-2 text-stone-900 dark:text-stone-100 tabular-nums">
                            {/* PM column has no totals */}
                          </td>
                          <td className="px-3 py-2 text-stone-900 dark:text-stone-100 tabular-nums">
                            {/* Invoice # column has no totals */}
                          </td>
                          <td className="px-3 py-2 text-stone-900 dark:text-stone-100">
                            {/* Invoice date column has no totals */}
                          </td>
                          {agingDisplayBuckets.map((b) => {
                            const bucketTotal = agingReport.totals[b as keyof typeof agingReport.totals];
                            return (
                              <td
                                key={b}
                                className={`px-3 py-2 text-right tabular-nums ${agingBucketCellClass(b, bucketTotal, "text-stone-900 dark:text-stone-100")}`}
                              >
                                {formatAgingCurrency(bucketTotal)}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right text-stone-900 dark:text-stone-100 tabular-nums">
                            {formatAgingCurrency(agingReport.totals.projectTotal)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeTab === "overdue" && (
            <Card className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
              <div className="shrink-0 w-full min-w-0">
              <CardHeader
                title="Past due pay apps"
                subtitle="Pay apps with days past due ≥ your minimum (inclusive). Adjust the threshold and click Apply; net > 0 is enforced server-side."
              />
              <div className="mb-3 w-full min-w-0">
                <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700 dark:bg-transparent">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                    <span>Search</span>
                    <input
                      value={overdueFilters.search ?? ""}
                      onChange={(e) => setOverdueFilters((p) => ({ ...p, search: e.target.value }))}
                      placeholder="Project, PM, numbers…"
                      className="h-8 w-72 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                    <span>At least (days past due)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={
                        overdueFilters.minDaysPastDue === undefined
                          ? ""
                          : overdueFilters.minDaysPastDue
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setOverdueFilters((p) => ({ ...p, minDaysPastDue: undefined }));
                          return;
                        }
                        const n = parseInt(v, 10);
                        if (!Number.isNaN(n)) {
                          setOverdueFilters((p) => ({
                            ...p,
                            minDaysPastDue: Math.max(0, n),
                          }));
                        }
                      }}
                      onBlur={() => {
                        setOverdueFilters((p) => ({
                          ...p,
                          minDaysPastDue: p.minDaysPastDue ?? 51,
                        }));
                      }}
                      className="h-8 w-24 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </label>

                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadAgingOverdue()}
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => clearOverdueFiltersAndReload()}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/30 dark:text-stone-100 dark:hover:bg-stone-900/60"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer select-none text-xs font-medium text-stone-700 dark:text-stone-200">
                    Advanced filters
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                        <span>Max days past due</span>
                        <input
                          type="number"
                          step={1}
                          value={overdueFilters.maxDaysPastDue ?? ""}
                          onChange={(e) =>
                            setOverdueFilters((p) => ({
                              ...p,
                              maxDaysPastDue: e.target.value === "" ? undefined : Number(e.target.value),
                            }))
                          }
                          className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </label>
                    </div>

                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <div className="grid grid-cols-2 gap-1">
                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Min net ($)</span>
                          <input
                            type="number"
                            step={0.01}
                            value={overdueFilters.minNetDollars ?? ""}
                            onChange={(e) =>
                              setOverdueFilters((p) => ({
                                ...p,
                                minNetDollars: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                          <span>Max net ($)</span>
                          <input
                            type="number"
                            step={0.01}
                            value={overdueFilters.maxNetDollars ?? ""}
                            onChange={(e) =>
                              setOverdueFilters((p) => ({
                                ...p,
                                maxNetDollars: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-stone-200/80 bg-transparent p-2 dark:border-stone-700">
                      <label className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-400">
                        <span>Status</span>
                        <input
                          value={overdueFilters.includeStatuses ?? ""}
                          onChange={(e) =>
                            setOverdueFilters((p) => ({
                              ...p,
                              includeStatuses: e.target.value || undefined,
                            }))
                          }
                          placeholder="PROPOSED,SIGNED"
                          className="h-8 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </label>
                    </div>
                  </div>
                </details>
                </div>
              </div>
              </div>
              {agingOverdueError && (
                <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {agingOverdueError}
                  <button
                    type="button"
                    onClick={() => loadAgingOverdue()}
                    className="ml-3 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!showOverdueSkeleton &&
                !agingOverdueError &&
                agingOverdue &&
                agingOverdue.items.length === 0 && (
                  <p className="shrink-0 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                    No pay apps at least {overdueMinDays} days past due (with current filters).
                  </p>
                )}
              {!agingOverdueError &&
                (showOverdueSkeleton || (agingOverdue && agingOverdue.items.length > 0)) && (
                  <div className={BILLING_TABLE_FILL_SCROLL}>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
                          <SortableTh label="Project" sortKey="projectName" sort={overdueSort} onSort={onOverdueSort} />
                          <SortableTh
                            label="GC / Project #"
                            sortKey="projectNumber"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                          />
                          <SortableTh label="PM" sortKey="leadPmName" sort={overdueSort} onSort={onOverdueSort} />
                          <SortableTh label="Due date" sortKey="dueDate" sort={overdueSort} onSort={onOverdueSort} />
                          <SortableTh
                            label="Days past due"
                            sortKey="daysPastDue"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <SortableTh
                            label="Invoice #"
                            sortKey="invoiceNumber"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <SortableTh
                            label="Invoice date"
                            sortKey="invoiceDate"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                          />
                          <SortableTh
                            label="Net amount"
                            sortKey="netDollars"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <SortableTh label="Status" sortKey="status" sort={overdueSort} onSort={onOverdueSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {showOverdueSkeleton &&
                          Array.from({ length: 8 }, (_, i) => (
                            <tr key={`skeleton-${i}`} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                              {Array.from({ length: 9 }, (_, j) => (
                                <td key={j} className="px-3 py-2.5">
                                  <div className="h-3.5 w-full max-w-24 animate-pulse rounded bg-stone-200/80 dark:bg-stone-700/60" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        {!showOverdueSkeleton &&
                          sortedOverdueItems.map((item: AgingOverdueItem, idx: number) => {
                          const due = item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })
                            : "—";
                          const invDate = formatInvoiceDate(item.invoiceDate);
                          return (
                            <tr
                              key={`${item.contractId}-${idx}`}
                              className="border-b border-stone-100 last:border-0 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                            >
                              <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                                <div className="flex flex-col">
                                  <span>{item.projectName ?? "—"}</span>
                                  {item.internalProjectNumber && (
                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                      {item.internalProjectNumber}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                                {item.projectNumber ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                                <div className="flex flex-col">
                                  <span>{item.leadPmName ?? "—"}</span>
                                  {item.leadPmEmail && (
                                    <a
                                      href={`mailto:${item.leadPmEmail}`}
                                      className="text-xs text-brand-secondary hover:underline dark:text-brand"
                                    >
                                      {item.leadPmEmail}
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                                {due}
                              </td>
                              <td className="px-3 py-2 text-right text-stone-800 dark:text-stone-200 tabular-nums">
                                {item.daysPastDue}
                              </td>
                              <td className="px-3 py-2 text-right text-stone-800 dark:text-stone-200 tabular-nums">
                                {formatInvoiceNumber(item.invoiceNumber)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-left text-stone-800 dark:text-stone-200">
                                {invDate}
                              </td>
                              <td className="px-3 py-2 text-right text-stone-800 dark:text-stone-200 tabular-nums">
                                {formatAgingCurrency(item.netDollars)}
                              </td>
                              <td className="px-3 py-2 text-stone-800 dark:text-stone-200">
                                {item.status ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </Card>
          )}
          </div>
          </div>
        </>
      )}

      {selectedContractId && (
        <ContractDetailModal
          contract={contract}
          loading={contractLoading}
          error={contractError}
          onClose={closeContract}
          onOpenPayApp={openPayApp}
        />
      )}

      {selectedPayAppId && (
        <PayAppDetailModal
          payApp={payApp}
          loading={payAppLoading}
          error={payAppError}
          onClose={closePayApp}
        />
      )}
    </div>
  );
}
