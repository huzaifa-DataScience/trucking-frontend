"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as opsApi from "@/lib/api/endpoints/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  DisposalRateCard,
  HaulerRateCard,
  HaulsPage,
  OperationsHaul,
} from "@/lib/operations/types";
import { defaultOpsDateRange, money } from "@/lib/operations/format";
import {
  OperationsChrome,
  opsBtnPrimary,
  opsFieldClass,
} from "@/components/operations/OperationsChrome";
import { OpsDateRange } from "@/components/operations/OpsDateRange";
import { HaulLogTable } from "@/components/operations/HaulLogTable";
import { OPS_SHELL } from "@/components/operations/tableScroll";
import { SortedOptions } from "@/components/ui/SortedOptions";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LoadingBar } from "@/components/ui/LoadingBar";

/** Hauls per page (server-side). */
const HAULS_PAGE_SIZE = 50;

/**
 * An older backend ignores `page` and returns the whole list; page it here so the screen still works
 * until that backend is updated.
 */
function asHaulsPage(res: HaulsPage | OperationsHaul[], page: number): HaulsPage {
  if (!Array.isArray(res)) return res;
  const sum = (k: "truckingCost" | "disposalCost" | "totalCost") =>
    res.reduce((t, r) => t + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
  return {
    items: res.slice((page - 1) * HAULS_PAGE_SIZE, page * HAULS_PAGE_SIZE),
    total: res.length,
    page,
    pageSize: HAULS_PAGE_SIZE,
    totals: { loads: res.length, truckingCost: sum("truckingCost"), disposalCost: sum("disposalCost"), totalCost: sum("totalCost") },
  };
}

export default function OperationsHaulLogPage() {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [jobNumber, setJobNumber] = useState("");
  const [haulerRateId, setHaulerRateId] = useState("");
  const [disposalRateId, setDisposalRateId] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<HaulsPage | null>(null);
  const [haulers, setHaulers] = useState<HaulerRateCard[]>([]);
  const [disposals, setDisposals] = useState<DisposalRateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      opsApi.listHaulerRates().catch(() => [] as HaulerRateCard[]),
      opsApi.listDisposalRates().catch(() => [] as DisposalRateCard[]),
    ]).then(([h, d]) => {
      setHaulers(h);
      setDisposals(d);
    });
  }, []);

  // Typing in Job # / Search waits a moment before asking the server (one request, not one per key).
  const [jobNumberQuery, setJobNumberQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setJobNumberQuery(jobNumber.trim());
      setSearchQuery(search.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [jobNumber, search]);

  // Any filter change starts again at page 1.
  const filterKey = `${range.from}|${range.to}|${jobNumberQuery}|${haulerRateId}|${disposalRateId}|${searchQuery}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void opsApi
      .listHaulsPage({
        from: range.from,
        to: range.to,
        jobNumber: jobNumberQuery || undefined,
        haulerRateId: haulerRateId ? Number(haulerRateId) : undefined,
        disposalRateId: disposalRateId ? Number(disposalRateId) : undefined,
        search: searchQuery || undefined,
        page,
        pageSize: HAULS_PAGE_SIZE,
      })
      .then((next) => {
        if (!cancelled) setData(asHaulsPage(next, page));
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load haul log"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, jobNumberQuery, haulerRateId, disposalRateId, searchQuery, page]);

  // Totals come from the server and cover every matching haul, not just this page.
  const totals = data?.totals ?? { loads: 0, truckingCost: 0, disposalCost: 0, totalCost: 0 };
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <OperationsChrome
      title="Haul log"
      subtitle="Every trucking trip, with its trucking and disposal cost."
      action={
        <Link href="/operations/hauls/new" className={opsBtnPrimary}>
          Add haul
        </Link>
      }
      filters={
        <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-end">
          <OpsDateRange from={range.from} to={range.to} onChange={setRange} />
          <label className="flex min-w-[8.5rem] flex-col gap-1">
            <span className="text-[11px] font-medium text-ink/45">Job #</span>
            <input
              className={opsFieldClass}
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Filter"
            />
          </label>
          <label className="flex min-w-[11rem] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-ink/45">Hauler</span>
            <select
              className={opsFieldClass}
              value={haulerRateId}
              onChange={(e) => setHaulerRateId(e.target.value)}
            >
              <SortedOptions>
                <option value="">All haulers</option>
                {haulers.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </SortedOptions>
            </select>
          </label>
          <label className="flex min-w-[11rem] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-ink/45">Destination</span>
            <select
              className={opsFieldClass}
              value={disposalRateId}
              onChange={(e) => setDisposalRateId(e.target.value)}
            >
              <SortedOptions>
                <option value="">All destinations</option>
                {disposals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </SortedOptions>
            </select>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-ink/45">Search</span>
            <input
              className={opsFieldClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ticket, job, hauler…"
            />
          </label>
        </div>
      }
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryChip label="Loads" value={totals.loads.toLocaleString()} />
        <SummaryChip label="Trucking" value={money(totals.truckingCost)} />
        <SummaryChip label="Disposal" value={money(totals.disposalCost)} />
        <SummaryChip label="Total" value={money(totals.totalCost)} emphasis />
      </div>

      {loading && !data ? (
        <TableSkeleton rows={10} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        // Rows stay on screen while a filter change reloads; the bar shows it is working (same as Estimates).
        <div className="relative">
          {loading ? <LoadingBar label="Loading hauls" /> : null}
          <HaulLogTable rows={data?.items ?? []} />
          {data && data.total > 0 ? (
            <div className="mt-2 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-ink/45">
                {`Page ${data.page} of ${totalPages} (${data.total.toLocaleString()} hauls)`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, data.page - 1))}
                  disabled={data.page <= 1 || loading}
                  className="cursor-pointer rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, data.page + 1))}
                  disabled={data.page >= totalPages || loading}
                  className="cursor-pointer rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </OperationsChrome>
  );
}

function SummaryChip({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`${OPS_SHELL} px-3.5 py-2.5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${
          emphasis ? "text-base font-semibold text-ink" : "text-[14px] font-medium text-ink/80"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
