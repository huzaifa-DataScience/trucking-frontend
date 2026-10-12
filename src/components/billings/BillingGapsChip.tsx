"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getSitelineReconciliationGaps,
  type SitelineReconciliationGapItem,
} from "@/lib/api/endpoints/siteline";

const COMPANY_SHORT: Record<number, string> = { 1: "GOEL", 2: "GOEL DC", 3: "DCB" };

const GAP_LABELS: Record<string, string> = {
  NO_CLEARSTORY_PROJECT: "No Clearstory project",
  CLEARSTORY_EMPTY: "Clearstory project empty",
  NOT_COMPARABLE: "Not comparable",
};

type GapRow = SitelineReconciliationGapItem & { entityId: number };

/**
 * Header chip for "billed in Siteline but no matching Clearstory project". Loads the gaps for
 * every company on screen, shows nothing when there are none, and opens the list in a dropdown
 * (search Clearstory for the job #, or open the billing project). Replaces the full-width banner.
 */
export function BillingGapsChip({ entityIds }: { entityIds: number[] }) {
  const [rows, setRows] = useState<GapRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const key = entityIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = key.split(",").map(Number);
    void Promise.all(
      ids.map((entityId) =>
        getSitelineReconciliationGaps({ entityId })
          .then((r) => ("items" in r && Array.isArray(r.items) ? r.items : []).map((it) => ({ ...it, entityId })))
          .catch(() => [] as GapRow[])
      )
    ).then((parts) => !cancelled && setRows(parts.flat()));
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!rows || rows.length === 0) return null;
  const multi = entityIds.length > 1;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[12.5px] font-medium text-amber-900 transition-colors hover:bg-amber-100"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[11px] font-bold text-white" aria-hidden>
          !
        </span>
        {rows.length} not in Clearstory
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Projects billed in Siteline with no matching Clearstory project"
          className="absolute right-0 top-full z-30 mt-2 w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
        >
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">
              {rows.length === 1
                ? "1 project is billed in Siteline but has no matching project in Clearstory"
                : `${rows.length} projects are billed in Siteline but have no matching project in Clearstory`}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Usually the job number differs between the two systems.</p>
          </div>
          <ul className="max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto" role="list">
            {rows.slice(0, 25).map((row) => {
              const job = row.internalProjectNumber ?? row.projectNumber;
              return (
                <li key={`${row.entityId}-${row.contractId}-${job ?? row.projectName}`} className="px-4 py-2.5 text-[13px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 truncate font-medium text-ink" title={row.projectName ?? undefined}>
                      {row.projectName ?? job ?? "—"}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">
                      {row.netDollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                    {multi ? <span className="font-medium">{COMPANY_SHORT[row.entityId]}</span> : null}
                    {job ? <span>Job {job}</span> : null}
                    {row.leadPmName ? <span>PM {row.leadPmName}</span> : null}
                    <span>{GAP_LABELS[row.gapReason] ?? row.gapReason}</span>
                    <span className="ml-auto flex gap-3">
                      {job ? (
                        <Link
                          href={`/clearstory/projects?search=${encodeURIComponent(String(job))}`}
                          className="font-medium text-amber-900 hover:underline"
                        >
                          Search Clearstory for {job}
                        </Link>
                      ) : null}
                      {row.contractId ? (
                        <Link
                          href={`/billings/projects/${encodeURIComponent(row.contractId)}`}
                          className="font-medium text-brand-secondary hover:underline"
                        >
                          Open billing project →
                        </Link>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {rows.length > 25 ? (
            <p className="border-t border-[var(--border-subtle)] px-4 py-2 text-[12px] text-ink-muted">Showing 25 of {rows.length}.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
