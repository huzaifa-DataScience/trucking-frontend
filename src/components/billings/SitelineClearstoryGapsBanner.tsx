"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getSitelineReconciliationGaps,
  type SitelineReconciliationGapItem,
  type SitelineError,
} from "@/lib/api/endpoints/siteline";
import { getApiErrorMessage } from "@/lib/api/client";
import { LogoLoader } from "@/components/ui/LogoLoader";

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
};

export function SitelineClearstoryGapsBanner({
  entityId,
  className = "",
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

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100 ${className}`}
      >
        <LogoLoader size={20} />
        <span>Checking Siteline vs Clearstory data…</span>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
      role="alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {items.length} project{items.length === 1 ? "" : "s"} with Siteline billing but no Clearstory match
          </p>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80">
            Ops is notified by email when the gap alert job runs. Review project / job numbers in Clearstory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs font-medium text-amber-900 underline hover:no-underline dark:text-amber-200"
        >
          {expanded ? "Hide list" : "Show list"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-amber-200/80 text-amber-900/80 dark:border-amber-800">
                <th className="py-1.5 pr-3 font-medium">Project</th>
                <th className="py-1.5 pr-3 font-medium">Job #</th>
                <th className="py-1.5 pr-3 font-medium">PM</th>
                <th className="py-1.5 pr-3 font-medium text-right">Net $</th>
                <th className="py-1.5 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 25).map((row) => (
                <tr
                  key={`${row.contractId}-${row.internalProjectNumber ?? row.projectName}`}
                  className="border-b border-amber-100/80 dark:border-amber-900/40"
                >
                  <td className="py-1.5 pr-3 max-w-[200px] truncate" title={row.projectName ?? undefined}>
                    {row.projectName ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3">{row.internalProjectNumber ?? row.projectNumber ?? "—"}</td>
                  <td className="py-1.5 pr-3">{row.leadPmName ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {row.netDollars.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="py-1.5">{GAP_LABELS[row.gapReason] ?? row.gapReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 25 ? (
            <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
              Showing 25 of {items.length}.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-xs">
        <Link href="/clearstory/projects" className="font-medium text-amber-900 underline dark:text-amber-200">
          Open Clearstory projects
        </Link>
      </p>
    </div>
  );
}
