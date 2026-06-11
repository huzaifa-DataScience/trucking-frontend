"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidNumberInput } from "@/components/bidding/BidFormField";
import { BID_SYSTEM_KEYS, BID_SYSTEM_LABELS } from "@/lib/bidding/constants";
import { EXCEL_INPUT_COLUMN } from "@/lib/bidding/engine/excel-spec";
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
    <Card>
      <CardHeader title="Systems — inputs" subtitle={COL_HINT} />
      <div className="overflow-x-auto rounded-xl border border-ink/[0.06]">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-ink/[0.06] bg-[#f8f9fb] text-left text-[10px] font-semibold uppercase tracking-wider text-ink/40">
              <th className="px-3 py-2">Include</th>
              <th className="px-3 py-2">System</th>
              <th className="px-3 py-2 text-right" title="Excel row 17">
                R17 MIKE #
              </th>
              <th className="px-3 py-2 text-right" title="Excel row 18">
                R18 Materials
              </th>
              <th className="px-3 py-2 text-right" title="Excel row 19 — hours, not dollars">
                R19 Labor hrs
              </th>
              <th className="px-3 py-2 text-right" title="Excel row 20 — MIKE $ total">
                R20 MIKE $
              </th>
              <th className="px-3 py-2 text-right" title="Excel row 21">
                R21 Qty
              </th>
              <th className="px-3 py-2 text-right text-brand/80" title="Calculated row 41">
                Labor $
              </th>
              <th className="px-3 py-2 text-right text-brand/80" title="Calculated row 45">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {BID_SYSTEM_KEYS.map((key) => {
              const row = systems.find((s) => s.key === key)!;
              const active = Boolean(row.used);
              const calc = computedByKey.get(key);
              return (
                <tr
                  key={key}
                  className={active ? "hover:bg-brand/[0.02]" : "text-ink/40"}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={!isEditable}
                      onChange={(e) => onUpdateRow(key, { used: e.target.checked })}
                      className="h-4 w-4 rounded border-ink/20 text-brand focus:ring-brand disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{BID_SYSTEM_LABELS[key]}</td>
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
                  <td className="px-3 py-2 text-right font-mono text-ink/70">
                    {active && calc?.used
                      ? formatMoneyPrecise(calc.laborTotal)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-ink">
                    {active && calc?.used ? formatMoneyPrecise(calc.subtotal) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
