"use client";

import { useRef, useState } from "react";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
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

const GROUPS = [
  { id: "a" as const, title: "Group A" },
  { id: "b" as const, title: "Group B" },
];

const SCOPES = [
  { id: "duct", title: "Duct" },
  { id: "hydronic", title: "Hydronic" },
  { id: "plumbing", title: "Plumbing" },
] as const;

export type RecapSlotLabel =
  | "recap-a-duct"
  | "recap-a-hydronic"
  | "recap-a-plumbing"
  | "recap-b-duct"
  | "recap-b-hydronic"
  | "recap-b-plumbing";

export function recapSlotLabel(
  group: "a" | "b",
  scope: (typeof SCOPES)[number]["id"]
): RecapSlotLabel {
  return `recap-${group}-${scope}`;
}

export function isRecapSlotLabel(label: string | null | undefined): boolean {
  return /^recap-[ab]-(duct|hydronic|plumbing)$/.test(label ?? "");
}

function comparisonsFromWorkflow(value: unknown): TakeoffComparison[] {
  return Array.isArray(value) ? (value as TakeoffComparison[]) : [];
}

function quantity(value: number | null | undefined): string {
  return value == null
    ? "-"
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function percent(value: number | null | undefined): string {
  return value == null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function label(value: string | undefined): string {
  return (value ?? "")
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

type CompareStatus = "matched" | "review" | "incomplete" | "no_data";

/** Empty qty → No data (never Matched). */
function compareStatus(row: TakeoffComparison): CompareStatus {
  const hasA = row.quantityA != null;
  const hasB = row.quantityB != null;
  if (!hasA && !hasB) return "no_data";
  if (!hasA || !hasB) return "incomplete";
  if (row.reconciliationRequired) return "review";
  return "matched";
}

const STATUS_UI: Record<CompareStatus, { label: string; className: string }> = {
  matched: { label: "Matched", className: "text-success" },
  review: { label: "Review required", className: "font-semibold text-danger" },
  incomplete: {
    label: "Incomplete",
    className: "font-semibold text-warning",
  },
  no_data: { label: "No data", className: "text-[#9ca3af]" },
};

function slotFile(
  attachments: BidAttachment[],
  slot: RecapSlotLabel
): BidAttachment | null {
  const matches = attachments.filter((a) => a.label === slot);
  matches.sort((a, b) => b.id - a.id);
  return matches[0] ?? null;
}

function RecapBox({
  title,
  file,
  busy,
  editable,
  onUpload,
}: {
  title: string;
  file: BidAttachment | null;
  busy: boolean;
  editable: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = busy || localBusy || !editable;

  const runUpload = async (picked: File | undefined) => {
    if (!picked || locked) return;
    setError(null);
    setLocalBusy(true);
    try {
      await onUpload(picked);
    } catch (err) {
      setError(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div
      className={`rounded-lg border border-dashed px-3 py-2.5 transition-colors ${
        dragging
          ? "border-brand bg-brand-tint/40"
          : file
            ? "border-[#c5ccd6] bg-white"
            : "border-[#d5dbe3] bg-[#fafbfc]"
      } ${locked && editable ? "opacity-70" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!locked) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!locked) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void runUpload(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-[#374151]">{title}</p>
        {editable ? (
          <button
            type="button"
            disabled={locked}
            className="intake-head-btn shrink-0 !h-7 !px-2 !text-[11px] disabled:opacity-50"
            onClick={() => inputRef.current?.click()}
          >
            {localBusy ? "Uploading…" : file ? "Replace" : "Upload CSV"}
          </button>
        ) : null}
      </div>
      {file ? (
        <p
          className="mt-1.5 truncate text-[12.5px] font-medium text-[#1f2937]"
          title={file.fileName}
        >
          {file.fileName}
        </p>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-[#9ca3af]">
          {editable ? "Drop CSV here or upload" : "Empty"}
        </p>
      )}
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={locked}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          void runUpload(picked);
        }}
      />
    </div>
  );
}

/**
 * Fixed Group A / Group B recap boxes — not upload order.
 * POST label: recap-{a|b}-{duct|hydronic|plumbing}, category takeoff_markup.
 */
export function BidTakeoffComparisonPanel() {
  const { bid, isEditable, saving, uploadAttachment } = useBidSheet();
  const rows = comparisonsFromWorkflow(bid?.workflow?.takeoffComparisons);
  const attachments = bid?.attachments ?? [];

  const filledSlots = GROUPS.reduce((n, group) => {
    return (
      n +
      SCOPES.filter((scope) =>
        slotFile(attachments, recapSlotLabel(group.id, scope.id))
      ).length
    );
  }, 0);

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
    <div className="flex min-w-0 flex-col gap-4">
      <section className="intake-section min-w-0">
        <div className="intake-section-head-bar">
          <div>
            <h3>Takeoff comparison</h3>
            <p>
              Group A vs Group B — one recap CSV per Duct / Hydronic / Plumbing
              box
            </p>
          </div>
          <span className="intake-head-count">{filledSlots}/6</span>
        </div>
        <div className="intake-section-body flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {GROUPS.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-[#e8ecf1] bg-[#f8fafc] p-3 sm:p-4"
              >
                <p className="mb-3 text-[13px] font-semibold tracking-wide text-[#1f2937]">
                  {group.title}
                  <span className="ml-2 text-[11px] font-medium text-[#6b7280]">
                    → quantity{group.id === "a" ? "A" : "B"}
                  </span>
                </p>
                <div className="flex flex-col gap-2">
                  {SCOPES.map((scope) => {
                    const slot = recapSlotLabel(group.id, scope.id);
                    return (
                      <RecapBox
                        key={slot}
                        title={scope.title}
                        file={slotFile(attachments, slot)}
                        busy={saving}
                        editable={isEditable}
                        onUpload={(file) =>
                          uploadAttachment(file, {
                            label: slot,
                            category: "takeoff_markup",
                          })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#9ca3af]">
            One file per box. Replace keeps the latest in that box (server moves
            the previous file off the slot). Duct compares to duct, hydronic to
            hydronic, plumbing to plumbing.
          </p>
        </div>
      </section>

      <section className="intake-section min-w-0">
        <div className="intake-section-head flex flex-wrap items-center justify-between gap-2">
          <span>Variance</span>
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
        <div className="intake-section-body overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-[12.5px] text-[#6b7280]">
              Upload recaps into the boxes above. After the bid reloads, duct
              compares to duct, hydronic to hydronic, plumbing to plumbing.
              Empty sides show No data — not Matched.
            </p>
          ) : (
            <div className="table-scroll rounded-xl border border-[#e8ecf1] shadow-sm">
              <table className="w-full min-w-[32rem] text-left text-[12.5px] text-[#374151]">
                <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2.5">
                      {compareSort.header("scope", "Scope")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("takeoffA", "Group A")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("takeoffB", "Group B")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("diff", "Diff")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("variance", "Var")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("final", "Final")}
                    </th>
                    <th className="px-3 py-2.5">
                      {compareSort.header("status", "Status")}
                    </th>
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
    </div>
  );
}
