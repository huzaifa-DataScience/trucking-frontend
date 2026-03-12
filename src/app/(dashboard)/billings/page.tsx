"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "@/lib/api/endpoints/siteline";
import { ContractDetailModal } from "@/components/billings/ContractDetailModal";
import { PayAppDetailModal } from "@/components/billings/PayAppDetailModal";

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

  const [activeTab, setActiveTab] = useState<"contracts" | "aging">(
    CONTRACTS_PAYAPPS_TAB_ENABLED ? "contracts" : "aging"
  );

  const [agingReport, setAgingReport] = useState<AgingReportResponse | null>(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingError, setAgingError] = useState<string | null>(null);

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

  const loadAgingReport = useCallback(async () => {
    if (!configured) return;
    setAgingLoading(true);
    setAgingError(null);
    try {
      const result = await getSitelineAgingReport();
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
  }, [configured]);

  useEffect(() => {
    if (configured && CONTRACTS_PAYAPPS_TAB_ENABLED) {
      loadContracts();
      loadPayApps();
    }
  }, [configured, loadContracts, loadPayApps]);

  useEffect(() => {
    if (configured && activeTab === "aging") {
      loadAgingReport();
    }
  }, [configured, activeTab, loadAgingReport]);

  const initialLoading =
    statusLoading ||
    (CONTRACTS_PAYAPPS_TAB_ENABLED &&
      activeTab === "contracts" &&
      !contractsPage &&
      contractsLoading) ||
    (CONTRACTS_PAYAPPS_TAB_ENABLED &&
      activeTab === "contracts" &&
      !payAppsPage &&
      payAppsLoading);
  const topError = statusError;

  const contracts = contractsPage?.contracts ?? [];
  const payApps = payAppsPage?.payApps ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Billings
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Siteline construction billing — contracts, schedule of values, and pay applications.
        </p>
      </div>

      {initialLoading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {!statusLoading && !configured && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader title="Siteline not configured" subtitle={status?.message ?? "Billing is not available."} />
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Set SITELINE_API_URL and SITELINE_API_TOKEN in the backend .env to enable construction billing.
          </p>
          <button
            type="button"
            onClick={refetchStatus}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
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

      {!initialLoading && configured && (
        <>
          {company && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Company: <span className="font-medium text-stone-700 dark:text-stone-300">{company.name}</span>
            </p>
          )}

          <div className="flex gap-1 border-b border-stone-200 dark:border-stone-700">
            {CONTRACTS_PAYAPPS_TAB_ENABLED && (
              <button
                type="button"
                onClick={() => setActiveTab("contracts")}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "contracts"
                    ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100 border border-stone-200 border-b-0 dark:border-stone-700"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                }`}
              >
                Contracts & Pay apps
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("aging")}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "aging"
                  ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100 border border-stone-200 border-b-0 dark:border-stone-700"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              A/R Aging
            </button>
          </div>

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
              <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1 sm:mx-0 sm:px-0">
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
                              className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
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
              <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1 sm:mx-0 sm:px-0">
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
                            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
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
            <Card>
              <CardHeader
                title="A/R Aging"
                subtitle="Net dollars by project and days past due. Data syncs every 10 minutes."
              />
              {agingLoading && (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              )}
              {agingError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {agingError}
                  <button
                    type="button"
                    onClick={loadAgingReport}
                    className="ml-3 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!agingLoading && !agingError && agingReport && agingReport.rows.length === 0 && (
                <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                  No aging data yet. Data syncs every 10 minutes.
                </p>
              )}
              {!agingLoading && !agingError && agingReport && agingReport.rows.length > 0 && (
                <div className="overflow-x-auto overflow-y-auto max-h-96 -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-700">
                        <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                          Project
                        </th>
                        {agingReport.buckets.map((b) => (
                          <th key={b} className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-stone-600 dark:text-stone-400">
                            {b}
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-stone-600 dark:text-stone-400">
                          Project Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingReport.rows.map((row, i) => (
                        <tr key={i} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-stone-900 dark:bg-stone-900 dark:text-stone-100">
                            {row.projectName}
                          </td>
                          {agingReport.buckets.map((b) => (
                            <td key={b} className="px-3 py-2 text-right text-stone-800 dark:text-stone-200 tabular-nums">
                              {formatAgingCurrency(row.buckets[b])}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-medium text-stone-800 dark:text-stone-200 tabular-nums">
                            {formatAgingCurrency(row.projectTotal)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-stone-300 bg-stone-50 font-semibold dark:border-stone-600 dark:bg-stone-800/50">
                        <td className="sticky left-0 z-10 bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                          TOTALS
                        </td>
                        {agingReport.buckets.map((b) => (
                          <td key={b} className="px-3 py-2 text-right text-stone-900 dark:text-stone-100 tabular-nums">
                            {formatAgingCurrency(agingReport.totals[b])}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatAgingCurrency(agingReport.totals.projectTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
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
