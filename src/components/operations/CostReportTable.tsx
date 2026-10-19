"use client";

import type { CostReportResponse, CostReportRow } from "@/lib/operations/types";
import { money, tons } from "@/lib/operations/format";
import { OPS_TABLE_SCROLL } from "@/components/operations/tableScroll";
import { SortHeader, useTableSort } from "@/hooks/useTableSort";
import type { SortDir } from "@/lib/sort";
import type { ReactNode } from "react";

const th =
  "sticky top-0 z-[1] whitespace-nowrap bg-[var(--brand-tint)] px-4 py-2.5 text-[12px] font-semibold text-ink";
const td = "px-4 py-2 tabular-nums";
/** Pinned Total row (same columns as the body). */
const tf = "sticky bottom-0 z-[1] whitespace-nowrap border-t border-[var(--border-subtle)] bg-[#fafbfc] px-4 py-2.5 font-semibold tabular-nums";

export type CostSortKey = "name" | "loads" | "weightTons" | "truckingCost" | "disposalCost" | "totalCost";
type SortKey = CostSortKey;

/** Cost report table: sortable columns (Total, high → low, by default) and a Total row pinned at the bottom. */
export function CostReportTable({
  data,
  nameHeader,
  nameOf,
  nameMaxWidth = "max-w-[18rem]",
  serverSort,
  rowCount,
  footer,
}: {
  data: CostReportResponse;
  nameHeader: string;
  /** Cap for the name column (long destination names need a tighter one). */
  nameMaxWidth?: string;
  nameOf: (row: CostReportRow) => string;
  /** Paged reports: rows arrive already sorted, the headers only report clicks. */
  serverSort?: { key: SortKey; dir: SortDir; onToggle: (key: SortKey) => void };
  /** Rows in the whole report when `data.rows` is just one page. */
  rowCount?: number;
  /** Shown under the table (the pager). */
  footer?: ReactNode;
}) {
  const localSort = useTableSort<CostReportRow, SortKey>(
    data.rows,
    {
      name: (r) => nameOf(r),
      loads: (r) => r.loads,
      weightTons: (r) => r.weightTons,
      truckingCost: (r) => r.truckingCost,
      disposalCost: (r) => r.disposalCost,
      totalCost: (r) => r.totalCost,
    },
    { key: "totalCost", dir: "desc" }
  );
  const sort = serverSort
    ? {
        sorted: data.rows,
        header: (key: SortKey, label: ReactNode, align?: "left" | "right") => (
          <SortHeader
            label={label}
            active={serverSort.key === key}
            dir={serverSort.dir}
            onClick={() => serverSort.onToggle(key)}
            align={align}
          />
        ),
      }
    : localSort;
  const count = rowCount ?? data.rows.length;
  const noun = nameHeader.toLowerCase();

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
      <div className={OPS_TABLE_SCROLL}>
        <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr>
              <th className={th}>{sort.header("name", nameHeader)}</th>
              <th className={`${th} text-right`}>{sort.header("loads", "Loads", "right")}</th>
              <th className={`${th} text-right`}>{sort.header("weightTons", "Tons", "right")}</th>
              <th className={`${th} text-right`}>{sort.header("truckingCost", "Trucking", "right")}</th>
              <th className={`${th} text-right`}>{sort.header("disposalCost", "Disposal", "right")}</th>
              <th className={`${th} text-right`}>{sort.header("totalCost", "Total", "right")}</th>
            </tr>
          </thead>
          <tbody>
            {count === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/45">
                  No rows in this date range.
                </td>
              </tr>
            ) : (
              sort.sorted.map((row, i) => (
                <tr key={`${nameOf(row)}-${i}`} className="transition-colors hover:bg-brand/[0.04]">
                  <td className={`${nameMaxWidth} border-t border-[#f0f1f3] px-4 py-2`}>
                    <p className="truncate font-semibold text-ink" title={nameOf(row)}>
                      {nameOf(row)}
                    </p>
                    {row.jobNumber && row.jobName ? (
                      <p className="truncate text-[12px] text-ink-muted" title={row.jobName}>
                        {row.jobName}
                      </p>
                    ) : null}
                  </td>
                  <td className={`${td} border-t border-[#f0f1f3] text-right`}>{row.loads.toLocaleString()}</td>
                  <td className={`${td} border-t border-[#f0f1f3] text-right`}>{tons(row.weightTons)}</td>
                  <td className={`${td} border-t border-[#f0f1f3] text-right`}>{money(row.truckingCost)}</td>
                  <td className={`${td} border-t border-[#f0f1f3] text-right`}>{money(row.disposalCost)}</td>
                  <td className={`${td} border-t border-[#f0f1f3] text-right font-semibold text-ink`}>
                    {money(row.totalCost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {count > 0 ? (
            <tfoot>
              <tr>
                <td className={tf}>{`Total · ${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`}</td>
                <td className={`${tf} text-right`}>{data.totals.loads.toLocaleString()}</td>
                <td className={`${tf} text-right`}>{tons(data.totals.weightTons)}</td>
                <td className={`${tf} text-right`}>{money(data.totals.truckingCost)}</td>
                <td className={`${tf} text-right`}>{money(data.totals.disposalCost)}</td>
                <td className={`${tf} text-right`}>{money(data.totals.totalCost)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {footer}
    </div>
  );
}
