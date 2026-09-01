"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { ProductionReport } from "@/lib/bidding/production-types";
import { fmtProductionHours } from "@/lib/bidding/production-types";
import { ProductionStatusBadge } from "./ProductionStatusBadge";

const MUTED = "#94a3b8";
const TARGET = "#f59e0b";
const MIKE = "#64748b";

function workedBarColor(status: ProductionReport["totals"]["status"]): string {
  if (status === "green") return "#059669";
  if (status === "red") return "#dc2626";
  return "#94a3b8";
}

/** Chart A — labor: estimate vs material vs worked (§4.2) */
export function ProductionHoursCompareChart({
  report,
}: {
  report: ProductionReport;
}) {
  const { totals, connecteam, jobNumber } = report;
  const actual = totals.actualHours;
  const workerCount =
    totals.workerCount ?? connecteam.workerCount ?? null;
  const avgPerWorker =
    totals.averageHoursPerWorker ??
    connecteam.averageHoursPerWorker ??
    null;

  const data = [
    {
      key: "mike",
      label: "Full job estimate",
      hours: totals.hoursEstimatedMike ?? 0,
      fill: MIKE,
      help: "From Mike — total labor if all estimated material is installed",
    },
    {
      key: "target",
      label: "Material on site",
      hours: totals.hoursEstimatedFromReceived ?? 0,
      fill: TARGET,
      help: "From Trimble received ÷ production rate — labor we should have used so far",
    },
    {
      key: "actual",
      label: "Hours worked",
      hours: actual ?? 0,
      fill: workedBarColor(totals.status),
      empty: actual == null,
      help: "All workers’ clocked time summed (labor-hours) — green/red uses this",
    },
  ];

  const subtitleParts = [
    jobNumber || connecteam.jobNumber || connecteam.jobLabel,
    connecteam.shiftCount != null
      ? `${connecteam.shiftCount.toLocaleString()} shifts`
      : null,
    workerCount != null
      ? `${workerCount.toLocaleString()} workers`
      : null,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Labor: estimate vs material vs worked
          </h3>
          <p className="mt-0.5 text-xs text-ink/45">
            Full job estimate · Hours for material on site · Hours worked
            (Connecteam)
            {subtitleParts.length ? ` · ${subtitleParts.join(" · ")}` : ""}
          </p>
          {!connecteam.linked ? (
            <p className="mt-1 text-xs text-warning">
              No Connecteam time for this job
            </p>
          ) : null}
        </div>
        <ProductionStatusBadge status={totals.status} />
      </div>

      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: MUTED, fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              interval={0}
            />
            <YAxis
              tick={{ fill: MUTED, fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              tickFormatter={(v) =>
                typeof v === "number" ? v.toLocaleString() : String(v)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="max-w-xs rounded-lg border border-ink/10 bg-surface px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-ink">{row.label}</p>
                    <p className="tabular-nums text-ink/70">
                      {row.empty
                        ? "No clock data"
                        : `${fmtProductionHours(row.hours)} hrs`}
                    </p>
                    {row.help ? (
                      <p className="mt-1 text-ink/45">{row.help}</p>
                    ) : null}
                    {row.key === "actual" && totals.varianceHours != null ? (
                      <p className="mt-1 text-ink/50">
                        Variance: {fmtProductionHours(totals.varianceHours)}{" "}
                        (material on site − worked)
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.fill}
                  fillOpacity={entry.empty ? 0.25 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-3 grid gap-2 text-[11px] text-ink/55 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-ink/[0.06] bg-canvas/40 px-2.5 py-2">
          <dt className="inline-flex items-center gap-1.5 font-semibold text-ink/70">
            <span className="h-2 w-2 rounded-sm" style={{ background: MIKE }} />
            Full job estimate (hrs)
          </dt>
          <dd className="mt-1 tabular-nums text-sm font-semibold text-ink">
            {fmtProductionHours(totals.hoursEstimatedMike)}
          </dd>
          <dd className="mt-1 text-ink/45">
            From Mike — total labor if all estimated material is installed
          </dd>
        </div>
        <div className="rounded-lg border border-ink/[0.06] bg-canvas/40 px-2.5 py-2">
          <dt className="inline-flex items-center gap-1.5 font-semibold text-ink/70">
            <span className="h-2 w-2 rounded-sm" style={{ background: TARGET }} />
            Hours for material on site
          </dt>
          <dd className="mt-1 tabular-nums text-sm font-semibold text-ink">
            {fmtProductionHours(totals.hoursEstimatedFromReceived)}
          </dd>
          <dd className="mt-1 text-ink/45">
            From Trimble received ÷ production rate — labor we should have used
            so far
          </dd>
        </div>
        <div className="rounded-lg border border-ink/[0.06] bg-canvas/40 px-2.5 py-2">
          <dt className="inline-flex items-center gap-1.5 font-semibold text-ink/70">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: workedBarColor(totals.status) }}
            />
            Hours worked (Connecteam)
          </dt>
          <dd className="mt-1 tabular-nums text-sm font-semibold text-ink">
            {actual == null ? "—" : fmtProductionHours(actual)}
          </dd>
          <dd className="mt-1 text-ink/45">
            All workers’ clocked time summed (labor-hours) — green/red uses this
          </dd>
        </div>
        <div className="rounded-lg border border-ink/[0.06] bg-canvas/40 px-2.5 py-2">
          <dt className="font-semibold text-ink/70">Workers on job</dt>
          <dd className="mt-1 tabular-nums text-sm font-semibold text-ink">
            {workerCount == null ? "—" : workerCount.toLocaleString()}
          </dd>
          <dd className="mt-1 text-ink/45">
            How many people clocked on this job
          </dd>
        </div>
        <div className="rounded-lg border border-ink/[0.06] bg-canvas/40 px-2.5 py-2">
          <dt className="font-semibold text-ink/70">Avg hours / worker</dt>
          <dd className="mt-1 tabular-nums text-sm font-semibold text-ink">
            {avgPerWorker == null ? "—" : fmtProductionHours(avgPerWorker)}
          </dd>
          <dd className="mt-1 text-ink/45">
            Labor-hours ÷ workers — typical hours one person put in
          </dd>
        </div>
      </dl>
    </section>
  );
}
