"use client";

import { useBidSheet } from "@/contexts/BidSheetContext";
import { useTableSort } from "@/hooks/useTableSort";
import type { BidAttachment } from "@/lib/bidding/types";

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

type CompareStatus = "matched" | "review" | "incomplete" | "no_data";

/** Empty qty rows must not read as Matched — server may send shell scopes. */
function compareStatus(row: TakeoffComparison): CompareStatus {
  const hasA = row.quantityA != null;
  const hasB = row.quantityB != null;
  if (!hasA && !hasB) return "no_data";
  if (!hasA || !hasB) return "incomplete";
  if (row.reconciliationRequired) return "review";
  return "matched";
}

const STATUS_UI: Record<
  CompareStatus,
  { label: string; className: string }
> = {
  matched: { label: "Matched", className: "text-success" },
  review: { label: "Review required", className: "font-semibold text-danger" },
  incomplete: {
    label: "Incomplete",
    className: "font-semibold text-warning",
  },
  no_data: { label: "No data", className: "text-[#9ca3af]" },
};

function isRecapFile(a: BidAttachment): boolean {
  const name = a.fileName.toLowerCase();
  const mime = (a.mimeType ?? "").toLowerCase();
  if (a.label === "takeoff-recap") return true;
  return (
    name.endsWith(".csv") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    mime.includes("csv") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet")
  );
}

function RecapSlot({
  title,
  file,
}: {
  title: string;
  file: BidAttachment | null;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#d5dbe3] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
        {title}
      </p>
      {file ? (
        <p className="mt-1 truncate text-[13px] font-medium text-[#1f2937]" title={file.fileName}>
          {file.fileName}
        </p>
      ) : (
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">No recap uploaded yet</p>
      )}
    </div>
  );
}

/** Recap files + server quantity A/B grid — FRONTEND_MEETING_2026-10-21.md */
export function BidTakeoffComparisonPanel() {
  const { bid } = useBidSheet();
  const rows = comparisonsFromWorkflow(bid?.workflow?.takeoffComparisons);
  const recaps = (bid?.attachments ?? []).filter(
    (a) =>
      isRecapFile(a) &&
      (a.label === "takeoff-recap" ||
        a.label === "takeoff" ||
        a.category === "takeoff_markup" ||
        a.label == null)
  );
  const fileA = recaps[0] ?? null;
  const fileB = recaps[1] ?? null;
  const extra = recaps.slice(2);

  const compareSort = useTableSort(rows, {
    scope: (r) => label(r.scope),
    takeoffA: (r) => r.quantityA,
    takeoffB: (r) => r.quantityB,
    diff: (r) => r.difference,
    variance: (r) => r.differencePct,
    final: (r) => r.finalQuantity,
    status: (r) => STATUS_UI[compareStatus(r)].label,
  });

  const reviewCount = rows.filter((r) => compareStatus(r) === "review").length;
  const pendingCount = rows.filter((r) => {
    const s = compareStatus(r);
    return s === "no_data" || s === "incomplete";
  }).length;

  if (!bid) return null;

  return (
    <section className="intake-section min-w-0">
      <div className="intake-section-head flex flex-wrap items-center justify-between gap-2">
        <span>Takeoff comparison</span>
        {rows.length > 0 ? (
          <span className="rounded border border-[#d9d4c8] bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[#333333]">
            {reviewCount > 0
              ? `${reviewCount} to reconcile`
              : pendingCount > 0
                ? `${pendingCount} awaiting quantities`
                : "All matched"}
          </span>
        ) : null}
      </div>
      <div className="intake-section-body flex flex-col gap-3 overflow-x-auto">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RecapSlot title="Recap A" file={fileA} />
          <RecapSlot title="Recap B" file={fileB} />
        </div>
        {extra.length > 0 ? (
          <p className="text-[11px] text-[#6b7280]">
            +{extra.length} more recap file{extra.length === 1 ? "" : "s"} on this bid
          </p>
        ) : null}
        <p className="text-[11px] text-[#9ca3af]">
          Recaps are stored on the bid. Quantity rows only fill when the server
          computes takeoffComparisons from those files — empty scopes show as No
          data, not Matched.
        </p>

        {rows.length === 0 ? (
          <p className="text-[12.5px] text-[#6b7280]">
            No comparison rows yet. After two recaps are stored, refresh the bid
            if the server has computed variances.
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
                {compareSort.sorted.map((row) => {
                  const status = compareStatus(row);
                  const ui = STATUS_UI[status];
                  return (
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
                      <span className={ui.className}>{ui.label}</span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
