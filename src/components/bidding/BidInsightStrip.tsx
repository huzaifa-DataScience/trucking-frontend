"use client";

import { formatMoney, formatPercent } from "@/lib/bidding/mock-data";
import type { BidInsights } from "@/lib/bidding/types";

function InsightCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "neutral" | "positive" | "caution";
}) {
  const accentBar =
    accent === "brand"
      ? "bg-brand"
      : accent === "positive"
        ? "bg-emerald-500"
        : accent === "caution"
          ? "bg-amber-500"
          : "bg-ink/15";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.05)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} aria-hidden />
      <p className="pl-2 text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="pl-2 mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
      {sub ? <p className="pl-2 mt-1 text-xs text-ink/45">{sub}</p> : null}
    </div>
  );
}

export function BidInsightStrip({ insights }: { insights: BidInsights }) {
  const delta = insights.pjEstimate - insights.mikeEstimate;
  const deltaPct =
    insights.mikeEstimate > 0 ? ((delta / insights.mikeEstimate) * 100).toFixed(1) : "0";

  return (
    <div
      className={`bid-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-5 ${
        insights.isRecalculating ? "opacity-90" : ""
      }`}
    >
      <InsightCard
        label="MIKE estimate"
        value={formatMoney(insights.mikeEstimate)}
        sub={`${formatMoney(insights.costPerHourMike)}/hr`}
        accent="neutral"
      />
      <InsightCard
        label="PJ estimate"
        value={formatMoney(insights.pjEstimate)}
        sub={`${formatMoney(insights.costPerHourPj)}/hr`}
        accent="brand"
      />
      <InsightCard
        label="PJ vs MIKE"
        value={`${delta >= 0 ? "+" : ""}${formatMoney(delta)}`}
        sub={`${delta >= 0 ? "+" : ""}${deltaPct}% — alignment check`}
        accent={Math.abs(Number(deltaPct)) > 12 ? "caution" : "positive"}
      />
      <InsightCard
        label="Margin"
        value={formatPercent(insights.marginPercent)}
        sub={`Wage total ${formatMoney(insights.wageTotal)}`}
        accent="neutral"
      />
      <div className="relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.05)]">
        <div className="absolute left-0 top-0 h-full w-1 bg-brand/60" aria-hidden />
        <p className="pl-2 text-[10px] font-semibold uppercase tracking-wider text-ink/40">
          Bid progress
        </p>
        <div className="pl-2 mt-3 flex items-end justify-between gap-2">
          <p className="text-2xl font-bold text-ink">{insights.completionPercent}%</p>
          {insights.isRecalculating ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-brand">
              Updating…
            </span>
          ) : null}
        </div>
        <div className="pl-2 mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-brand to-brand-secondary transition-all duration-700 ease-out ${
              insights.isRecalculating ? "bid-shimmer-bar" : ""
            }`}
            style={{ width: `${insights.completionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
