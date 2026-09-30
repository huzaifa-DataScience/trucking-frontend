"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ProductionReport } from "@/lib/bidding/production-types";
import { fmtProductionHours } from "@/lib/bidding/production-types";
import { PROD_WARM } from "./productionChartTheme";

/** Donut + legend tiles — Warm brand rounded mix */
export function ProductionHoursMixDonut({
  report,
}: {
  report: ProductionReport;
}) {
  const { totals } = report;
  const estimate = totals.hoursEstimatedMike ?? 0;
  const onSite = totals.hoursEstimatedFromReceived ?? 0;
  const worked = totals.actualHours;
  const hasOnSite = onSite > 0;
  const hasWorked = worked != null;

  const tiles = [
    {
      key: "estimate",
      name: "Full job estimate",
      value: estimate,
      fill: PROD_WARM.estimate,
      empty: false,
    },
    {
      key: "onSite",
      name: "Material on site",
      value: onSite,
      fill: PROD_WARM.onSite,
      empty: !hasOnSite,
    },
    {
      key: "worked",
      name: "Hours worked",
      value: worked ?? 0,
      fill: PROD_WARM.worked,
      empty: !hasWorked,
    },
  ];

  const pieData = tiles
    .filter((t) => !t.empty && t.value > 0)
    .map((t) => ({ ...t }));

  // Keep a visible ring even when only estimate exists
  const chartData =
    pieData.length > 0
      ? pieData
      : [{ key: "empty", name: "No data", value: 1, fill: PROD_WARM.track, empty: true }];

  const variance = totals.varianceHours;
  const centerLabel =
    variance == null
      ? "—"
      : `${variance > 0 ? "+" : ""}${fmtProductionHours(variance)}`;
  const centerTone =
    variance == null
      ? "text-ink"
      : totals.status === "red" || variance > 0
        ? "text-danger"
        : "text-[#0d9488]";

  return (
    <section className="rounded-[18px] border border-ink/[0.08] bg-surface p-4 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-ink">Hours mix</h3>
        <p className="mt-0.5 text-xs text-ink/45">
          Estimate · material on site · worked
        </p>
      </div>

      <div className="grid items-center gap-3.5 sm:grid-cols-[148px_1fr]">
        <div
          className="relative mx-auto h-[148px] w-[148px] rounded-full shadow-[0_0_0_6px_rgba(255,123,17,0.1)]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={46}
                outerRadius={70}
                paddingAngle={pieData.length > 1 ? 2 : 0}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const row = payload[0].payload as (typeof tiles)[number] & {
                    empty?: boolean;
                  };
                  if (row.key === "empty") return null;
                  return (
                    <div className="rounded-lg border border-ink/10 bg-surface px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold text-ink">{row.name}</p>
                      <p className="tabular-nums text-ink/70">
                        {fmtProductionHours(row.value)} hrs
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-[1.15rem] font-extrabold tabular-nums tracking-tight ${centerTone}`}
            >
              {centerLabel}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink/45">
              Variance
            </span>
          </div>
        </div>

        <ul className="grid w-full gap-2">
          {tiles.map((row) => (
            <li
              key={row.key}
              className={`grid grid-cols-[12px_1fr_auto] items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] ${
                row.empty ? "bg-[#f8fafc]" : "bg-[#f4f6f9]"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(15,23,42,0.04)]"
                style={{ background: row.fill }}
              />
              <span className="font-semibold text-ink/75">{row.name}</span>
              <span
                className={`font-extrabold tabular-nums ${
                  row.empty ? "text-ink/30" : "text-ink"
                }`}
              >
                {row.empty ? "—" : fmtProductionHours(row.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
