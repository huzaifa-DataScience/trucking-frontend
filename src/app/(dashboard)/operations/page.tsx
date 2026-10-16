"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as opsApi from "@/lib/api/endpoints/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  DisposalRateCard,
  HaulerRateCard,
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

export default function OperationsHaulLogPage() {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [jobNumber, setJobNumber] = useState("");
  const [haulerRateId, setHaulerRateId] = useState("");
  const [disposalRateId, setDisposalRateId] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<OperationsHaul[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void opsApi
      .listHauls({
        from: range.from,
        to: range.to,
        jobNumber: jobNumber.trim() || undefined,
        haulerRateId: haulerRateId ? Number(haulerRateId) : undefined,
        disposalRateId: disposalRateId ? Number(disposalRateId) : undefined,
      })
      .then((next) => {
        if (!cancelled) setRows(next);
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
  }, [range, jobNumber, haulerRateId, disposalRateId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [
        r.jobNumber,
        r.jobName,
        r.haulerLabel,
        r.disposalLabel,
        r.goelTicketNumber,
        r.haulingTicketNumber,
        r.disposalTicketNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    let trucking = 0;
    let disposal = 0;
    let total = 0;
    for (const r of filtered) {
      if (typeof r.truckingCost === "number") trucking += r.truckingCost;
      if (typeof r.disposalCost === "number") disposal += r.disposalCost;
      if (typeof r.totalCost === "number") total += r.totalCost;
    }
    return { trucking, disposal, total, loads: filtered.length };
  }, [filtered]);

  return (
    <OperationsChrome
      title="Haul log"
      subtitle="Daily trips from the Trucking Record. Costs are painted from the API."
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
        <SummaryChip label="Loads" value={String(totals.loads)} />
        <SummaryChip label="Trucking" value={money(totals.trucking)} />
        <SummaryChip label="Disposal" value={money(totals.disposal)} />
        <SummaryChip label="Total" value={money(totals.total)} emphasis />
      </div>

      {loading && rows.length === 0 ? (
        <TableSkeleton rows={10} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        <HaulLogTable rows={filtered} />
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
