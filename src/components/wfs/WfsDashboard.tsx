"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as wfsApi from "@/lib/api/endpoints/wfs";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { canSeeWfs } from "@/lib/auth/roles";
import { formatMoney, formatDate } from "@/lib/bidding/format";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { Skeleton, SkeletonStatRow, SkeletonTableRows } from "@/components/ui/Skeleton";
import { WfsChartsSection } from "@/components/wfs/WfsCharts";
import type {
  WfsAgingLine,
  WfsAgingSide,
  WfsCashRow,
  WfsCharts,
  WfsCompanyKey,
  WfsCompanyRow,
  WfsDashboard,
  WfsKpi,
  WfsStaticItem,
  WfsStatus,
} from "@/lib/wfs/types";

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatMoney(n);
}

function moneyCell(
  n: number | null | undefined,
  opts?: { emphasize?: boolean; mutedNull?: boolean }
): string {
  if (n == null || !Number.isFinite(n)) return opts?.mutedNull === false ? "$0" : "—";
  return formatMoney(n);
}

function KpiDelta({ kpi }: { kpi: WfsKpi | undefined }) {
  if (!kpi || kpi.delta == null) return null;
  const up = kpi.delta > 0;
  const down = kpi.delta < 0;
  const color = up
    ? "text-emerald-700"
    : down
      ? "text-danger"
      : "text-ink/45";
  const sign = up ? "+" : "";
  const pct =
    kpi.deltaPct == null
      ? null
      : `${kpi.deltaPct > 0 ? "+" : ""}${(kpi.deltaPct * 100).toFixed(1)}%`;
  return (
    <p className={`mt-1 text-[11px] font-semibold ${color}`}>
      {sign}
      {money(kpi.delta)}
      {pct ? <span className="ml-1 opacity-70">({pct})</span> : null}
    </p>
  );
}

function dayKey(raw: string | null | undefined): string {
  return String(raw ?? "").slice(0, 10);
}

function collectTrendDates(charts: WfsCharts | null | undefined): string[] {
  if (!charts) return [];
  const set = new Set<string>();
  for (const series of [
    charts.equityCash,
    charts.equityByCompany,
    charts.arByCompany,
    charts.apByCompany,
  ]) {
    for (const row of series ?? []) {
      const d = dayKey((row as { date?: string }).date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
    }
  }
  return Array.from(set).sort();
}

function inDateRange(
  date: string | null | undefined,
  from: string,
  to: string
): boolean {
  const d = dayKey(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** Trend series only — latest-snapshot charts stay unfiltered. */
function filterChartsByDate(
  charts: WfsCharts | null | undefined,
  from: string,
  to: string
): WfsCharts | null | undefined {
  if (!charts || (!from && !to)) return charts;
  const keep = <T extends { date?: string }>(rows: T[] | undefined): T[] =>
    (rows ?? []).filter((r) => inDateRange(r.date, from, to));
  return {
    ...charts,
    equityCash: keep(charts.equityCash),
    equityByCompany: keep(charts.equityByCompany),
    arByCompany: keep(charts.arByCompany),
    apByCompany: keep(charts.apByCompany),
    arVsAp: charts.arVsAp ?? [],
    arAging: charts.arAging ?? [],
  };
}

type DetailMode =
  | { kind: "aging"; company: WfsCompanyKey; side: WfsAgingSide; label: string }
  | { kind: "cash" }
  | { kind: "static" }
  | null;

const KPI_ORDER: {
  key: keyof WfsDashboard["kpis"];
  label: string;
}[] = [
  { key: "totalEquity", label: "Total Equity" },
  { key: "availableCash", label: "Available Cash" },
  { key: "totalAr", label: "Total AR" },
  { key: "totalAp", label: "Total AP" },
  { key: "netArAp", label: "Net AR–AP" },
];

const COLS: { key: keyof WfsCompanyRow | "label"; label: string; align?: "left" }[] = [
  { key: "label", label: "Company", align: "left" },
  { key: "bank", label: "Bank" },
  { key: "pnotes", label: "P-Notes" },
  { key: "locLimit", label: "LOC" },
  { key: "borrowing", label: "Borrowing" },
  { key: "availCredit", label: "Avail Credit" },
  { key: "otherLoans", label: "Other Loans" },
  { key: "totalDebt", label: "Total Debt" },
  { key: "ar", label: "AR" },
  { key: "ap", label: "AP" },
  { key: "netArAp", label: "Net AR–AP" },
  { key: "availCash", label: "Avail Cash" },
  { key: "equity", label: "Equity" },
];

export function WfsDashboard() {
  const { user } = useAuth();
  // FRONTEND_WFS.md — plate is super_admin only (not admin / wfs:read).
  const canRead = canSeeWfs(user?.role);
  const canWrite = canRead && can(user, PERMISSIONS.wfsWrite);

  const [status, setStatus] = useState<WfsStatus | null>(null);
  const [data, setData] = useState<WfsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailMode>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [chartFrom, setChartFrom] = useState("");
  const [chartTo, setChartTo] = useState("");

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [st, dash] = await Promise.all([
        wfsApi.getWfsStatus().catch(() => null),
        wfsApi.getWfsDashboard(),
      ]);
      setStatus(st);
      setData(dash);
      const dates = collectTrendDates(dash.charts);
      if (dates.length) {
        setChartFrom((prev) => prev || dates[0]!);
        setChartTo((prev) => prev || dates[dates.length - 1]!);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load WFS dashboard"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const trendDates = useMemo(
    () => collectTrendDates(data?.charts),
    [data?.charts]
  );
  const filteredCharts = useMemo(
    () => filterChartsByDate(data?.charts, chartFrom, chartTo),
    [data?.charts, chartFrom, chartTo]
  );

  const resetChartDates = () => {
    if (!trendDates.length) {
      setChartFrom("");
      setChartTo("");
      return;
    }
    setChartFrom(trendDates[0]!);
    setChartTo(trendDates[trendDates.length - 1]!);
  };

  useEffect(() => {
    void load();
  }, [load]);

  const runSnapshot = async () => {
    if (!canWrite) return;
    setSnapshotBusy(true);
    setSnapshotMsg(null);
    setError(null);
    try {
      const result = await wfsApi.postWfsSnapshot();
      if (result && typeof result === "object" && "kpis" in result) {
        setData(result as WfsDashboard);
      } else {
        await load();
      }
      setSnapshotMsg("Snapshot saved for today");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to write snapshot"));
    } finally {
      setSnapshotBusy(false);
    }
  };

  if (!canRead) {
    return (
      <RestrictedState
        title="WFS restricted"
        message="Company financial health is available to Super admin only."
        permission="super_admin"
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-5 bid-animate-in">
        <Skeleton className="h-8 w-64" />
        <SkeletonStatRow />
        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface">
          <SkeletonTableRows rows={8} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-6">
        <p className="text-sm font-medium text-danger">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="w-fit rounded-xl border border-ink/10 px-3 py-1.5 text-sm font-semibold text-ink/70 hover:bg-ink/[0.03]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const missing =
    status?.missing?.length
      ? status.missing
      : data.sources?.missing?.length
        ? data.sources.missing
        : [];
  const foundationOk = status?.foundation ?? data.sources?.foundation ?? true;
  const plaidOk = status?.plaid ?? data.sources?.plaid ?? true;

  return (
    <div className="flex flex-col gap-5 bid-animate-in">
      <PageHeader
        title={data.title || "WFS"}
        subtitle={
          [
            data.subtitle,
            data.asOf ? `As of ${formatDate(data.asOf)}` : null,
            data.cadence,
            data.nextSnapshotDate
              ? `Next snapshot ${formatDate(data.nextSnapshotDate)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDetail({ kind: "cash" })}
              className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
            >
              Bank / Cash
            </button>
            {canWrite ? (
              <>
                <button
                  type="button"
                  onClick={() => setDetail({ kind: "static" })}
                  className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
                >
                  Settings
                </button>
                <button
                  type="button"
                  disabled={snapshotBusy}
                  onClick={() => void runSnapshot()}
                  className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/15 disabled:opacity-40"
                  title="Write / overwrite today’s History Log row"
                >
                  {snapshotBusy ? "Snapshot…" : "Snapshot"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Refresh
            </button>
          </div>
        }
      />

      {!foundationOk || !plaidOk || missing.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-50/60 px-4 py-3 text-sm text-ink/70">
          <p className="font-semibold text-ink/80">Source status</p>
          <p className="mt-1 text-xs text-ink/55">
            Foundation: {foundationOk ? "ok" : "down"} · Plaid:{" "}
            {plaidOk ? "ok" : "down"}
            {missing.length > 0 ? ` · Missing: ${missing.join(", ")}` : ""}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}
      {snapshotMsg ? (
        <p className="text-sm text-ink/55">{snapshotMsg}</p>
      ) : null}
      {data.comparedTo?.asOf ? (
        <p className="text-xs text-ink/45">
          KPI Δ vs snapshot {formatDate(data.comparedTo.asOf)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink/[0.08] bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Trend date range
          </p>
          <p className="mt-0.5 text-xs text-ink/50">
            Filters History Log charts only (Equity/Cash, Equity by company, AR
            &amp; AP trends). Live plate / latest snapshot charts stay as-of.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink/45">From</span>
          <input
            type="date"
            value={chartFrom}
            min={trendDates[0]}
            max={chartTo || trendDates[trendDates.length - 1]}
            onChange={(e) => setChartFrom(e.target.value)}
            className="rounded-lg border border-ink/10 bg-canvas/40 px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink/45">To</span>
          <input
            type="date"
            value={chartTo}
            min={chartFrom || trendDates[0]}
            max={trendDates[trendDates.length - 1]}
            onChange={(e) => setChartTo(e.target.value)}
            className="rounded-lg border border-ink/10 bg-canvas/40 px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <button
          type="button"
          onClick={resetChartDates}
          className="rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/65 transition hover:bg-ink/[0.03]"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_ORDER.map(({ key, label }) => {
          const kpi = data.kpis[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-ink/[0.08] bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                {label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tracking-tight text-ink">
                {money(kpi?.value)}
              </p>
              <KpiDelta kpi={kpi} />
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
        <div className="border-b border-ink/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Companies</h2>
          <p className="text-xs text-ink/45">
            Click AR / AP totals for aging detail. Bank opens cash.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
            <thead className="bg-ink/[0.03] text-[10px] font-semibold uppercase tracking-wide text-ink/50">
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={`whitespace-nowrap px-2.5 py-2.5 ${
                      c.align === "left" ? "text-left" : "text-right"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.companies.map((row) => (
                <tr
                  key={row.key}
                  className="border-t border-ink/[0.05] hover:bg-ink/[0.02]"
                >
                  <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-ink">
                    {row.label}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <button
                      type="button"
                      className="font-mono text-brand hover:underline"
                      onClick={() => setDetail({ kind: "cash" })}
                      title="Open cash / bank detail"
                    >
                      {moneyCell(row.bank)}
                    </button>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.pnotes)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.locLimit)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.borrowing)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.availCredit)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.otherLoans)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-semibold text-ink">
                    {moneyCell(row.totalDebt)}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    {row.ar == null ? (
                      <span className="text-ink/30">—</span>
                    ) : (
                      <button
                        type="button"
                        className="font-mono text-brand hover:underline"
                        onClick={() =>
                          setDetail({
                            kind: "aging",
                            company: row.key,
                            side: "ar",
                            label: `${row.label} AR`,
                          })
                        }
                      >
                        {moneyCell(row.ar)}
                      </button>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    {row.ap == null ? (
                      <span className="text-ink/30">—</span>
                    ) : (
                      <button
                        type="button"
                        className="font-mono text-brand hover:underline"
                        onClick={() =>
                          setDetail({
                            kind: "aging",
                            company: row.key,
                            side: "ap",
                            label: `${row.label} AP`,
                          })
                        }
                      >
                        {moneyCell(row.ap)}
                      </button>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.netArAp)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/80">
                    {moneyCell(row.availCash)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-semibold text-ink">
                    {moneyCell(row.equity)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink/15 bg-ink/[0.04] font-semibold">
                <td className="whitespace-nowrap px-2.5 py-2.5 text-ink">
                  GROUP TOTAL
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.bank)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.pnotes)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.locLimit)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.borrowing)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.availCredit)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.otherLoans)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.totalDebt)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.ar)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.ap)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.netArAp)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.availCash)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono">
                  {moneyCell(data.totals.equity)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          <h2 className="text-sm font-semibold text-ink">G3 property</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Value
              </dt>
              <dd className="mt-0.5 font-mono font-semibold text-ink">
                {money(data.property?.value)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Eval date
              </dt>
              <dd className="mt-0.5 text-ink/80">
                {data.property?.evaluationDate
                  ? formatDate(data.property.evaluationDate)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Debt
              </dt>
              <dd className="mt-0.5 font-mono text-ink/80">
                {money(data.property?.debt)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Cash held
              </dt>
              <dd className="mt-0.5 font-mono text-ink/80">
                {money(data.property?.cashHeld)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Net equity
              </dt>
              <dd className="mt-0.5 font-mono font-semibold text-ink">
                {money(data.property?.netEquity)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                Share of group
              </dt>
              <dd className="mt-0.5 font-mono text-ink/80">
                {data.property?.shareOfGroupEquity == null
                  ? "—"
                  : `${(data.property.shareOfGroupEquity * 100).toFixed(1)}%`}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          <h2 className="text-sm font-semibold text-ink">AR / AP aging</h2>
          <p className="text-xs text-ink/45">By company — click a row for lines</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs">
              <thead className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-1.5 py-1.5 text-left">Company</th>
                  <th className="px-1.5 py-1.5 text-left">Type</th>
                  <th className="px-1.5 py-1.5 text-right">Current</th>
                  <th className="px-1.5 py-1.5 text-right">31+</th>
                  <th className="px-1.5 py-1.5 text-right">61+</th>
                  <th className="px-1.5 py-1.5 text-right">90+</th>
                  <th className="px-1.5 py-1.5 text-right">Ret.</th>
                  <th className="px-1.5 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.aging ?? []).map((a) => (
                  <tr
                    key={`${a.companyKey}-${a.type}`}
                    className="border-t border-ink/[0.05] cursor-pointer hover:bg-ink/[0.02]"
                    onClick={() =>
                      setDetail({
                        kind: "aging",
                        company: a.companyKey,
                        side: a.type,
                        label: `${a.label} ${a.type.toUpperCase()}`,
                      })
                    }
                  >
                    <td className="px-1.5 py-1.5 font-medium text-ink">
                      {a.label}
                    </td>
                    <td className="px-1.5 py-1.5 uppercase text-ink/50">
                      {a.type}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {moneyCell(a.current)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {moneyCell(a.d31)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {moneyCell(a.d61)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {moneyCell(a.d90)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {moneyCell(a.retainage)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono font-semibold text-brand">
                      {moneyCell(a.total)}
                    </td>
                  </tr>
                ))}
                {(data.aging ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-1.5 py-4 text-center text-ink/40"
                    >
                      No aging rows
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <WfsChartsSection charts={filteredCharts} />

      {detail ? (
        <WfsDetailDrawer
          detail={detail}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}

function WfsDetailDrawer({
  detail,
  canWrite,
  onClose,
  onSaved,
}: {
  detail: Exclude<DetailMode, null>;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const title =
    detail.kind === "aging"
      ? detail.label
      : detail.kind === "cash"
        ? "Bank / Cash (Plaid)"
        : "WFS settings (static knobs)";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 flex w-[min(36rem,96vw)] flex-col border-l border-ink/[0.08] bg-surface shadow-[-12px_0_40px_-12px_rgba(1,1,1,0.3)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/[0.08] px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink/40 transition hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {detail.kind === "aging" ? (
            <AgingDetail company={detail.company} side={detail.side} />
          ) : null}
          {detail.kind === "cash" ? <CashDetail /> : null}
          {detail.kind === "static" ? (
            <StaticDetail canWrite={canWrite} onSaved={onSaved} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function AgingDetail({
  company,
  side,
}: {
  company: WfsCompanyKey;
  side: WfsAgingSide;
}) {
  const [rows, setRows] = useState<WfsAgingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void wfsApi
      .getWfsAging({ company, side })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((e) => {
        if (!cancelled)
          setError(getApiErrorMessage(e, "Failed to load aging lines"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company, side]);

  if (loading) return <SkeletonTableRows rows={6} />;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (rows.length === 0)
    return <p className="text-sm text-ink/50">No lines for this bucket.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={String(r.id ?? i)}
          className="rounded-xl border border-ink/[0.06] bg-canvas/40 px-3 py-2.5"
        >
          <p className="text-sm font-semibold text-ink">
            {String(
              r.invoiceNumber ||
                r.vendor ||
                r.customer ||
                r.label ||
                `Line ${i + 1}`
            )}
          </p>
          <p className="mt-1 font-mono text-sm text-ink/70">
            {money(typeof r.total === "number" ? r.total : r.amount)}
            {r.dueDate ? (
              <span className="ml-2 text-xs text-ink/40">
                due {formatDate(String(r.dueDate))}
              </span>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CashDetail() {
  const [rows, setRows] = useState<WfsCashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void wfsApi
      .getWfsCash()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((e) => {
        if (!cancelled)
          setError(getApiErrorMessage(e, "Failed to load cash"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <SkeletonTableRows rows={5} />;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (rows.length === 0)
    return <p className="text-sm text-ink/50">No Plaid cash rows.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={String(r.id ?? i)}
          className="flex items-start justify-between gap-3 rounded-xl border border-ink/[0.06] bg-canvas/40 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {String(r.label || r.accountName || `Account ${i + 1}`)}
            </p>
            <p className="text-xs text-ink/45">
              {[r.institution, r.companyKey, r.asOf ? formatDate(String(r.asOf)) : null]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          <p className="shrink-0 font-mono text-sm font-semibold text-ink">
            {money(r.balance)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function StaticDetail({
  canWrite,
  onSaved,
}: {
  canWrite: boolean;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<WfsStaticItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void wfsApi
      .getWfsStatic()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        const next: Record<number, string> = {};
        for (const it of list) next[it.id] = String(it.amount ?? "");
        setDrafts(next);
      })
      .catch((e) => {
        if (!cancelled)
          setError(getApiErrorMessage(e, "Failed to load static knobs"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const payload = items
        .map((it) => {
          const raw = drafts[it.id];
          const amount = Number(raw);
          if (!Number.isFinite(amount) || amount === it.amount) return null;
          return { id: it.id, amount };
        })
        .filter(Boolean) as { id: number; amount: number }[];
      if (payload.length === 0) {
        setOkMsg("No changes");
        return;
      }
      const next = await wfsApi.patchWfsStatic(payload);
      setItems(next.length ? next : items.map((it) => {
        const hit = payload.find((p) => p.id === it.id);
        return hit ? { ...it, amount: hit.amount } : it;
      }));
      setOkMsg("Saved");
      onSaved();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonTableRows rows={6} />;
  if (error && items.length === 0)
    return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink/50">
        Edit amounts only — kinds are fixed by the backend.
      </p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-3 rounded-xl border border-ink/[0.06] bg-canvas/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {it.label || it.kind}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-ink/40">
                {it.kind}
                {it.companyKey ? ` · ${it.companyKey}` : ""}
              </p>
            </div>
            <input
              type="number"
              step="any"
              disabled={!canWrite || saving}
              value={drafts[it.id] ?? ""}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [it.id]: e.target.value }))
              }
              className="w-36 rounded-lg border border-ink/10 bg-surface px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-brand disabled:opacity-50"
            />
          </li>
        ))}
      </ul>
      {canWrite ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save knobs"}
        </button>
      ) : (
        <p className="text-xs text-ink/45">Read only — needs wfs:write</p>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {okMsg ? <p className="text-sm text-ink/55">{okMsg}</p> : null}
    </div>
  );
}
