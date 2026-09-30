"use client";

import { useMemo } from "react";
import type { ProductionReportLine } from "@/lib/bidding/production-types";
import {
  commodityChartLabel,
  fmtProductionHours,
} from "@/lib/bidding/production-types";
import { PROD_WARM } from "./productionChartTheme";

/** Rounded commodity on-site bars — Warm brand; empty state when all zero */
export function ProductionCommodityHoursChart({
  lines,
}: {
  lines: ProductionReportLine[];
}) {
  const rows = useMemo(() => {
    const sorted = [...lines].sort(
      (a, b) =>
        (b.hoursEstimatedFromReceived ?? 0) -
        (a.hoursEstimatedFromReceived ?? 0)
    );
    return sorted.slice(0, 6).map((line) => ({
      key: line.commodityKey,
      label: commodityChartLabel(line),
      hours: line.hoursEstimatedFromReceived ?? 0,
    }));
  }, [lines]);

  const max = Math.max(1, ...rows.map((r) => r.hours));
  const hasAny = rows.some((r) => r.hours > 0);

  return (
    <section className="rounded-[18px] border border-ink/[0.08] bg-surface p-4 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-ink">Commodity hours on site</h3>
        <p className="mt-0.5 text-xs text-ink/45">
          Top lines by material-on-site hours
        </p>
      </div>

      {!hasAny ? (
        <div className="flex min-h-[168px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-ink/[0.12] bg-[#f4f6f9] px-5 py-8 text-center">
          <p className="text-[13px] font-semibold text-ink">
            No material on site yet
          </p>
          <p className="max-w-[15rem] text-xs text-ink/45">
            Link a Trimble job to show rounded on-site hour bars by commodity.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {rows
            .filter((r) => r.hours > 0)
            .map((row) => (
              <div
                key={row.key}
                className="rounded-[14px] bg-[#f4f6f9] px-3 py-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-ink">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-ink">
                    {fmtProductionHours(row.hours)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#e8edf3]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(
                        6,
                        Math.round((row.hours / max) * 100)
                      )}%`,
                      background: `linear-gradient(90deg, ${PROD_WARM.estimate}, ${PROD_WARM.estimateSoft})`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
