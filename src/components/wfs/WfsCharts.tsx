"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/bidding/format";
import type { WfsCharts } from "@/lib/wfs/types";

const EQUITY = "#0f172a";
const CASH = "#ff7b11";
const GOEL = "#0f172a";
const DCB = "#ff7b11";
const GOEL_DC = "#059669";
const OTHER = "#94a3b8";
const AR = "#059669";
const AP = "#dc2626";
const AGE_CURRENT = "#64748b";
const AGE_31 = "#94a3b8";
const AGE_61 = "#f59e0b";
const AGE_90 = "#dc2626";
const AGE_RET = "#7c3aed";

function tipMoney(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return formatMoney(n);
}

function axisMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="text-xs text-ink/45">{subtitle}</p> : null}
      </div>
      <div className="h-64 w-full min-h-[16rem]">{children}</div>
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <p className="flex h-full items-center justify-center text-sm text-ink/40">
      {label}
    </p>
  );
}

const tipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(1,1,1,0.08)",
  fontSize: 12,
} as const;

/**
 * Excel v44 2×3 charts — FRONTEND_WFS.md.
 * Paint `charts.*` as-is; do not re-aggregate.
 */
export function WfsChartsSection({
  charts,
}: {
  charts: WfsCharts | null | undefined;
}) {
  if (!charts) return null;

  const equityCash = Array.isArray(charts.equityCash) ? charts.equityCash : [];
  const arVsAp = Array.isArray(charts.arVsAp) ? charts.arVsAp : [];
  const equityByCompany = Array.isArray(charts.equityByCompany)
    ? charts.equityByCompany
    : [];
  const arAging = Array.isArray(charts.arAging) ? charts.arAging : [];
  const arByCompany = Array.isArray(charts.arByCompany) ? charts.arByCompany : [];
  const apByCompany = Array.isArray(charts.apByCompany) ? charts.apByCompany : [];

  const any =
    equityCash.length ||
    arVsAp.length ||
    equityByCompany.length ||
    arAging.length ||
    arByCompany.length ||
    apByCompany.length;
  if (!any) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Row 1 */}
      <ChartCard
        title="Total Equity vs Available Cash — Trend"
        subtitle="Last 12 months"
      >
        {equityCash.length === 0 ? (
          <EmptyChart label="No snapshot history yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={equityCash}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
                stroke={EQUITY}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="availableCash"
                name="Available Cash"
                stroke={CASH}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="AR vs AP by Company — Latest Snapshot"
        subtitle="Goel / DCB / Goel DC"
      >
        {arVsAp.length === 0 ? (
          <EmptyChart label="No AR/AP latest bars" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={arVsAp}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ar" name="AR" fill={AR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="ap" name="AP" fill={AP} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Row 2 */}
      <ChartCard
        title="Equity by Company — Trend"
        subtitle="Last 8 months — stacked (ties to Total Equity)"
      >
        {equityByCompany.length === 0 ? (
          <EmptyChart label="No equity-by-company history" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={equityByCompany}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="goel" name="Goel" stackId="eq" fill={GOEL} />
              <Bar dataKey="dcb" name="DCB" stackId="eq" fill={DCB} />
              <Bar dataKey="goelDc" name="Goel DC" stackId="eq" fill={GOEL_DC} />
              <Bar
                dataKey="other"
                name="Other"
                stackId="eq"
                fill={OTHER}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="AR Aging by Company"
        subtitle="0–30 → 91+ / Retainage"
      >
        {arAging.length === 0 ? (
          <EmptyChart label="No AR aging chart data" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={arAging}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="current"
                name="0–30"
                stackId="age"
                fill={AGE_CURRENT}
              />
              <Bar dataKey="d31" name="31–60" stackId="age" fill={AGE_31} />
              <Bar dataKey="d61" name="61–90" stackId="age" fill={AGE_61} />
              <Bar dataKey="d90" name="91+" stackId="age" fill={AGE_90} />
              <Bar
                dataKey="retainage"
                name="Retainage"
                stackId="age"
                fill={AGE_RET}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Row 3 */}
      <ChartCard
        title="AR by Company — Trend"
        subtitle="Last 12 months — Goel / DCB / Goel DC"
      >
        {arByCompany.length === 0 ? (
          <EmptyChart label="No AR trend history" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={arByCompany}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="goel"
                name="Goel"
                stroke={GOEL}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="dcb"
                name="DCB"
                stroke={DCB}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="goelDc"
                name="Goel DC"
                stroke={GOEL_DC}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="AP by Company — Trend"
        subtitle="Last 12 months — Goel / DCB / Goel DC"
      >
        {apByCompany.length === 0 ? (
          <EmptyChart label="No AP trend history" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={apByCompany}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,1,1,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(1,1,1,0.45)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(1,1,1,0.4)" }}
                tickFormatter={axisMoney}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => tipMoney(v)} contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="goel"
                name="Goel"
                stroke={GOEL}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="dcb"
                name="DCB"
                stroke={DCB}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="goelDc"
                name="Goel DC"
                stroke={GOEL_DC}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
