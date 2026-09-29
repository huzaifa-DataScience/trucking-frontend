"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidNumberInput } from "@/components/bidding/BidFormField";
import { BID_SYSTEM_KEYS, BID_SYSTEM_LABELS } from "@/lib/bidding/constants";
import { formatMoneyPrecise } from "@/lib/bidding/format";
import type { BidSystemRow } from "@/lib/bidding/types";
import type { SystemComputed } from "@/lib/bidding/engine/types";

const COL_HINT =
  "Excel rows 17→21: MIKE est #, Materials, Labor hrs, MIKE total $, Quantity";

function CheckIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IncludeToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`group inline-flex items-center justify-center rounded-lg p-1.5 transition ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${checked ? "bg-brand/[0.07]" : "hover:bg-ink/[0.03]"}`}
      title={label}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span
        aria-hidden
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
          checked
            ? "border-brand bg-brand"
            : "border-ink/25 bg-white group-hover:border-brand/40"
        }`}
      >
        {checked ? <CheckIcon /> : null}
      </span>
    </label>
  );
}

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
      <div className="overflow-x-auto rounded-xl border border-ink/[0.07]">
        <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
          <thead>
            <tr className="whitespace-nowrap border-b border-ink/[0.07] bg-[#f8f9fb] text-left text-[10px] font-bold uppercase tracking-[0.04em] text-ink/40">
              <th className="px-2.5 py-2">Include</th>
              <th className="px-2.5 py-2">System</th>
              <th className="px-2.5 py-2 text-right" title="Excel row 17">
                R17 MIKE #
              </th>
              <th className="px-2.5 py-2 text-right" title="Excel row 18">
                R18 Materials
              </th>
              <th
                className="px-2.5 py-2 text-right"
                title="Excel row 19 — hours, not dollars"
              >
                R19 Labor hrs
              </th>
              <th
                className="px-2.5 py-2 text-right"
                title="Excel row 20 — MIKE $ total"
              >
                R20 MIKE $
              </th>
              <th className="px-2.5 py-2 text-right" title="Excel row 21">
                R21 Qty
              </th>
              <th
                className="px-2.5 py-2 text-right text-brand/75"
                title="Calculated row 41"
              >
                Labor $
              </th>
              <th
                className="px-2.5 py-2 text-right text-brand/75"
                title="Calculated row 45"
              >
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {BID_SYSTEM_KEYS.map((key) => {
              const row = systems.find((s) => s.key === key)!;
              const active = Boolean(row.used);
              const calc = computedByKey.get(key);
              return (
                <tr
                  key={key}
                  className={`border-b border-ink/[0.05] align-middle ${
                    active ? "hover:bg-brand/[0.02]" : "text-ink/35"
                  }`}
                >
                  <td className="px-2.5 py-2 text-center">
                    <IncludeToggle
                      checked={active}
                      disabled={!isEditable}
                      label={`Include ${BID_SYSTEM_LABELS[key]}`}
                      onChange={(next) => onUpdateRow(key, { used: next })}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-left font-semibold text-ink">
                    {BID_SYSTEM_LABELS[key]}
                  </td>
                  <td className="px-2.5 py-2">
                    <BidNumberInput
                      id={`${key}-mike-num`}
                      variant="table"
                      allowEmpty
                      value={active ? row.mikeEstimateNumber : undefined}
                      onChange={(v) =>
                        onUpdateRow(key, { mikeEstimateNumber: v })
                      }
                      disabled={!isEditable || !active}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <BidNumberInput
                      id={`${key}-materials`}
                      variant="table"
                      allowEmpty
                      value={active ? row.materials : undefined}
                      onChange={(v) =>
                        onUpdateRow(key, { materials: v ?? 0 })
                      }
                      disabled={!isEditable || !active}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <BidNumberInput
                      id={`${key}-labor`}
                      variant="table"
                      allowEmpty
                      value={active ? row.laborHours : undefined}
                      onChange={(v) =>
                        onUpdateRow(key, { laborHours: v ?? 0 })
                      }
                      disabled={!isEditable || !active}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <BidNumberInput
                      id={`${key}-mike`}
                      variant="table"
                      allowEmpty
                      value={active ? row.mikeTotalPrice : undefined}
                      onChange={(v) =>
                        onUpdateRow(key, { mikeTotalPrice: v ?? 0 })
                      }
                      disabled={!isEditable || !active}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <BidNumberInput
                      id={`${key}-qty`}
                      variant="table"
                      allowEmpty
                      value={active ? row.quantity : undefined}
                      onChange={(v) =>
                        onUpdateRow(key, { quantity: v ?? 0 })
                      }
                      disabled={!isEditable || !active}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-ink/70">
                    {active && calc?.used
                      ? formatMoneyPrecise(calc.laborTotal)
                      : "—"}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-semibold text-ink">
                    {active && calc?.used
                      ? formatMoneyPrecise(calc.subtotal)
                      : "—"}
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
