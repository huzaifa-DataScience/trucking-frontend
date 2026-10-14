"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";
import {
  useSitelineStatus,
  useSitelineContract,
  useSitelinePayApp,
} from "@/hooks/useSiteline";
import {
  getSitelinePaginatedContracts,
  getSitelinePaginatedPayApps,
  getSitelineAgingReport,
  getSitelineAgingOverdue,
  getSitelineEntityConfig,
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
  AgingBucket,
  SitelineAgingFilters,
} from "@/lib/api/endpoints/siteline";
import { ContractDetailModal } from "@/components/billings/ContractDetailModal";
import { PayAppDetailModal } from "@/components/billings/PayAppDetailModal";
import { useCompany } from "@/contexts/CompanyContext";
import { sitelineEntityIdFromContext } from "@/lib/siteline-entity";
import { BillingGapsChip } from "@/components/billings/BillingGapsChip";
import { BillingCompanyBreakdown } from "@/components/billings/BillingCompanyBreakdown";
import { AgingColumnsChart, type AgingColumn } from "@/components/billings/AgingColumnsChart";
import { splitProjectName } from "@/lib/siteline-project-name";
import {
  BILLING_COMPANY_PARAM,
  BILLING_RESTORE_PARAM,
  describeBillingFilters,
  loadBillingView,
  saveBillingNav,
  type BillingListKind,
} from "@/lib/billing-nav";
import {
  BillingFiltersDrawer,
  countBillingFilters,
  type BillingFilterMode,
  type BillingPanelFilters,
} from "@/components/billings/BillingFiltersDrawer";

import { SortedOptions } from "@/components/ui/SortedOptions";
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
    if (bucket === ">120 Days") return "font-semibold text-red-700";
    if (bucket === "91-120 Days") return "font-medium text-red-600";
    if (bucket === "61-90 Days") return "font-medium text-amber-700";
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
  dir: SortDir;
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function toggleSort(current: SortState, key: string): SortState {
  if (current.by !== key) return { by: key, dir: "asc" };
  return { by: key, dir: current.dir === "asc" ? "desc" : "asc" };
}

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mul;
}

function BillingSortableTh({
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
  return (
    <SortableTh
      label={label}
      column={sortKey}
      active={sort.by === sortKey}
      dir={sort.dir}
      onSort={onSort}
      align={align}
      className={className}
    />
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
  "cs-data-table cs-table-shell min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto";

/** Contracts / pay apps tab (fixed max height when that tab is enabled). */
const BILLING_TABLE_SCROLL_WRAPPER =
  "cs-data-table cs-table-shell min-w-0 w-full overflow-x-auto overflow-y-auto min-h-[12rem] max-h-[min(70dvh,calc(100dvh-13.5rem))] sm:max-h-[min(72dvh,calc(100dvh-14rem))]";

/** Our three billing companies (Ref_OurEntities). "All companies" combines these. */
const ALL_ENTITY_IDS = [1, 2, 3] as const;
const COMPANY_SHORT: Record<number, string> = { 1: "GOEL", 2: "GOEL DC", 3: "DCB" };

/** Sum several companies' aging reports into one (rows tagged with their company). */
function mergeAgingReports(parts: { entityId: number; report: AgingReportResponse }[]): AgingReportResponse {
  const [first] = parts;
  const totals = { ...first.report.totals };
  for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
    totals[key] = parts.reduce((sum, p) => sum + (Number(p.report.totals[key]) || 0), 0);
  }
  return {
    ...first.report,
    rows: parts.flatMap((p) => p.report.rows.map((r) => ({ ...r, entityId: p.entityId }))),
    totals,
  };
}

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

  // Billing has its own company switch. It starts from the header company, but switching here
  // only changes Billing; the rest of the app keeps the header's choice. undefined = follow the header.
  const { companyId: headerCompanyId } = useCompany();
  const [billingCompanyId, setCompanyId] = useState<string | null | undefined>(undefined);
  const companyId = billingCompanyId === undefined ? headerCompanyId : billingCompanyId;

  // Which company's numbers are on screen. "All companies" can't be combined for billing yet,
  // so it falls back to DEFAULT_SITELINE_ENTITY_ID — say so instead of showing it silently.
  const [entityNames, setEntityNames] = useState<Record<number, string>>({
    1: "Goel Services, Inc",
    2: "Goel DC, LLC",
    3: "Delaware Cornerstone Builders (DCB)",
  });
  useEffect(() => {
    let cancelled = false;
    getSitelineEntityConfig()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setEntityNames((prev) => {
          const next = { ...prev };
          for (const r of rows) {
            const name = r.sitelineCompanyName?.trim() || r.entityName?.trim();
            if (name) next[r.entityId] = name;
          }
          return next;
        });
      })
      .catch(() => {
        /* keep the built-in names */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // Header "All companies" (no company picked): load GOEL, GOEL DC and DCB together and add them up.
  const allCompanies = companyId == null;
  const sitelineEntityId = useMemo(
    () => sitelineEntityIdFromContext(companyId),
    [companyId]
  );


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

  const entityIds = useMemo<number[] | null>(
    () => (allCompanies ? [...ALL_ENTITY_IDS] : sitelineEntityId == null ? null : [sitelineEntityId]),
    [allCompanies, sitelineEntityId]
  );

  const loadAgingReport = useCallback(async (filtersOverride?: SitelineAgingFilters) => {
    if (!configured) return;
    if (entityIds == null) {
      setAgingReport(null);
      setAgingError("Select GOEL, GOEL DC, or DCB in the header to view Siteline billing.");
      return;
    }
    setAgingLoading(true);
    setAgingError(null);
    try {
      const filters = filtersOverride ?? agingFiltersRef.current;
      const results = await Promise.all(
        entityIds.map((entityId) => getSitelineAgingReport({ ...filters, entityId }).then((r) => ({ entityId, r })))
      );
      const failed = results.find((x) => isSitelineError(x.r));
      if (failed) {
        const e = failed.r as SitelineError;
        setAgingReport(null);
        setAgingError(
          `${entityIds.length > 1 ? `${COMPANY_SHORT[failed.entityId]}: ` : ""}${e.error ?? e.message ?? "Failed to load aging report"}`
        );
      } else {
        setAgingReport(
          mergeAgingReports(results.map((x) => ({ entityId: x.entityId, report: x.r as AgingReportResponse })))
        );
      }
    } catch (e) {
      setAgingReport(null);
      setAgingError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAgingLoading(false);
    }
  }, [configured, entityIds]);

  const loadAgingOverdue = useCallback(async (filtersOverride?: SitelineAgingFilters) => {
    if (!configured) return;
    if (entityIds == null) {
      setAgingOverdue(null);
      setAgingOverdueError("Select GOEL, GOEL DC, or DCB in the header to view Siteline billing.");
      return;
    }
    setAgingOverdueLoading(true);
    setAgingOverdueError(null);
    try {
      const base = filtersOverride ?? overdueFiltersRef.current;
      const results = await Promise.all(
        entityIds.map((entityId) =>
          getSitelineAgingOverdue({ ...base, entityId, minDaysPastDue: base.minDaysPastDue ?? 51 }).then((r) => ({
            entityId,
            r,
          }))
        )
      );
      const failed = results.find((x) => isSitelineError(x.r));
      if (failed) {
        const e = failed.r as SitelineError;
        setAgingOverdue(null);
        setAgingOverdueError(
          `${entityIds.length > 1 ? `${COMPANY_SHORT[failed.entityId]}: ` : ""}${e.error ?? e.message ?? "Failed to load overdue aging items"}`
        );
      } else {
        setAgingOverdue({
          items: results.flatMap((x) =>
            (x.r as AgingOverdueResponse).items.map((it) => ({ ...it, entityId: x.entityId }))
          ),
        });
      }
    } catch (e) {
      setAgingOverdue(null);
      setAgingOverdueError(
        e instanceof Error ? e.message : "Unknown error loading overdue items"
      );
    } finally {
      setAgingOverdueLoading(false);
    }
  }, [configured, entityIds]);

  const clearAgingFiltersAndReload = useCallback(async () => {
    setAgingFilters(defaultAgingFilters);
    await loadAgingReport(defaultAgingFilters);
  }, [loadAgingReport]);

  const clearOverdueFiltersAndReload = useCallback(async () => {
    setOverdueFilters(defaultOverdueFilters);
    await loadAgingOverdue(defaultOverdueFilters);
  }, [loadAgingOverdue]);

  // Right-hand filter panel (everything except search, which stays in the toolbar).
  const [filtersPanel, setFiltersPanel] = useState<BillingFilterMode | null>(null);
  const closeFiltersPanel = useCallback(() => setFiltersPanel(null), []);
  const agingFilterCount = countBillingFilters(agingFilters, defaultAgingFilters);
  const overdueFilterCount = countBillingFilters(overdueFilters, defaultOverdueFilters);

  const applyPanelFilters = (panel: BillingPanelFilters) => {
    if (filtersPanel === "aging") {
      const next = { ...agingFilters, ...panel };
      setAgingFilters(next);
      void loadAgingReport(next);
    } else if (filtersPanel === "overdue") {
      const next = { ...overdueFilters, ...panel };
      setOverdueFilters(next);
      void loadAgingOverdue(next);
    }
    setFiltersPanel(null);
  };

  // Search applies on its own once typing pauses (the rest of the filters apply from the panel).
  const lastAgingSearch = useRef(agingFilters.search ?? "");
  useEffect(() => {
    const q = agingFilters.search ?? "";
    if (q === lastAgingSearch.current) return;
    const t = setTimeout(() => {
      lastAgingSearch.current = q;
      void loadAgingReport();
    }, 400);
    return () => clearTimeout(t);
  }, [agingFilters.search, loadAgingReport]);

  const lastOverdueSearch = useRef(overdueFilters.search ?? "");
  useEffect(() => {
    const q = overdueFilters.search ?? "";
    if (q === lastOverdueSearch.current) return;
    const t = setTimeout(() => {
      lastOverdueSearch.current = q;
      void loadAgingOverdue();
    }, 400);
    return () => clearTimeout(t);
  }, [overdueFilters.search, loadAgingOverdue]);

  // Coming back from a project page ("Back" / breadcrumb): restore the tab and filters the user left.
  // Declared before the load effects so their first fetch already uses the restored filters.
  const restoredView = useRef(false);
  useEffect(() => {
    if (restoredView.current) return;
    restoredView.current = true;
    const params = new URLSearchParams(window.location.search);
    // ?company=2 (project page breadcrumb): open Billing on that company only.
    const linkCompany = params.get(BILLING_COMPANY_PARAM);
    const restore = params.get(BILLING_RESTORE_PARAM) === "1";
    if (!linkCompany && !restore) return;
    params.delete(BILLING_COMPANY_PARAM);
    params.delete(BILLING_RESTORE_PARAM);
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
    if (linkCompany) setCompanyId(linkCompany === "all" ? null : linkCompany);
    if (!restore) return;
    const view = loadBillingView();
    if (!view) return;
    if (view.companyId !== undefined) setCompanyId(view.companyId);
    agingFiltersRef.current = view.agingFilters;
    overdueFiltersRef.current = view.overdueFilters;
    lastAgingSearch.current = view.agingFilters.search ?? "";
    lastOverdueSearch.current = view.overdueFilters.search ?? "";
    setAgingFilters(view.agingFilters);
    setOverdueFilters(view.overdueFilters);
    setActiveTab(view.activeTab);
    pendingSortRestore.current = { aging: view.agingSort, overdue: view.overdueSort };
  }, []);
  const pendingSortRestore = useRef<{ aging: SortState; overdue: SortState } | null>(null);

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
  const pastDueContracts = useMemo(
    () => new Set((agingOverdue?.items ?? []).map((it) => `${it.entityId ?? ""}:${it.contractId}`)).size,
    [agingOverdue]
  );

  // Summary row + chart come from the A/R aging report (same buckets the table shows).
  const agingTotal = agingReport?.totals.projectTotal ?? 0;
  const agingColumns: AgingColumn[] = useMemo(
    () =>
      agingDisplayBuckets.map((bucket) => {
        const key = bucket as AgingBucket;
        return {
          key: bucket,
          label: SITELINE_AGING_DISPLAY_MAP[bucket] ?? bucket,
          amount: agingReport?.totals[key] ?? 0,
          projects: (agingReport?.rows ?? []).filter((r) => (r.buckets[key] ?? 0) > 0).length,
        };
      }),
    [agingDisplayBuckets, agingReport]
  );
  const over90Total = (agingReport?.totals["91-120 Days"] ?? 0) + (agingReport?.totals[">120 Days"] ?? 0);
  // Contract with the most money billed over 30 days ago (overdue list has one row per contract).
  const biggestOlder = useMemo(
    () =>
      (agingOverdue?.items ?? []).reduce<AgingOverdueItem | null>(
        (best, it) => (!best || (it.netDollars || 0) > (best.netDollars || 0) ? it : best),
        null
      ),
    [agingOverdue]
  );
  const agingFiltered = Boolean(
    agingFilters.search?.trim() ||
      agingFilters.overdueOnly ||
      agingFilters.minDaysPastDue != null ||
      agingFilters.maxDaysPastDue != null ||
      agingFilters.minNetDollars != null ||
      agingFilters.maxNetDollars != null ||
      agingFilters.includeStatuses
  );

  const [agingSort, setAgingSort] = useState<SortState>({ by: null, dir: "asc" });
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

  const [overdueSort, setOverdueSort] = useState<SortState>({ by: null, dir: "asc" });
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

  useEffect(() => {
    const pending = pendingSortRestore.current;
    if (!pending) return;
    pendingSortRestore.current = null;
    setAgingSort(pending.aging);
    setOverdueSort(pending.overdue);
  }, []);

  /** Before opening a project: remember this list (order + filters) for the project page's breadcrumb, Back and prev / next. */
  const rememberList = (list: BillingListKind) => {
    const seen = new Set<string>();
    const items: { id: string; label: string }[] = [];
    const add = (id: string | undefined | null, name: string | null | undefined) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      const sp = splitProjectName(name ?? id);
      items.push({ id, label: `${sp.number ? `${sp.number} · ` : ""}${sp.name}` });
    };
    if (list === "aging") sortedAgingRows.forEach((r) => add(r.contractId, r.projectName));
    else sortedOverdueItems.forEach((it) => add(it.contractId, it.projectName));
    saveBillingNav(
      {
        list,
        listLabel: list === "aging" ? "A/R aging" : "Past due",
        companyId,
        chips: describeBillingFilters(list, list === "aging" ? agingFilters : overdueFilters),
        items,
      },
      { activeTab, agingFilters, overdueFilters, agingSort, overdueSort, companyId }
    );
  };

  const topError = statusError;

  const contracts = contractsPage?.contracts ?? [];
  const payApps = payAppsPage?.payApps ?? [];
  // One combined signal for "something is fetching" — status check, aging report,
  // overdue list, or the Clearstory gap check. Feeding statusLoading into the tab
  // skeletons too (below) means the page goes straight from first paint to shape-matched
  // skeletons to content, with no separate generic loading flash in between.
  const exportCurrentTab = () => {
    const esc = (v: unknown) => {
      const t = v == null ? "" : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const company = (id?: number) => (id != null ? COMPANY_SHORT[id] ?? String(id) : "");
    let header: string[];
    let lines: unknown[][];
    if (activeTab === "aging") {
      header = ["Project", ...(allCompanies ? ["Company"] : []), "PM", ...agingDisplayBuckets.map((b) => SITELINE_AGING_DISPLAY_MAP[b] ?? b), "Project total"];
      lines = sortedAgingRows.map((r) => [
        r.projectName,
        ...(allCompanies ? [company(r.entityId)] : []),
        r.leadPmName ?? "",
        ...agingDisplayBuckets.map((b) => (r.buckets[b as AgingBucket] ?? 0).toFixed(2)),
        r.projectTotal.toFixed(2),
      ]);
    } else {
      header = ["Project", ...(allCompanies ? ["Company"] : []), "Project #", "PM", "Pay app #", "Due date", "Days past due", "Net amount", "Status"];
      lines = sortedOverdueItems.map((it) => [
        it.projectName ?? "",
        ...(allCompanies ? [company(it.entityId)] : []),
        it.internalProjectNumber ?? it.projectNumber ?? "",
        it.leadPmName ?? "",
        it.invoiceNumber ?? "",
        it.dueDate ? it.dueDate.slice(0, 10) : "",
        it.daysPastDue,
        (it.netDollars ?? 0).toFixed(2),
        it.status ?? "",
      ]);
    }
    const csv = [header, ...lines].map((row) => row.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    const who = allCompanies ? "all-companies" : company(entityIds?.[0]).toLowerCase().replace(/\s+/g, "-");
    a.href = url;
    a.download = `billing-${activeTab === "aging" ? "projects" : "past-due"}-${who}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSyncing = statusLoading || agingLoading || agingOverdueLoading;
  const lastSync = agingReport?.lastAgingBreakdownSync ? new Date(agingReport.lastAgingBreakdownSync) : null;
  const lastSyncLabel = lastSync
    ? lastSync.toDateString() === new Date().toDateString()
      ? `today, ${lastSync.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
      : lastSync.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const showAgingSkeleton = statusLoading || agingLoading;
  const showOverdueSkeleton = statusLoading || agingOverdueLoading;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 ui-animate-in [--radius:10px] [--radius-md:8px]">
      {/* Header bar: title, company switch, sync status and the "not in Clearstory" chip in one line. */}
      <section className="cs-content-panel flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg px-5 py-3.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="cs-page-title">Billing</h1>
          <span className="cs-helper">
            A/R and past-due pay apps from Siteline ·{" "}
            {allCompanies ? "all companies" : entityIds ? entityNames[entityIds[0]] ?? `company ${entityIds[0]}` : "—"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap gap-0.5 rounded-[var(--radius-md)] bg-[#f3f4f6] p-[3px]" role="group" aria-label="Company">
            {[
              { id: null as string | null, label: "All companies" },
              ...ALL_ENTITY_IDS.map((id) => ({ id: String(id) as string | null, label: COMPANY_SHORT[id] })),
            ].map((opt) => {
              const active = companyId === opt.id;
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCompanyId(opt.id)}
                  className={`h-[30px] rounded-md px-3 text-[13px] font-medium transition-colors ${
                    active ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {configured ? (
            <span
              className="inline-flex h-[30px] items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] text-ink-muted"
              title="A/R aging syncs from Siteline every 10 minutes. Past due and Clearstory checks run while this page is open."
              role="status"
            >
              {isSyncing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
                  Updating…
                </>
              ) : (
                <>
                  <span className="h-[7px] w-[7px] rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.15)]" aria-hidden />
                  {lastSyncLabel ? `Siteline synced ${lastSyncLabel}` : "Siteline connected"}
                </>
              )}
            </span>
          ) : null}
          {configured && entityIds ? <BillingGapsChip entityIds={entityIds} /> : null}
          {configured ? (
            <button
              type="button"
              onClick={exportCurrentTab}
              disabled={activeTab === "aging" ? !agingReport?.rows.length : !agingOverdue?.items.length}
              title={activeTab === "aging" ? "Download the projects table as CSV" : "Download the past-due list as CSV"}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
            </button>
          ) : null}
        </div>
      </section>

      {!statusLoading && !configured && (
        <Card className="border-brand/30 bg-brand/5 dark:border-brand/40 dark:bg-brand/10">
          <CardHeader title="Siteline not configured" subtitle={status?.message ?? "Billing is not available."} />
          <p className="text-sm text-ink-muted mb-4">
            Set SITELINE_API_URL and SITELINE_API_TOKEN in the backend .env to enable construction billing.
          </p>
          <button type="button" onClick={refetchStatus} className={buttonClasses("secondary")}>
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
          {/* Summary card: four colour-coded tiles + biggest older balance on the left, A/R by age on the right. */}
          <section className="cs-content-panel grid shrink-0 overflow-hidden rounded-lg lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3.5 border-b border-[var(--border-subtle)] px-5 py-[18px] lg:border-b-0 lg:border-r">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">Summary{agingFiltered ? " (filtered)" : ""}</h2>
              <span className="text-[12px] text-ink-muted">
                {allCompanies ? "All companies" : entityIds ? entityNames[entityIds[0]] ?? "" : ""}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                {
                  label: "Total A/R",
                  value: showAgingSkeleton ? null : formatCurrency(agingTotal),
                  note: agingReport ? `${agingReport.rows.length} contracts` : "",
                  icon: "total",
                  iconClass: "bg-[#e3f2fd] text-[#1565c0]",
                },
                {
                  label: "Billed over 30 days ago",
                  value: showOverdueSkeleton ? null : formatCurrency(pastDueTotal),
                  note: agingTotal > 0 ? `${((pastDueTotal / agingTotal) * 100).toFixed(1)}% of A/R` : "",
                  icon: "late",
                  iconClass: "bg-[#fde7c4] text-[#8a4b00]",
                  late: true,
                },
                {
                  label: "Contracts with older A/R",
                  value: showOverdueSkeleton ? null : pastDueContracts.toLocaleString(),
                  of: agingReport ? `of ${agingReport.rows.length}` : "",
                  note:
                    agingReport && agingReport.rows.length > 0
                      ? `${((pastDueContracts / agingReport.rows.length) * 100).toFixed(1)}% of contracts`
                      : "",
                  icon: "doc",
                  iconClass: "bg-[#fde2e2] text-[#991b1b]",
                },
                {
                  label: "Over 90 days",
                  value: showAgingSkeleton ? null : formatCurrency(over90Total),
                  note: agingTotal > 0 ? `${((over90Total / agingTotal) * 100).toFixed(1)}% of A/R` : "",
                  icon: "old",
                  iconClass: "bg-[#dbe4f3] text-[#104281]",
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className={`flex min-w-0 items-start gap-2.5 rounded-[10px] border px-3.5 py-3 ${
                    k.late ? "border-[#f7dfb0] bg-[#fff4e5]" : "border-[var(--border-subtle)] bg-white"
                  }`}
                >
                  <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] ${k.iconClass}`} aria-hidden>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      {k.icon === "total" ? <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" /> : null}
                      {k.icon === "late" ? (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </>
                      ) : null}
                      {k.icon === "doc" ? (
                        <>
                          <path d="M14 3H6v18h12V7z" />
                          <path d="M14 3v4h4M9 13h6M9 17h4" />
                        </>
                      ) : null}
                      {k.icon === "old" ? <path d="M8 3v4M16 3v4M4 9h16M5 5h14v15H5z" /> : null}
                    </svg>
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <dt className="text-[12px] text-ink-muted">{k.label}</dt>
                    <dd className="flex min-w-0 flex-col">
                      {k.value == null ? (
                        <Skeleton className="my-0.5 h-6 w-24" />
                      ) : (
                        <span
                          className={`truncate text-[20px] font-semibold leading-[1.15] tabular-nums ${
                            k.late ? "text-[#8a4b00]" : "text-ink"
                          }`}
                        >
                          {k.value}
                          {k.of ? <span className="ml-1 text-[13px] font-medium text-ink-muted">{k.of}</span> : null}
                        </span>
                      )}
                      {k.value == null ? (
                        <Skeleton className="mt-1 h-3 w-16" />
                      ) : (
                        <span className="truncate text-[11.5px] text-ink-muted">{k.note}</span>
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Biggest older balance: the one contract most worth a call. */}
            {showOverdueSkeleton ? (
              <Skeleton className="h-[62px] w-full rounded-[10px]" />
            ) : biggestOlder ? (
              (() => {
                const sp = splitProjectName(biggestOlder.projectName ?? biggestOlder.contractId);
                const num = biggestOlder.internalProjectNumber ?? sp.number ?? biggestOlder.projectNumber;
                return (
                  <div className="flex items-center gap-3 rounded-[10px] border border-[#e3e9f3] bg-[#f7f9fc] px-3.5 py-[11px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#1565c0]">Biggest older balance</p>
                      <p className="text-[13px]">
                        <span className="font-semibold text-ink">
                          {num ? `${num} · ` : ""}
                          {sp.name}
                        </span>{" "}
                        <span className="text-[12px] text-ink-muted">
                          {allCompanies && biggestOlder.entityId != null ? `· ${COMPANY_SHORT[biggestOlder.entityId]} ` : ""}
                          {biggestOlder.leadPmName ? `· PM ${biggestOlder.leadPmName} ` : ""}·{" "}
                          <Link
                            href={`/billings/projects/${encodeURIComponent(biggestOlder.contractId)}`}
                            onClick={() => rememberList("overdue")}
                            className="font-medium text-[#1565c0] hover:underline"
                          >
                            Open →
                          </Link>
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold tabular-nums text-[#8a4b00]">{formatCurrency(biggestOlder.netDollars)}</p>
                      <p className="text-[11.5px] text-ink-muted">billed 30+ days ago</p>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>

          <AgingColumnsChart
            title={agingFiltered ? "A/R by age (filtered)" : "A/R by age"}
            columns={agingColumns}
            total={agingTotal}
            loading={showAgingSkeleton}
            height={200}
            caption={
              showAgingSkeleton ? (
                <Skeleton className="inline-block h-3.5 w-28 align-middle" />
              ) : (
                <>
                  Total <span className="font-semibold tabular-nums text-ink">{formatCurrency(agingTotal)}</span>
                </>
              )
            }
            bare
            unit="contract"
          />
          {agingReport || showAgingSkeleton ? (
            <BillingCompanyBreakdown
              entityIds={ALL_ENTITY_IDS}
              loading={showAgingSkeleton || showOverdueSkeleton}
              rows={agingReport?.rows ?? []}
              overdue={agingOverdue?.items ?? []}
              onPick={(id) => setCompanyId(String(id))}
              selectedId={allCompanies ? null : sitelineEntityId ?? null}
              onShowAll={() => setCompanyId(null)}
            />
          ) : null}
          </section>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          {/* Same tab strip as T&M Tags / Clearstory Settings / bid stages. */}
          <div className="box-border flex h-[52px] w-full shrink-0 items-center overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white px-1.5 shadow-[0_1px_2px_rgba(33,33,33,0.04)]">
            <div
              className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Billing views"
            >
              {(
                [
                  ...(CONTRACTS_PAYAPPS_TAB_ENABLED ? [{ value: "contracts" as const, label: "Contracts & Pay apps", count: null }] : []),
                  { value: "aging" as const, label: "A/R aging", count: agingReport ? agingReport.rows.length : null },
                  { value: "overdue" as const, label: "Past due", count: agingOverdue ? pastDueCount : null },
                ]
              ).map((t) => {
                const active = activeTab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(t.value)}
                    className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] leading-none transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/30 ${
                      active
                        ? "bg-[#DBEAFE] font-semibold text-[#1D4ED8]"
                        : "font-medium text-[#616161] hover:bg-[rgba(33,33,33,0.05)] hover:text-[#212121]"
                    }`}
                  >
                    {t.label}
                    {t.count != null ? (
                      <span className={`tabular-nums ${active ? "opacity-70" : "opacity-60"}`}>{t.count.toLocaleString()}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
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
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <span>Billing month</span>
                <input
                  type="month"
                  value={contractsFilters.month}
                  onChange={(e) =>
                    setContractsFilters((prev) => ({ ...prev, month: e.target.value }))
                  }
                  className="cs-field border px-2 text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <span>Contract status</span>
                <span className="relative inline-block">
                  <select
                    value={contractsFilters.contractStatus}
                    onChange={(e) =>
                      setContractsFilters((prev) => ({ ...prev, contractStatus: e.target.value }))
                    }
                    className="cs-field appearance-none border px-2 pr-6 text-xs"
                  >
                    <SortedOptions>
                      <option value="ALL" data-pin>Any</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </SortedOptions>
                  </select>
                  <SelectChevron />
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <span>Pay app status</span>
                <span className="relative inline-block">
                  <select
                    value={contractsFilters.payAppStatus}
                    onChange={(e) =>
                      setContractsFilters((prev) => ({ ...prev, payAppStatus: e.target.value }))
                    }
                    className="cs-field appearance-none border px-2 pr-6 text-xs"
                  >
                    <SortedOptions>
                      <option value="ALL" data-pin>Any</option>
                      <option value="SUBMITTED_SYNCED_PAID">Submitted / Synced / Paid</option>
                      <option value="DRAFT">Draft</option>
                    </SortedOptions>
                  </select>
                  <SelectChevron />
                </span>
              </label>
              <button
                type="button"
                onClick={loadContracts}
                className="ml-auto cs-soft-control h-8 px-3 text-xs"
              >
                Apply filters
              </button>
            </div>
            {(contractsLoading && contractsPage) && (
              <div className="mb-2 text-xs text-ink-muted">
                Refreshing contracts…
              </div>
            )}
            {contractsError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                {contractsError}
              </div>
            )}
            {contracts.length === 0 && !contractsError ? (
              <p className="py-6 text-sm text-ink-muted text-center">
                No contracts found for this filter.
              </p>
            ) : (
              <div className={BILLING_TABLE_SCROLL_WRAPPER}>
                <table className="w-full min-w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Contract / Internal #
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Project #
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Billing type
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-right">
                        Percent complete
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Latest pay app (month)
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
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
                          className="border-b border-[var(--border-subtle)] bg-white transition-colors last:border-0 even:bg-canvas/50 hover:bg-canvas"
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {row.internalProjectNumber ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {row.project?.projectNumber ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {row.billingType ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink">
                            {formatPercent(row.percentComplete)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {latestPayApp && start && end ? (
                              <div className="flex flex-col">
                                <span>
                                  {start.date} – {end.date}
                                </span>
                                <span className="cs-helper">
                                  {start.time} – {end.time}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {latestPayApp?.status ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px]">
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
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <span>Submitted in month</span>
                <input
                  type="month"
                  value={payAppsFilters.submittedInMonth}
                  onChange={(e) =>
                    setPayAppsFilters((prev) => ({ ...prev, submittedInMonth: e.target.value }))
                  }
                  className="cs-field border px-2 text-xs"
                />
              </label>
              <button
                type="button"
                onClick={loadPayApps}
                className="ml-auto cs-soft-control h-8 px-3 text-xs"
              >
                Apply filters
              </button>
            </div>
            {(payAppsLoading && payAppsPage) && (
              <div className="mb-2 text-xs text-ink-muted">
                Refreshing pay apps…
              </div>
            )}
            {payAppsError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                {payAppsError}
              </div>
            )}
            {payApps.length === 0 && !payAppsError ? (
              <p className="py-6 text-sm text-ink-muted text-center">
                No pay apps found for this filter.
              </p>
            ) : (
              <div className={BILLING_TABLE_SCROLL_WRAPPER}>
                <table className="w-full min-w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Pay app #
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Project / Contract
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Billing type
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Updated at
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payApps.map((row: SitelinePaginatedPayAppRow) => (
                      <tr
                        key={row.id}
                        className="border-b border-[var(--border-subtle)] bg-white transition-colors last:border-0 even:bg-canvas/50 hover:bg-canvas"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                          {row.payAppNumber ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                          {row.contract?.project?.projectNumber ?? "—"}{" "}
                          {row.contract?.internalProjectNumber
                            ? `· ${row.contract.internalProjectNumber}`
                            : ""}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                          {row.billingType ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                          {row.status ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                          {row.updatedAt ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px]">
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
              <div className="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2">
                <div className="relative w-full min-w-0 sm:w-80">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                  </span>
                  <label htmlFor="billing-aging-search" className="sr-only">
                    Search projects, PMs or numbers
                  </label>
                  <input
                    id="billing-aging-search"
                    type="search"
                    value={agingFilters.search ?? ""}
                    onChange={(e) => setAgingFilters((p) => ({ ...p, search: e.target.value }))}
                    placeholder="Search project, PM, numbers…"
                    autoComplete="off"
                    className="cs-field w-full pl-9 pr-3"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersPanel("aging")}
                  aria-haspopup="dialog"
                  className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5z" strokeLinejoin="round" />
                  </svg>
                  Filters
                  {agingFilterCount > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                      {agingFilterCount}
                    </span>
                  ) : null}
                </button>
                {agingFilterCount > 0 || agingFilters.search ? (
                  <button
                    type="button"
                    onClick={() => {
                      lastAgingSearch.current = "";
                      void clearAgingFiltersAndReload();
                    }}
                    className="text-[13px] font-medium text-brand-secondary hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null}
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
                <p className="shrink-0 py-8 text-center text-sm text-ink-muted">
                  No aging data yet. Data syncs every 10 minutes.
                </p>
              )}
              {!agingError && (showAgingSkeleton || (agingReport && agingReport.rows.length > 0)) && (
                <div className={BILLING_TABLE_FILL_SCROLL}>
                  <table className="w-full min-w-full border-collapse text-left">
                    <thead>
                      <tr>
                        <BillingSortableTh
                          label="Project"
                          sortKey="projectName"
                          sort={agingSort}
                          onSort={onAgingSort}
                          className="sticky left-0 z-20 w-[17rem] min-w-[17rem] max-w-[17rem] bg-canvas"
                        />
                        {allCompanies ? (
                          <BillingSortableTh label="Company" sortKey="entityId" sort={agingSort} onSort={onAgingSort} />
                        ) : null}
                        <BillingSortableTh label="PM" sortKey="leadPmName" sort={agingSort} onSort={onAgingSort} />
                        <BillingSortableTh
                          label="Invoice #"
                          sortKey="invoiceNumber"
                          sort={agingSort}
                          onSort={onAgingSort}
                          align="right"
                        />
                        <BillingSortableTh label="Invoice date" sortKey="invoiceDate" sort={agingSort} onSort={onAgingSort} />
                        {agingDisplayBuckets.map((b) => (
                          <BillingSortableTh
                            key={b}
                            label={SITELINE_AGING_DISPLAY_MAP[b] ?? b}
                            sortKey={`bucket:${b}`}
                            sort={agingSort}
                            onSort={onAgingSort}
                            align="right"
                          />
                        ))}
                        <BillingSortableTh
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
                          <tr key={`skeleton-${i}`} className="border-b border-[var(--border-subtle)] last:border-0">
                            {Array.from({ length: agingDisplayBuckets.length + (allCompanies ? 6 : 5) }, (_, j) => (
                              <td key={j} className="px-3 py-2.5">
                                <div className="h-3.5 w-full max-w-24 animate-pulse rounded bg-canvas" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      {!showAgingSkeleton &&
                        sortedAgingRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border-subtle)] bg-white transition-colors last:border-0 even:bg-canvas/50 hover:bg-canvas"
                        >
                          {(() => {
                            const p = splitProjectName(row.projectName);
                            return (
                              <td
                                title={row.projectName}
                                className="sticky left-0 z-10 w-[17rem] min-w-[17rem] max-w-[17rem] bg-white px-3 py-2 align-middle text-[13px] [tr:hover>&]:bg-canvas [tr:nth-child(even)>&]:bg-[#fafafa]"
                              >
                                {row.contractId ? (
                                  <Link
                                    href={`/billings/projects/${encodeURIComponent(row.contractId)}`}
                                    onClick={() => rememberList("aging")}
                                    className="block truncate font-medium text-ink hover:text-brand-secondary hover:underline"
                                  >
                                    {p.number ? <span className="tabular-nums">{p.number} · </span> : null}
                                    {p.name}
                                  </Link>
                                ) : (
                                  <span className="block truncate font-medium text-ink">
                                    {p.number ? <span className="tabular-nums">{p.number} · </span> : null}
                                    {p.name}
                                  </span>
                                )}
                                {p.detail ? <span className="cs-helper block truncate">{p.detail}</span> : null}
                              </td>
                            );
                          })()}
                          {allCompanies ? (
                            <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink-muted">
                              {row.entityId != null ? COMPANY_SHORT[row.entityId] : "—"}
                            </td>
                          ) : null}
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            <div className="flex flex-col">
                              <span>{row.leadPmName ?? "—"}</span>
                              {row.leadPmEmail && (
                                <a
                                  href={`mailto:${row.leadPmEmail}`}
                                  className="cs-helper hover:text-ink hover:underline"
                                >
                                  {row.leadPmEmail}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink tabular-nums">
                            {formatInvoiceNumber(row.invoiceNumber)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-left text-ink">
                            {formatInvoiceDate(row.invoiceDate)}
                          </td>
                          {agingDisplayBuckets.map((b) => {
                            const bucketValue = row.buckets[b as keyof typeof row.buckets];
                            return (
                              <td
                                key={b}
                                className={`whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right tabular-nums ${agingBucketCellClass(b, bucketValue, "text-ink")}`}
                              >
                                {formatAgingCurrency(bucketValue)}
                              </td>
                            );
                          })}
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right font-medium text-ink tabular-nums">
                            {formatAgingCurrency(row.projectTotal)}
                          </td>
                        </tr>
                      ))}
                      {!showAgingSkeleton && agingReport && (
                        <tr className="border-t-2 border-[var(--border-subtle)] bg-canvas font-semibold">
                          <td className="sticky left-0 z-10 w-[17rem] min-w-[17rem] max-w-[17rem] bg-canvas whitespace-nowrap px-3 py-2.5 align-middle text-[13px] ">
                            TOTALS
                          </td>
                          {allCompanies ? <td aria-hidden /> : null}
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink tabular-nums">
                            {/* PM column has no totals */}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink tabular-nums">
                            {/* Invoice # column has no totals */}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                            {/* Invoice date column has no totals */}
                          </td>
                          {agingDisplayBuckets.map((b) => {
                            const bucketTotal = agingReport.totals[b as keyof typeof agingReport.totals];
                            return (
                              <td
                                key={b}
                                className={`whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right tabular-nums ${agingBucketCellClass(b, bucketTotal, "text-ink")}`}
                              >
                                {formatAgingCurrency(bucketTotal)}
                              </td>
                            );
                          })}
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink tabular-nums">
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
                subtitle={`Pay apps at least ${overdueMinDays} days past due. Change the threshold in Filters.`}
              />
              <div className="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2">
                <div className="relative w-full min-w-0 sm:w-80">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                  </span>
                  <label htmlFor="billing-overdue-search" className="sr-only">
                    Search projects, PMs or numbers
                  </label>
                  <input
                    id="billing-overdue-search"
                    type="search"
                    value={overdueFilters.search ?? ""}
                    onChange={(e) => setOverdueFilters((p) => ({ ...p, search: e.target.value }))}
                    placeholder="Search project, PM, numbers…"
                    autoComplete="off"
                    className="cs-field w-full pl-9 pr-3"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersPanel("overdue")}
                  aria-haspopup="dialog"
                  className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5z" strokeLinejoin="round" />
                  </svg>
                  Filters
                  {overdueFilterCount > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                      {overdueFilterCount}
                    </span>
                  ) : null}
                </button>
                {overdueFilterCount > 0 || overdueFilters.search ? (
                  <button
                    type="button"
                    onClick={() => {
                      lastOverdueSearch.current = "";
                      void clearOverdueFiltersAndReload();
                    }}
                    className="text-[13px] font-medium text-brand-secondary hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null}
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
                  <p className="shrink-0 py-8 text-center text-sm text-ink-muted">
                    No pay apps at least {overdueMinDays} days past due (with current filters).
                  </p>
                )}
              {!agingOverdueError &&
                (showOverdueSkeleton || (agingOverdue && agingOverdue.items.length > 0)) && (
                  <div className={BILLING_TABLE_FILL_SCROLL}>
                    <table className="w-full min-w-full border-collapse text-left">
                      <thead>
                        <tr>
                          <BillingSortableTh label="Project" sortKey="projectName" sort={overdueSort} onSort={onOverdueSort} />
                          {allCompanies ? (
                            <BillingSortableTh label="Company" sortKey="entityId" sort={overdueSort} onSort={onOverdueSort} />
                          ) : null}
                          <BillingSortableTh
                            label="GC / Project #"
                            sortKey="projectNumber"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                          />
                          <BillingSortableTh label="PM" sortKey="leadPmName" sort={overdueSort} onSort={onOverdueSort} />
                          <BillingSortableTh label="Due date" sortKey="dueDate" sort={overdueSort} onSort={onOverdueSort} />
                          <BillingSortableTh
                            label="Days past due"
                            sortKey="daysPastDue"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <BillingSortableTh
                            label="Invoice #"
                            sortKey="invoiceNumber"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <BillingSortableTh
                            label="Invoice date"
                            sortKey="invoiceDate"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                          />
                          <BillingSortableTh
                            label="Net amount"
                            sortKey="netDollars"
                            sort={overdueSort}
                            onSort={onOverdueSort}
                            align="right"
                          />
                          <BillingSortableTh label="Status" sortKey="status" sort={overdueSort} onSort={onOverdueSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {showOverdueSkeleton &&
                          Array.from({ length: 8 }, (_, i) => (
                            <tr key={`skeleton-${i}`} className="border-b border-[var(--border-subtle)] last:border-0">
                              {Array.from({ length: allCompanies ? 10 : 9 }, (_, j) => (
                                <td key={j} className="px-3 py-2.5">
                                  <div className="h-3.5 w-full max-w-24 animate-pulse rounded bg-canvas" />
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
                              className="border-b border-[var(--border-subtle)] bg-white transition-colors last:border-0 even:bg-canvas/50 hover:bg-canvas"
                            >
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                                <div className="flex flex-col">
                                  {item.contractId ? (
                                    <Link
                                      href={`/billings/projects/${encodeURIComponent(item.contractId)}`}
                                      onClick={() => rememberList("overdue")}
                                      className="font-medium text-ink hover:text-brand-secondary hover:underline"
                                    >
                                      {item.projectName ?? "—"}
                                    </Link>
                                  ) : (
                                    <span>{item.projectName ?? "—"}</span>
                                  )}
                                  {item.internalProjectNumber && (
                                    <span className="cs-helper">
                                      {item.internalProjectNumber}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {allCompanies ? (
                                <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink-muted">
                                  {item.entityId != null ? COMPANY_SHORT[item.entityId] : "—"}
                                </td>
                              ) : null}
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                                {item.projectNumber ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                                <div className="flex flex-col">
                                  <span>{item.leadPmName ?? "—"}</span>
                                  {item.leadPmEmail && (
                                    <a
                                      href={`mailto:${item.leadPmEmail}`}
                                      className="cs-helper hover:text-ink hover:underline"
                                    >
                                      {item.leadPmEmail}
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
                                {due}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink tabular-nums">
                                {item.daysPastDue}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink tabular-nums">
                                {formatInvoiceNumber(item.invoiceNumber)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-left text-ink">
                                {invDate}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-right text-ink tabular-nums">
                                {formatAgingCurrency(item.netDollars)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink">
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
      {filtersPanel ? (
        <BillingFiltersDrawer
          mode={filtersPanel}
          value={filtersPanel === "aging" ? agingFilters : overdueFilters}
          defaults={filtersPanel === "aging" ? defaultAgingFilters : defaultOverdueFilters}
          onApply={applyPanelFilters}
          onClose={closeFiltersPanel}
        />
      ) : null}
    </div>
  );
}
