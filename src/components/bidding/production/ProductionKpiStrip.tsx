"use client";

import type { ProductionReport } from "@/lib/bidding/production-types";
import { fmtProductionHours } from "@/lib/bidding/production-types";

function KpiCard({
  label,
  value,
  hint,
  valueClass,
  dim,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
  dim?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-surface p-3.5 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <p className="text-[11px] font-semibold text-ink/50">{label}</p>
      <p
        className={`mt-1.5 text-[1.45rem] font-extrabold tabular-nums tracking-tight ${
          dim ? "text-ink/30" : valueClass ?? "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink/45">{hint}</p>
    </div>
  );
}

/** Four KPI cards — Warm brand */
export function ProductionKpiStrip({ report }: { report: ProductionReport }) {
  const { totals } = report;
  const variance = totals.varianceHours;
  const hasOnSite = (totals.hoursEstimatedFromReceived ?? 0) > 0;
  const hasWorked = totals.actualHours != null;
  const varianceLabel =
    variance == null
      ? "—"
      : `${variance > 0 ? "+" : ""}${fmtProductionHours(variance)}`;
  const varianceTone =
    variance == null
      ? undefined
      : totals.status === "red" || variance > 0
        ? "text-danger"
        : "text-[#0d9488]";

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="Full job estimate"
        value={fmtProductionHours(totals.hoursEstimatedMike)}
        hint="Mike labor hrs"
        valueClass="text-[#ff7b11]"
      />
      <KpiCard
        label="Material on site"
        value={hasOnSite ? fmtProductionHours(totals.hoursEstimatedFromReceived) : "—"}
        hint={hasOnSite ? "Trimble ÷ rate" : "Needs job link"}
        valueClass="text-[#e11d48]"
        dim={!hasOnSite}
      />
      <KpiCard
        label="Hours worked"
        value={hasWorked ? fmtProductionHours(totals.actualHours) : "—"}
        hint={hasWorked ? "Connecteam" : "Needs Connecteam"}
        valueClass="text-[#0d9488]"
        dim={!hasWorked}
      />
      <KpiCard
        label="Variance"
        value={varianceLabel}
        hint="On site − worked"
        valueClass={varianceTone}
        dim={variance == null}
      />
    </div>
  );
}
