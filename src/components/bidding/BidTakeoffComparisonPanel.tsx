"use client";

import { useBidSheet } from "@/contexts/BidSheetContext";

import { useTableSort } from "@/hooks/useTableSort";
interface TakeoffComparison {
  scope?: string;
  roleA?: string;
  roleB?: string;
  quantityA?: number | null;
  quantityB?: number | null;
  difference?: number | null;
  differencePct?: number | null;
  reconciliationRequired?: boolean;
  finalQuantity?: number | null;
  reviewedBy?: string | null;
}

function comparisonsFromWorkflow(value: unknown): TakeoffComparison[] {
  return Array.isArray(value) ? (value as TakeoffComparison[]) : [];
}

function quantity(value: number | null | undefined): string {
  return value == null ? "-" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function percent(value: number | null | undefined): string {
  return value == null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function label(value: string | undefined): string {
  return (value ?? "").replace(/([a-z])([0-9])/gi, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** Shows the server-computed takeoff comparison before proposal handoff. */
export function BidTakeoffComparisonPanel() {
  const { bid } = useBidSheet();
  const rows = comparisonsFromWorkflow(bid?.workflow?.takeoffComparisons);
  const compareSort = useTableSort(rows, {
    scope: (r) => label(r.scope),
    takeoffA: (r) => r.quantityA,
    takeoffB: (r) => r.quantityB,
    diff: (r) => r.difference,
    variance: (r) => r.differencePct,
    final: (r) => r.finalQuantity,
    status: (r) => (r.reconciliationRequired ? "Review required" : "Matched"),
  });

  if (!bid) return null;

  return (
    <section className="intake-section min-w-0">
      <div className="intake-section-head flex flex-wrap items-center justify-between gap-2">
        <span>Takeoff comparison</span>
        {rows.length > 0 ? (
          <span className="rounded border border-[#d9d4c8] bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[#333333]">
            {rows.filter((row) => row.reconciliationRequired).length} to reconcile
          </span>
        ) : null}
      </div>
      <div className="intake-section-body overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-[#6b7280]">
            Upload estimator recap CSVs (Mike takeoff files) to populate this
            variance table. Comparison appears once the server computes
            takeoffComparisons from those files.
          </p>
        ) : (
        <div className="table-scroll rounded-xl border border-[#e8ecf1] shadow-sm">
          <table className="w-full min-w-[32rem] text-left text-[12.5px] text-[#374151]">
            <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-3 py-2.5">{compareSort.header("scope", "Scope")}</th>
                <th className="px-3 py-2.5">{compareSort.header("takeoffA", "Takeoff A")}</th>
                <th className="px-3 py-2.5">{compareSort.header("takeoffB", "Takeoff B")}</th>
                <th className="px-3 py-2.5">{compareSort.header("diff", "Diff")}</th>
                <th className="px-3 py-2.5">{compareSort.header("variance", "Var")}</th>
                <th className="px-3 py-2.5">{compareSort.header("final", "Final")}</th>
                <th className="px-3 py-2.5">{compareSort.header("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {compareSort.sorted.map((row) => (
                <tr
                  key={`${row.scope}-${row.roleA}-${row.roleB}`}
                  className="border-t border-[#eef2f6]"
                >
                  <td className="px-3 py-2.5 font-semibold text-[#1f2937]">
                    {label(row.scope)}
                  </td>
                  <td className="px-3 py-2.5 text-[#4b5563]">
                    {label(row.roleA)}: {quantity(row.quantityA)}
                  </td>
                  <td className="px-3 py-2.5 text-[#4b5563]">
                    {label(row.roleB)}: {quantity(row.quantityB)}
                  </td>
                  <td className="px-3 py-2.5 text-[#4b5563]">
                    {quantity(row.difference)}
                  </td>
                  <td className="px-3 py-2.5 text-[#4b5563]">
                    {percent(row.differencePct)}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#1f2937]">
                    {quantity(row.finalQuantity)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        row.reconciliationRequired
                          ? "font-semibold text-danger"
                          : "text-success"
                      }
                    >
                      {row.reconciliationRequired ? "Review required" : "Matched"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </section>
  );
}
