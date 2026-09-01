"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as productionApi from "@/lib/api/endpoints/biddingProduction";
import { getApiErrorMessage } from "@/lib/api/client";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ProductionHubSkeleton } from "@/components/bidding/MikeModuleSkeletons";
import type { ProductionReportListRow } from "@/lib/bidding/production-types";

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Production list — GET /production-reports (one row per bid, already merged).
 * Do not use GET /estimation-files here.
 */
export function ProductionHubPage() {
  const { canRead } = useBiddingAccess();
  const router = useRouter();
  const [rows, setRows] = useState<ProductionReportListRow[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productionApi.listProductionReports({
        q: search || undefined,
        limit: 200,
      });
      setRows(res.rows ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load production list"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <RestrictedState
        title="Access required"
        message="You do not have permission to open Production."
        permission={PERMISSIONS.biddingRead}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Production</h1>
          <p className="mt-1 text-sm text-ink/50">
            One row per bid — backend already merges every Mike file on that
            bid. Not Base Bid.
          </p>
        </div>
        <form
          className="flex w-full max-w-sm gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search job #, estimate #…"
            className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand sm:w-72"
          />
          <button
            type="submit"
            className="rounded-xl border border-ink/10 bg-surface px-3 py-2.5 text-sm font-semibold text-ink/70"
          >
            Search
          </button>
        </form>
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <ProductionHubSkeleton />
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 bg-canvas/40 px-6 py-20 text-center">
          <h3 className="text-base font-semibold text-ink">
            Upload Mike + generate Specs on a bid first
          </h3>
          <p className="max-w-md text-sm text-ink/50">
            Production list comes from{" "}
            <code className="text-xs">GET /production-reports</code> — one
            combined takeoff per bid.
          </p>
          <Link
            href="/estimation-files"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          >
            Estimation files
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/[0.08] text-[10px] uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-semibold">Estimate #</th>
                <th className="px-4 py-3 font-semibold">Bid name</th>
                <th className="px-4 py-3 font-semibold">Job #</th>
                <th className="min-w-[12rem] px-4 py-3 font-semibold">
                  Files (combined)
                </th>
                <th className="px-4 py-3 font-semibold">Specs ready?</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {rows.map((row) => {
                const canOpen =
                  Boolean(row.fileCount > 0) && row.specLineCount > 0;
                return (
                  <tr
                    key={row.bidId}
                    className={
                      canOpen
                        ? "cursor-pointer hover:bg-ink/[0.02]"
                        : "opacity-60"
                    }
                    onClick={() => {
                      if (canOpen) {
                        router.push(`/production/${row.bidId}`);
                      }
                    }}
                    title={
                      canOpen
                        ? "Open production report (combined takeoff)"
                        : "Generate Specs from Mike first"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {row.estimateNumber ?? `Bid ${row.bidId}`}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {row.bidName ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">
                      {row.jobNumber ?? "—"}
                    </td>
                    <td className="max-w-[18rem] px-4 py-3 text-ink/60">
                      <span className="font-medium text-ink/80">
                        {row.fileCount}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink/45">
                        {(row.fileNames ?? []).join(", ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {row.specLineCount > 0
                        ? `Yes (${row.specLineCount})`
                        : "No"}
                    </td>
                    <td className="px-4 py-3 text-ink/50">
                      {fmtWhen(row.latestUploadAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
