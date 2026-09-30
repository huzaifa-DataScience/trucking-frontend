"use client";

import type { ProductionReport } from "@/lib/bidding/production-types";
import { fmtProductionHours } from "@/lib/bidding/production-types";
import { ProductionStatusBadge } from "./ProductionStatusBadge";
import { PROD_WARM } from "./productionChartTheme";

type Col = {
  key: string;
  label: string;
  value: number | null;
  fill: string;
  soft: string;
};

/** Rounded pill columns — Warm brand labor hours */
export function ProductionHoursCompareChart({
  report,
}: {
  report: ProductionReport;
}) {
  const { totals, connecteam, jobNumber } = report;
  const actual = totals.actualHours;
  const onSite = totals.hoursEstimatedFromReceived ?? 0;
  const estimate = totals.hoursEstimatedMike ?? 0;

  const cols: Col[] = [
    {
      key: "mike",
      label: "Full estimate",
      value: estimate,
      fill: PROD_WARM.estimate,
      soft: PROD_WARM.estimateSoft,
    },
    {
      key: "site",
      label: "On site",
      value: onSite > 0 ? onSite : null,
      fill: PROD_WARM.onSite,
      soft: PROD_WARM.onSiteSoft,
    },
    {
      key: "work",
      label: "Worked",
      value: actual,
      fill: PROD_WARM.worked,
      soft: PROD_WARM.workedSoft,
    },
  ];

  const max = Math.max(
    1,
    ...cols.map((c) => (c.value != null && c.value > 0 ? c.value : 0))
  );

  const subtitle = [
    jobNumber || connecteam.jobNumber || connecteam.jobLabel,
    connecteam.shiftCount != null
      ? `${connecteam.shiftCount.toLocaleString()} shifts`
      : null,
    (totals.workerCount ?? connecteam.workerCount) != null
      ? `${(totals.workerCount ?? connecteam.workerCount)!.toLocaleString()} workers`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-[18px] border border-ink/[0.08] bg-surface p-4 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">Labor hours</h3>
          <p className="mt-0.5 text-xs text-ink/45">
            Rounded pill bars
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <ProductionStatusBadge status={totals.status} />
      </div>

      <div className="grid h-[190px] grid-cols-3 items-end gap-3">
        {cols.map((col) => {
          const empty = col.value == null || col.value <= 0;
          const pct = empty
            ? 0
            : Math.max(6, Math.round((col.value! / max) * 100));
          return (
            <div
              key={col.key}
              className="flex h-full flex-col items-center justify-end gap-2"
            >
              <span
                className={`text-[12px] font-extrabold tabular-nums ${
                  empty ? "text-ink/30" : "text-ink"
                }`}
              >
                {empty ? "—" : fmtProductionHours(col.value)}
              </span>
              <div className="flex w-full max-w-[52px] flex-1 items-end overflow-hidden rounded-full bg-[#eef2f7] p-[3px]">
                <div
                  className="w-full rounded-full"
                  style={{
                    height: empty ? 8 : `${pct}%`,
                    minHeight: 8,
                    background: empty
                      ? "#cbd5e1"
                      : `linear-gradient(180deg, ${col.soft}, ${col.fill})`,
                    opacity: empty ? 0.55 : 1,
                  }}
                />
              </div>
              <span className="text-center text-[11px] font-semibold leading-tight text-ink/50">
                {col.label.includes(" ") ? (
                  <>
                    {col.label.split(" ")[0]}
                    <br />
                    {col.label.split(" ").slice(1).join(" ")}
                  </>
                ) : (
                  col.label
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
