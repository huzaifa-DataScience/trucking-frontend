import type { BidSystemRow } from "../types";
import { bool, nvl } from "./helpers";

/** Heuristic: catch Excel row 19/20/21 values entered in the wrong columns. */
export function detectInputWarnings(systems: BidSystemRow[]): string[] {
  const warnings: string[] = [];
  const active = systems.filter((s) => bool(s.used));
  if (active.length === 0) return warnings;

  const totalHours = active.reduce((s, r) => s + nvl(r.laborHours), 0);
  const totalMike = active.reduce((s, r) => s + nvl(r.mikeTotalPrice), 0);
  const totalQty = active.reduce((s, r) => s + nvl(r.quantity), 0);

  for (const row of active) {
    const hours = nvl(row.laborHours);
    const mike = nvl(row.mikeTotalPrice);
    const qty = nvl(row.quantity);
    const label = row.key;

    if (hours > 800 && mike > 0 && mike < hours / 3) {
      warnings.push(
        `${label}: Labor hrs (${hours}) looks like a dollar amount — MIKE total is only ${mike}. In Excel, row 19 is hours (e.g. 228), row 20 is MIKE $ (e.g. 19,516).`
      );
    }
    if (mike > 0 && mike < 15000 && qty > 3000 && Math.abs(mike - qty) < mike * 0.05) {
      warnings.push(
        `${label}: MIKE total (${mike}) matches quantity (${qty}) — row 20 should be MIKE price (~19k for duct1), row 21 is quantity (~5,456).`
      );
    }
  }

  if (totalHours > 2000 && totalMike > 0 && totalMike < totalHours / 5) {
    warnings.push(
      `Totals suggest swapped columns: labor hours sum to ${totalHours.toFixed(0)} but MIKE total sum is ${totalMike.toFixed(2)}. Expected IDC6098: ~488 hrs and ~$43,838 MIKE.`
    );
  }

  if (totalHours > 10000) {
    warnings.push(
      `Total labor hours (${totalHours.toFixed(0)}) is unusually high for a single bid — confirm row 19 (hours), not row 20 (MIKE $).`
    );
  }

  if (totalMike > 0 && totalQty > 0 && Math.abs(totalMike - totalQty) < totalMike * 0.02) {
    warnings.push(
      "Sum of MIKE totals is close to sum of quantities — check that MIKE total $ is not entered in the Quantity column."
    );
  }

  return warnings;
}
