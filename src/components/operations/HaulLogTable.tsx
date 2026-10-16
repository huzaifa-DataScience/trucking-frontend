"use client";

import Link from "next/link";
import type { OperationsHaul } from "@/lib/operations/types";
import { hours, money, tons } from "@/lib/operations/format";
import {
  OPS_SHELL,
  OPS_TABLE_SCROLL,
  OPS_TABLE_STICKY_HEAD,
} from "@/components/operations/tableScroll";

export function HaulLogTable({ rows }: { rows: OperationsHaul[] }) {
  if (rows.length === 0) {
    return (
      <div className={`${OPS_SHELL} px-4 py-12 text-center text-sm text-ink/45`}>
        No hauls match these filters.
      </div>
    );
  }

  return (
    <div className={OPS_SHELL}>
      <div className={OPS_TABLE_SCROLL}>
        <table className="min-w-[64rem] w-full border-collapse text-left text-[13px]">
          <thead>
            <tr
              className={`${OPS_TABLE_STICKY_HEAD} text-[11px] font-semibold uppercase tracking-wide text-ink/50`}
            >
              <th className="whitespace-nowrap px-3 py-2.5">Date</th>
              <th className="whitespace-nowrap px-3 py-2.5">Job</th>
              <th className="whitespace-nowrap px-3 py-2.5">Hauler</th>
              <th className="whitespace-nowrap px-3 py-2.5">Hrs</th>
              <th className="whitespace-nowrap px-3 py-2.5">Destination</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Tons</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Trucking</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Disposal</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-ink/[0.05] transition hover:bg-brand/[0.04]"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <Link
                    href={`/operations/hauls/${row.id}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {row.ticketDate}
                  </Link>
                </td>
                <td className="max-w-[15rem] px-3 py-2">
                  <p className="truncate font-medium text-ink">{row.jobNumber || "—"}</p>
                  <p className="truncate text-[11px] text-ink/45">{row.jobName || "—"}</p>
                </td>
                <td className="max-w-[13rem] truncate px-3 py-2 text-ink/75" title={row.haulerLabel ?? undefined}>
                  {row.haulerLabel || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink/70">
                  {hours(row.hours)}
                </td>
                <td
                  className="max-w-[13rem] truncate px-3 py-2 text-ink/75"
                  title={row.disposalLabel ?? undefined}
                >
                  {row.disposalLabel || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink/70">
                  {tons(row.weightTons)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink/70">
                  {money(row.truckingCost)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink/70">
                  {money(row.disposalCost)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ink">
                  {money(row.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2 text-[11px] text-ink/45">
        {rows.length.toLocaleString()} haul{rows.length === 1 ? "" : "s"} · scroll for more
      </div>
    </div>
  );
}
