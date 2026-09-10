"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getSitelineReconciliationGaps,
  type SitelineReconciliationGapItem,
  type SitelineError,
} from "@/lib/api/endpoints/siteline";
import { getApiErrorMessage } from "@/lib/api/client";

function isSitelineError(value: unknown): value is SitelineError {
  return (
    value !== null &&
    typeof value === "object" &&
    ("error" in value || (value as SitelineError).configured === false)
  );
}

const GAP_LABELS: Record<string, string> = {
  NO_CLEARSTORY_PROJECT: "No Clearstory project",
  CLEARSTORY_EMPTY: "Clearstory project empty",
  NOT_COMPARABLE: "Not comparable",
};

type SitelineClearstoryGapsBannerProps = {
  entityId: number;
  className?: string;
  /** Reports this check's own loading state up so the page can fold it into ONE header
   * sync indicator instead of showing a second, disconnected loading pill here. */
  onLoadingChange?: (loading: boolean) => void;
};

export function SitelineClearstoryGapsBanner({
  entityId,
  className = "",
  onLoadingChange,
}: SitelineClearstoryGapsBannerProps) {
  const [items, setItems] = useState<SitelineReconciliationGapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSitelineReconciliationGaps({ entityId });
      if (isSitelineError(result)) {
        setItems([]);
        setError(
          (result as SitelineError).error ??
            (result as SitelineError).message ??
            "Could not load reconciliation gaps"
        );
      } else {
        setItems(result.items ?? []);
      }
    } catch (e) {
      setItems([]);
      setError(getApiErrorMessage(e, "Reconciliation gaps unavailable"));
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  if (loading) {
    // No pill here — the page's header sync indicator (isSyncing) already covers this
    // check via onLoadingChange, so there's exactly one "is anything syncing" signal.
    return null;
  }

  if (error) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`animate-[fade-in_200ms_ease] rounded-r-lg rounded-l-sm border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/60 px-4 py-3.5 dark:border-amber-900/60 dark:border-l-amber-500 dark:bg-amber-950/20 ${className}`}
      role="alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {items.length} project{items.length === 1 ? "" : "s"} with Siteline billing but no Clearstory match
          </p>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80">
            Ops is notified by email when the gap alert job runs. Review project / job numbers in Clearstory.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-white dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
          >
            {expanded ? "Hide list" : "Show list"}
          </button>
          <Link
            href="/clearstory/projects"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Open Clearstory
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200/70 bg-white/50 dark:border-amber-900/50 dark:bg-transparent">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-amber-200/80 text-amber-900/80 dark:border-amber-800">
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Job #</th>
                <th className="px-3 py-2 font-medium">PM</th>
                <th className="px-3 py-2 text-right font-medium">Net $</th>
                <th className="px-3 py-2 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 25).map((row) => (
                <tr
                  key={`${row.contractId}-${row.internalProjectNumber ?? row.projectName}`}
                  className="border-b border-amber-100/80 last:border-0 dark:border-amber-900/40"
                >
                  <td className="max-w-[200px] truncate px-3 py-2" title={row.projectName ?? undefined}>
                    {row.projectName ?? "—"}
                  </td>
                  <td className="px-3 py-2">{row.internalProjectNumber ?? row.projectNumber ?? "—"}</td>
                  <td className="px-3 py-2">{row.leadPmName ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.netDollars.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-3 py-2">{GAP_LABELS[row.gapReason] ?? row.gapReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 25 ? (
            <p className="px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
              Showing 25 of {items.length}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
