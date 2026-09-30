"use client";

import { useMemo } from "react";
import type { ProductionReportLine } from "@/lib/bidding/production-types";
import {
  commodityChartLabel,
  fmtProductionHours,
} from "@/lib/bidding/production-types";
import { PROD_WARM } from "./productionChartTheme";

/** Paired rounded Est / Site tracks — Warm brand */
export function ProductionCommodityEstChart({
  lines,
}: {
  lines: ProductionReportLine[];
}) {
  const rows = useMemo(() => {
    const sorted = [...lines].sort(
      (a, b) => (b.hoursEstimated ?? 0) - (a.hoursEstimated ?? 0)
    );
    return sorted.slice(0, 5).map((line) => ({
      key: line.commodityKey,
      label: commodityChartLabel(line),
      hoursMike: line.hoursEstimated ?? 0,
      hoursRecv: line.hoursEstimatedFromReceived ?? 0,
    }));
  }, [lines]);

  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.hoursMike, r.hoursRecv])
  );

  return (
    <section className="rounded-[18px] border border-ink/[0.08] bg-surface p-4 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-ink">Full est vs on site</h3>
        <p className="mt-0.5 text-xs text-ink/45">
          Paired rounded gradients — labels stay readable
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/40">No commodities</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const siteEmpty = row.hoursRecv <= 0;
            return (
              <div
                key={row.key}
                className="rounded-[14px] bg-[#f4f6f9] px-3 py-2.5"
              >
                <p className="mb-2 text-[12px] font-bold text-ink">{row.label}</p>
                <div className="grid gap-1.5">
                  <div className="grid grid-cols-[36px_1fr_40px] items-center gap-2 text-[11px] text-ink/50">
                    <span>Est</span>
                    <div className="h-[9px] overflow-hidden rounded-full bg-[#e8edf3]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(
                            4,
                            Math.round((row.hoursMike / max) * 100)
                          )}%`,
                          background: `linear-gradient(90deg, ${PROD_WARM.estimate}, ${PROD_WARM.estimateSoft})`,
                        }}
                      />
                    </div>
                    <span className="text-right font-extrabold tabular-nums text-ink">
                      {fmtProductionHours(row.hoursMike)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[36px_1fr_40px] items-center gap-2 text-[11px] text-ink/50">
                    <span>Site</span>
                    <div className="h-[9px] overflow-hidden rounded-full bg-[#e8edf3]">
                      {!siteEmpty ? (
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(
                              4,
                              Math.round((row.hoursRecv / max) * 100)
                            )}%`,
                            background: `linear-gradient(90deg, ${PROD_WARM.onSite}, ${PROD_WARM.onSiteSoft})`,
                          }}
                        />
                      ) : null}
                    </div>
                    <span
                      className={`text-right font-extrabold tabular-nums ${
                        siteEmpty ? "text-ink/30" : "text-ink"
                      }`}
                    >
                      {siteEmpty ? "—" : fmtProductionHours(row.hoursRecv)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
