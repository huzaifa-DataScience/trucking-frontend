"use client";

import { BidNumberInput } from "@/components/bidding/BidFormField";
import { BID_SYSTEM_KEYS, BID_SYSTEM_LABELS } from "@/lib/bidding/constants";
import { formatMoneyPrecise } from "@/lib/bidding/format";
import type { BidSystemRow } from "@/lib/bidding/types";
import type { SystemComputed } from "@/lib/bidding/engine/types";

const COL_HINT =
  "Excel rows 17→21: MIKE est #, Materials, Labor hrs, MIKE total $, Quantity";

export function BidSystemsInputTable({
  systems,
  systemsComputed,
  isEditable,
  onUpdateRow,
}: {
  systems: BidSystemRow[];
  systemsComputed: SystemComputed[];
  isEditable: boolean;
  onUpdateRow: (key: BidSystemRow["key"], patch: Partial<BidSystemRow>) => void;
}) {
  const computedByKey = new Map(systemsComputed.map((r) => [r.key, r]));

  return (
    <section className="intake-section min-w-0">
      <div className="intake-section-head">Systems — inputs</div>
      <div className="intake-section-body">
        <p className="intake-section-hint">{COL_HINT}</p>
        <div className="overflow-x-auto rounded border border-[#e5e7eb]">
          <table className="w-full min-w-[40rem] text-left text-[12.5px] text-[#374151]">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6] text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                <th className="px-2 py-1.5">Include</th>
                <th className="px-2 py-1.5">System</th>
                <th className="px-2 py-1.5 text-right" title="Excel row 17">
                  R17 MIKE #
                </th>
                <th className="px-2 py-1.5 text-right" title="Excel row 18">
                  R18 Materials
                </th>
                <th className="px-2 py-1.5 text-right" title="Excel row 19 — hours, not dollars">
                  R19 Labor hrs
                </th>
                <th className="px-2 py-1.5 text-right" title="Excel row 20 — MIKE $ total">
                  R20 MIKE $
                </th>
                <th className="px-2 py-1.5 text-right" title="Excel row 21">
                  R21 Qty
                </th>
                <th className="px-2 py-1.5 text-right" title="Calculated row 41">
                  Labor $
                </th>
                <th className="px-2 py-1.5 text-right" title="Calculated row 45">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {BID_SYSTEM_KEYS.map((key) => {
                const row = systems.find((s) => s.key === key)!;
                const active = Boolean(row.used);
                const calc = computedByKey.get(key);
                return (
                  <tr
                    key={key}
                    className={active ? "hover:bg-[#faf7f0]" : "text-[#9ca3af]"}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={!isEditable}
                        onChange={(e) => onUpdateRow(key, { used: e.target.checked })}
                        className="h-4 w-4 cursor-pointer rounded border-[#cfd5dd] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-[#1f2937]">
                      {BID_SYSTEM_LABELS[key]}
                    </td>
                    <td className="px-3 py-2">
                      <BidNumberInput
                        id={`${key}-mike-num`}
                        variant="table"
                        allowEmpty
                        value={active ? row.mikeEstimateNumber : undefined}
                        onChange={(v) => onUpdateRow(key, { mikeEstimateNumber: v })}
                        disabled={!isEditable || !active}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <BidNumberInput
                        id={`${key}-materials`}
                        variant="table"
                        allowEmpty
                        value={active ? row.materials : undefined}
                        onChange={(v) => onUpdateRow(key, { materials: v ?? 0 })}
                        disabled={!isEditable || !active}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <BidNumberInput
                        id={`${key}-labor`}
                        variant="table"
                        allowEmpty
                        value={active ? row.laborHours : undefined}
                        onChange={(v) => onUpdateRow(key, { laborHours: v ?? 0 })}
                        disabled={!isEditable || !active}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <BidNumberInput
                        id={`${key}-mike`}
                        variant="table"
                        allowEmpty
                        value={active ? row.mikeTotalPrice : undefined}
                        onChange={(v) => onUpdateRow(key, { mikeTotalPrice: v ?? 0 })}
                        disabled={!isEditable || !active}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <BidNumberInput
                        id={`${key}-qty`}
                        variant="table"
                        allowEmpty
                        value={active ? row.quantity : undefined}
                        onChange={(v) => onUpdateRow(key, { quantity: v ?? 0 })}
                        disabled={!isEditable || !active}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-[#4b5563]">
                      {active && calc?.used
                        ? formatMoneyPrecise(calc.laborTotal)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#1f2937]">
                      {active && calc?.used ? formatMoneyPrecise(calc.subtotal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
