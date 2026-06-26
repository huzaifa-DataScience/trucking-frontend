"use client";

import { useBidSheet } from "@/contexts/BidSheetContext";
import { BidResultMetric } from "@/components/bidding/BidResultMetric";
import { BID_SYSTEM_LABELS } from "@/lib/bidding/constants";
import { num } from "@/lib/bidding/computed";
import { formatMoney, formatMoneyPrecise, formatPercentDecimal } from "@/lib/bidding/format";
import {
  parseLaborBuildUp,
  parseSystemsComputed,
} from "@/lib/bidding/parse-computed";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { RestrictedState } from "@/components/ui/RestrictedState";

function HeroEstimate({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: string;
  sub: string;
  variant: "mike" | "pj";
}) {
  return (
    <div
      className={`flex-1 rounded-xl px-3 py-3 ${
        variant === "pj"
          ? "bg-brand/15 ring-1 ring-brand/25"
          : "bg-white/10 ring-1 ring-white/10"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold tracking-tight text-white lg:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-white/50">{sub}</p>
    </div>
  );
}

export function BidSheetResultsRail({
  computed,
  hasComputed,
  hoursPerWeek,
}: {
  computed: Record<string, unknown>;
  hasComputed: boolean;
  hoursPerWeek: number | null;
}) {
  const { insights } = useBidSheet();
  const { can } = usePermission();
  const canViewSummary = can(PERMISSIONS.biddingSummary);
  const laborBuildUp = parseLaborBuildUp(computed);
  const systemsComputed = parseSystemsComputed(computed).filter((r) => r.used);

  const delta = insights.pjEstimate - insights.mikeEstimate;
  const deltaPct =
    insights.mikeEstimate > 0 ? ((delta / insights.mikeEstimate) * 100).toFixed(1) : "0";
  const deltaCaution = Math.abs(Number(deltaPct)) > 12;

  return (
    <aside
      className={`bid-results-rail bid-rail-enter flex min-h-0 flex-col gap-3 ${
        insights.isRecalculating ? "bid-recalc-pulse" : ""
      }`}
      aria-label="Bid calculation results"
    >
      {!canViewSummary ? (
        <RestrictedState
          title="Totals restricted"
          message="MIKE/PJ totals and calculation detail require additional access."
          permission="bidding:summary"
        />
      ) : null}

      {canViewSummary ? (
      <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-gradient-to-br from-ink via-ink to-ink/95 shadow-[0_8px_32px_rgba(1,1,1,0.12)]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
              Live totals
            </p>
            {insights.isRecalculating ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-brand">
                Updating…
              </span>
            ) : hasComputed ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            ) : (
              <span className="text-[10px] text-white/35">Awaiting calculate</span>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <HeroEstimate
              label="MIKE"
              value={hasComputed ? formatMoney(insights.mikeEstimate) : "—"}
              sub={hasComputed ? `${formatMoney(insights.costPerHourMike)}/hr` : "H48"}
              variant="mike"
            />
            <HeroEstimate
              label="PJ"
              value={hasComputed ? formatMoney(insights.pjEstimate) : "—"}
              sub={hasComputed ? `${formatMoney(insights.costPerHourPj)}/hr` : "H47"}
              variant="pj"
            />
          </div>

          {hasComputed ? (
            <div
              className={`rounded-lg px-3 py-2 text-center text-xs font-medium ${
                deltaCaution
                  ? "bg-amber-400/20 text-amber-100"
                  : "bg-emerald-400/15 text-emerald-100"
              }`}
            >
              PJ vs MIKE: {delta >= 0 ? "+" : ""}
              {formatMoney(delta)} ({delta >= 0 ? "+" : ""}
              {deltaPct}%)
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
              <span>Bid progress</span>
              <span>{insights.completionPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-brand to-brand-secondary transition-all duration-700 ease-out ${
                  insights.isRecalculating ? "bid-shimmer-bar" : ""
                }`}
                style={{ width: `${insights.completionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {canViewSummary ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.05)]">
        <div className="border-b border-ink/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Calculation detail</h2>
          <p className="mt-0.5 text-xs text-ink/45">Excel rows 37–49 · D10–D13</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          {!hasComputed ? (
            <p className="px-2 py-8 text-center text-sm text-ink/45">
              Run Preview or Save & calculate to populate results.
            </p>
          ) : (
            <div className="bid-stagger divide-y divide-ink/[0.06]">
              <section className="py-2">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand/80">
                  Labor build-up
                </p>
                {laborBuildUp ? (
                  <>
                    <BidResultMetric
                      label="Composite / hr"
                      excelRef="D10"
                      value={formatMoneyPrecise(laborBuildUp.compositePerHour)}
                    />
                    <BidResultMetric
                      label="Parking / hr"
                      excelRef="D11"
                      value={formatMoneyPrecise(laborBuildUp.parkingPerHour)}
                    />
                    <BidResultMetric
                      label="Lifts / hr"
                      excelRef="D12"
                      value={formatMoneyPrecise(laborBuildUp.liftsPerHour)}
                    />
                    <BidResultMetric
                      label="Loaded / hr"
                      excelRef="D13"
                      value={formatMoneyPrecise(laborBuildUp.totalPerHourWithParkingAndLifts)}
                      emphasis
                    />
                    <BidResultMetric
                      label="Total lift $"
                      excelRef="J7"
                      value={formatMoneyPrecise(laborBuildUp.totalLiftProject)}
                    />
                  </>
                ) : null}
              </section>

              <section className="py-2">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand/80">
                  Summary
                </p>
                <BidResultMetric
                  label="Labor hours"
                  excelRef="H37"
                  value={String(num(computed, "labor.totalHours"))}
                  emphasis
                />
                <BidResultMetric
                  label="Materials"
                  excelRef="H42"
                  value={formatMoneyPrecise(num(computed, "labor.totalMaterials"))}
                />
                <BidResultMetric
                  label="Before margin / hr"
                  excelRef="I45"
                  value={formatMoneyPrecise(num(computed, "baseBid.costPerHourBeforeMargin"))}
                />
                <BidResultMetric
                  label="Margin / hr"
                  excelRef="I46"
                  value={formatMoneyPrecise(num(computed, "baseBid.marginPerHour"))}
                />
                <BidResultMetric
                  label="Margin"
                  value={formatPercentDecimal(
                    num(computed, "baseBid.marginPercent") ||
                      (insights.marginPercent as number)
                  )}
                />
                <BidResultMetric
                  label="Total margin $"
                  excelRef="H46"
                  value={formatMoneyPrecise(num(computed, "baseBid.totalMarginDollars"))}
                />
                <BidResultMetric
                  label="Hours / week"
                  excelRef="F6"
                  value={hoursPerWeek != null ? String(hoursPerWeek) : "—"}
                />
                <BidResultMetric
                  label="Man-hours"
                  excelRef="H8"
                  value={String(num(computed, "labor.manHoursPeriod"))}
                />
                <BidResultMetric
                  label="Escalation factor"
                  excelRef="H11"
                  value={String(num(computed, "labor.materialEscalationFactor"))}
                />
                <BidResultMetric
                  label="Sales tax"
                  excelRef="H13"
                  value={`${(num(computed, "labor.salesTaxPercent") * 100).toFixed(1)}%`}
                />
              </section>

              {systemsComputed.length > 0 ? (
                <section className="py-2">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand/80">
                    By system
                  </p>
                  {systemsComputed.map((row) => (
                    <BidResultMetric
                      key={row.key}
                      label={BID_SYSTEM_LABELS[row.key]}
                      excelRef="row 45"
                      value={formatMoneyPrecise(row.subtotal)}
                    />
                  ))}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
      ) : null}
    </aside>
  );
}
