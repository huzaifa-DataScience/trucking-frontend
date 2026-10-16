"use client";

import type { CostReportResponse, CostReportRow } from "@/lib/operations/types";
import { money, tons } from "@/lib/operations/format";
import {
  OPS_SHELL,
  OPS_TABLE_SCROLL,
  OPS_TABLE_STICKY_HEAD,
} from "@/components/operations/tableScroll";

export function CostReportTable({
  data,
  nameHeader,
  nameOf,
}: {
  data: CostReportResponse;
  nameHeader: string;
  nameOf: (row: CostReportRow) => string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Loads" value={String(data.totals.loads)} />
        <Kpi label="Weight (tons)" value={tons(data.totals.weightTons)} />
        <Kpi label="Trucking" value={money(data.totals.truckingCost)} />
        <Kpi label="Disposal" value={money(data.totals.disposalCost)} />
        <Kpi label="Total cost" value={money(data.totals.totalCost)} emphasis />
      </div>

      <div className={OPS_SHELL}>
        <div className={OPS_TABLE_SCROLL}>
          <table className="min-w-[48rem] w-full text-left text-[13px]">
            <thead>
              <tr
                className={`${OPS_TABLE_STICKY_HEAD} text-[11px] font-semibold uppercase tracking-wide text-ink/50`}
              >
                <th className="px-3 py-2.5">{nameHeader}</th>
                <th className="px-3 py-2.5 text-right">Loads</th>
                <th className="px-3 py-2.5 text-right">Tons</th>
                <th className="px-3 py-2.5 text-right">Trucking</th>
                <th className="px-3 py-2.5 text-right">Disposal</th>
                <th className="px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-ink/45">
                    No rows in this date range.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, i) => (
                  <tr
                    key={`${nameOf(row)}-${i}`}
                    className="border-b border-ink/[0.05] transition hover:bg-brand/[0.04]"
                  >
                    <td className="max-w-[20rem] px-3 py-2">
                      <p className="truncate font-medium text-ink">{nameOf(row)}</p>
                      {row.jobNumber && row.jobName ? (
                        <p className="truncate text-[11px] text-ink/45">{row.jobName}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.loads}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tons(row.weightTons)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {money(row.truckingCost)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {money(row.disposalCost)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {money(row.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2 text-[11px] text-ink/45">
          {data.rows.length.toLocaleString()} row{data.rows.length === 1 ? "" : "s"} · sorted by
          total cost
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`${OPS_SHELL} px-3.5 py-2.5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${
          emphasis ? "text-base font-semibold text-ink" : "text-[14px] font-medium text-ink/80"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
