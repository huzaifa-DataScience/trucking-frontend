"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductionReportLine } from "@/lib/bidding/production-types";
import {
  commodityChartLabel,
  fmtProductionHours,
} from "@/lib/bidding/production-types";

const MIKE = "#64748b";
const RECV = "#f59e0b";
const MUTED = "#94a3b8";

/** Chart B — all commodities Hrs Mike vs Hrs @ Recv (§4.3) */
export function ProductionCommodityHoursChart({
  lines,
}: {
  lines: ProductionReportLine[];
}) {
  const [hideZeroRecv, setHideZeroRecv] = useState(false);

  const data = useMemo(() => {
    const filtered = hideZeroRecv
      ? lines.filter((l) => (l.hoursEstimatedFromReceived ?? 0) !== 0)
      : lines;
    const sorted = [...filtered].sort(
      (a, b) => (b.hoursEstimated ?? 0) - (a.hoursEstimated ?? 0)
    );
    return sorted.map((line) => ({
      key: line.commodityKey,
      label: commodityChartLabel(line),
      hoursMike: line.hoursEstimated ?? 0,
      hoursRecv: line.hoursEstimatedFromReceived ?? 0,
    }));
  }, [lines, hideZeroRecv]);

  const rowHeight = 28;
  const chartHeight = Math.max(220, data.length * rowHeight + 48);

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Commodity hours</h3>
        <p className="mt-0.5 text-xs text-ink/45">
          Full estimate (hrs) vs Hrs for material on site
          {hideZeroRecv ? "" : " — zeros included"}
        </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink/60">
          <input
            type="checkbox"
            checked={hideZeroRecv}
            onChange={(e) => setHideZeroRecv(e.target.checked)}
            className="rounded border-ink/20"
          />
          Hide zero recv
        </label>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/40">No commodities</p>
      ) : (
        <div className="w-full min-w-0" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: MUTED, fontSize: 11 }}
                axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                tickFormatter={(v) =>
                  typeof v === "number" ? v.toLocaleString() : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fill: MUTED, fontSize: 10 }}
                axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-lg border border-ink/10 bg-surface px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold text-ink">{row.label}</p>
                      <p className="tabular-nums text-ink/70">
                        Full estimate: {fmtProductionHours(row.hoursMike)}
                      </p>
                      <p className="tabular-nums text-ink/70">
                        Material on site: {fmtProductionHours(row.hoursRecv)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) =>
                  value === "hoursMike"
                    ? "Full estimate (hrs)"
                    : "Hrs for material on site"
                }
              />
              <Bar
                dataKey="hoursMike"
                name="hoursMike"
                fill={MIKE}
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
              <Bar
                dataKey="hoursRecv"
                name="hoursRecv"
                fill={RECV}
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
