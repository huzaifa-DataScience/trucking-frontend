"use client";

import { useBidSheet } from "@/contexts/BidSheetContext";

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

  if (!bid || rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Takeoff comparison</h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Compare the submitted HVAC, duct, hydronic, and plumbing takeoffs before moving to proposal.
          </p>
        </div>
        <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs font-semibold text-ink/55">
          {rows.filter((row) => row.reconciliationRequired).length} to reconcile
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-ink/[0.08] text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-3 py-2 font-semibold">Scope</th>
              <th className="px-3 py-2 font-semibold">Takeoff A</th>
              <th className="px-3 py-2 font-semibold">Takeoff B</th>
              <th className="px-3 py-2 font-semibold">Difference</th>
              <th className="px-3 py-2 font-semibold">Variance</th>
              <th className="px-3 py-2 font-semibold">Final</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {rows.map((row) => (
              <tr key={`${row.scope}-${row.roleA}-${row.roleB}`}>
                <td className="px-3 py-3 font-semibold text-ink">{label(row.scope)}</td>
                <td className="px-3 py-3 text-ink/70">{label(row.roleA)}: {quantity(row.quantityA)}</td>
                <td className="px-3 py-3 text-ink/70">{label(row.roleB)}: {quantity(row.quantityB)}</td>
                <td className="px-3 py-3 text-ink/70">{quantity(row.difference)}</td>
                <td className="px-3 py-3 text-ink/70">{percent(row.differencePct)}</td>
                <td className="px-3 py-3 font-semibold text-ink">{quantity(row.finalQuantity)}</td>
                <td className="px-3 py-3">
                  <span className={row.reconciliationRequired ? "font-semibold text-danger" : "text-success"}>
                    {row.reconciliationRequired ? "Review required" : "Matched"}
                  </span>
                  {row.reviewedBy ? <span className="ml-1 text-xs text-ink/45">by {row.reviewedBy}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
