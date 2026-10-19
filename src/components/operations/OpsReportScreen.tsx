"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { defaultOpsDateRange, qty, tons } from "@/lib/operations/format";
import type { CostReportResponse, LeedReportRow } from "@/lib/operations/types";
import { AGGREGATE_FIELD_META, LEED_FIELD_META } from "@/lib/operations/types";
import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { OpsDateRange } from "@/components/operations/OpsDateRange";
import { CostReportTable, type CostSortKey } from "@/components/operations/CostReportTable";
import { sortRows, type SortDir, type SortValue } from "@/lib/sort";
import { StatTiles } from "@/components/reporting/StatTiles";
import {
  OPS_SHELL,
  OPS_TABLE_SCROLL,
} from "@/components/operations/tableScroll";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LoadingBar } from "@/components/ui/LoadingBar";

/** $455K / $1.21M for the header tiles; the table keeps exact amounts. */
function shortMoney(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/** Rows per page on paged cost reports. */
const REPORT_PAGE_SIZE = 50;

type CostRow = CostReportResponse["rows"][number];
type PageQuery = { from: string; to: string; page: number; pageSize: number; sortBy: CostSortKey; sortDir: SortDir };

/** An older backend ignores `page` and returns every row; sort and page it here until it is updated. */
function asReportPage(
  res: CostReportResponse,
  q: PageQuery,
  nameOf: (row: CostRow) => string
): CostReportResponse {
  if (res.total != null) return res;
  const value: Record<CostSortKey, (r: CostRow) => SortValue> = {
    name: (r) => nameOf(r),
    loads: (r) => r.loads,
    weightTons: (r) => r.weightTons,
    truckingCost: (r) => r.truckingCost,
    disposalCost: (r) => r.disposalCost,
    totalCost: (r) => r.totalCost,
  };
  const sorted = sortRows(res.rows, value[q.sortBy], q.sortDir);
  return {
    rows: sorted.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
    totals: res.totals,
    total: sorted.length,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export function CostReportScreen({
  title,
  nameHeader,
  nameOf,
  nameMaxWidth,
  load,
  loadPage,
}: {
  title: string;
  nameHeader: string;
  nameMaxWidth?: string;
  nameOf: (row: CostRow) => string;
  load: (q: { from: string; to: string }) => Promise<CostReportResponse>;
  /** When given, the report is paged and sorted on the server (50 rows per page). */
  loadPage?: (q: PageQuery) => Promise<CostReportResponse>;
}) {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [data, setData] = useState<CostReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paged mode: sort (Total, high → low, like the unpaged table) and page; a date or sort change goes back to page 1.
  const [sort, setSort] = useState<{ key: CostSortKey; dir: SortDir }>({ key: "totalCost", dir: "desc" });
  const toggleSort = (key: CostSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const filterKey = `${range.from}|${range.to}|${sort.key}|${sort.dir}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  // Only the paged report needs the name for its fallback sort; keep it out of the others' effect (it is a new function each render).
  const pageNameOf = loadPage ? nameOf : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q: PageQuery = { ...range, page, pageSize: REPORT_PAGE_SIZE, sortBy: sort.key, sortDir: sort.dir };
    void (loadPage && pageNameOf ? loadPage(q).then((res) => asReportPage(res, q, pageNameOf)) : load(range))
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load report"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, load, loadPage, pageNameOf, page, sort.key, sort.dir]);

  return (
    <OperationsChrome
      title={title}
      subtitle="Haul costs totaled by job, hauler, destination or LEED / aggregates, calculated the same way as the trucking spreadsheet."
      action={
        <StatTiles
          loading={loading && !data}
          items={[
            { label: "Loads", value: data ? data.totals.loads.toLocaleString() : "—" },
            { label: "Tons", value: data ? tons(data.totals.weightTons) : "—" },
            { label: "Trucking", value: data ? shortMoney(data.totals.truckingCost) : "—" },
            { label: "Disposal", value: data ? shortMoney(data.totals.disposalCost) : "—" },
            { label: "Total cost", value: data ? shortMoney(data.totals.totalCost) : "—" },
          ]}
        />
      }
      filters={<OpsDateRange from={range.from} to={range.to} onChange={setRange} />}
    >
      {loading && !data ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data ? (
        // Old numbers stay up while a new date range loads; the bar shows it is working (same as Estimates).
        <div className="relative">
          {loading ? <LoadingBar label="Loading report" /> : null}
          {loadPage ? (
            <CostReportTable
              data={data}
              nameHeader={nameHeader}
              nameOf={nameOf}
              nameMaxWidth={nameMaxWidth}
              serverSort={{ key: sort.key, dir: sort.dir, onToggle: toggleSort }}
              rowCount={data.total}
              footer={
                <ReportPager
                  page={data.page ?? 1}
                  totalPages={Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? REPORT_PAGE_SIZE)))}
                  total={data.total ?? 0}
                  noun={nameHeader.toLowerCase()}
                  busy={loading}
                  onPage={setPage}
                />
              }
            />
          ) : (
            <CostReportTable data={data} nameHeader={nameHeader} nameOf={nameOf} nameMaxWidth={nameMaxWidth} />
          )}
        </div>
      ) : null}
    </OperationsChrome>
  );
}

const PAGER_BTN =
  "cursor-pointer rounded-lg border border-ink/15 bg-surface px-3 py-1 text-[12.5px] font-medium text-ink transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50";

/** "Page X of Y · N jobs" with Previous / Next, under a paged cost report. */
function ReportPager({
  page,
  totalPages,
  total,
  noun,
  busy,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5">
      <span className="text-[12.5px] text-ink-muted">
        {`Page ${page} of ${totalPages} · ${total.toLocaleString()} ${noun}${total === 1 ? "" : "s"}`}
      </span>
      {totalPages > 1 ? (
        <span className="flex gap-2">
          <button type="button" className={PAGER_BTN} disabled={page <= 1 || busy} onClick={() => onPage(Math.max(1, page - 1))}>
            Previous
          </button>
          <button
            type="button"
            className={PAGER_BTN}
            disabled={page >= totalPages || busy}
            onClick={() => onPage(Math.min(totalPages, page + 1))}
          >
            Next
          </button>
        </span>
      ) : null}
    </div>
  );
}

/** Light-blue header like the other app tables; every cell pinned to the top. */
const LEED_TH =
  "sticky top-0 z-[2] whitespace-nowrap border-b border-[rgba(15,23,42,0.05)] bg-[var(--brand-tint)] px-3 py-2.5 text-[12px] font-semibold text-ink";

export function LeedReportScreen({
  load,
}: {
  load: (q: { from: string; to: string }) => Promise<LeedReportRow[]>;
}) {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [rows, setRows] = useState<LeedReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load(range)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load LEED report"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, load]);

  const qtyCols = [...LEED_FIELD_META, ...AGGREGATE_FIELD_META];

  return (
    <OperationsChrome
      title="LEED / aggregates by job"
      subtitle="Quantities only — not dollars."
      filters={<OpsDateRange from={range.from} to={range.to} onChange={setRange} />}
    >
      {loading && rows.length === 0 ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        <div className={`relative ${OPS_SHELL}`}>
          {loading ? <LoadingBar label="Loading LEED report" /> : null}
          <div className={OPS_TABLE_SCROLL}>
            <table className="min-w-[72rem] w-full border-separate border-spacing-0 text-left text-[12px]">
              <thead>
                {/* Each heading is pinned on its own (a pinned row doesn't carry a cell that is itself pinned left). */}
                <tr>
                  <th className={`${LEED_TH} left-0 z-[3] min-w-[18rem] text-left shadow-[1px_0_0_rgba(0,0,0,0.06)]`}>Job</th>
                  <th className={`${LEED_TH} text-right`}>Loads</th>
                  {qtyCols.map((c) => (
                    <th key={c.key} className={`${LEED_TH} text-right`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + qtyCols.length}
                      className="px-3 py-10 text-center text-ink/45"
                    >
                      No LEED / aggregate quantities in this range.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.jobNumber} className="hover:bg-brand/[0.04] [&>td]:border-b [&>td]:border-ink/[0.05]">
                      <td className="sticky left-0 z-[1] min-w-[18rem] max-w-[22rem] bg-white px-3 py-2 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
                        <p className="font-medium text-ink">{row.jobNumber}</p>
                        <p className="truncate text-[11px] text-ink/45" title={row.jobName ?? undefined}>
                          {row.jobName || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.loads}</td>
                      {qtyCols.map((c) => {
                        const raw = row[c.key as keyof LeedReportRow];
                        const n = typeof raw === "number" ? raw : null;
                        return (
                          <td
                            key={c.key}
                            className="px-3 py-2 text-right tabular-nums text-ink/70"
                          >
                            {qty(n)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2 text-[11px] text-ink/45">
            {rows.length.toLocaleString()} job{rows.length === 1 ? "" : "s"} · scroll horizontally
            for all quantity columns
          </div>
        </div>
      )}
    </OperationsChrome>
  );
}
