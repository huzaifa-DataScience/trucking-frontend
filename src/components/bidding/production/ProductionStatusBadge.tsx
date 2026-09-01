"use client";

import type { ProductionStatus } from "@/lib/bidding/production-types";

/** On track / Over hours / No clock data — FRONTEND_PRODUCTION_REPORT.md §4.2 */
export function ProductionStatusBadge({
  status,
}: {
  status: ProductionStatus;
}) {
  if (status === "green") {
    return (
      <span className="inline-flex rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800">
        On track
      </span>
    );
  }
  if (status === "red") {
    return (
      <span className="inline-flex rounded-lg border border-danger/30 bg-danger-tint px-3 py-1 text-xs font-bold tracking-wide text-danger">
        Over hours
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-lg border border-ink/15 bg-ink/[0.04] px-3 py-1 text-xs font-bold tracking-wide text-ink/60">
      No clock data
    </span>
  );
}
