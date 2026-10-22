/**
 * Clearstory Projects column sort, the same rule as the server's (`clearstory-project-list.ts`):
 * blanks last, then numbers, number-like text, dates, and finally text. Contract value sorts as money.
 * Used only when an older backend ignores `sortBy`.
 */
import { normalizeMoney } from "@/lib/api/endpoints/clearstory";

function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const aStr = typeof a === "string" ? a : String(a);
  const bStr = typeof b === "string" ? b : String(b);

  const aNum = Number(aStr);
  const bNum = Number(bStr);
  if (aStr !== "" && bStr !== "" && !Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return aStr.localeCompare(bStr);
}

export function sortProjectRows<T>(rows: T[], sortBy: string | null | undefined, sortDir: "asc" | "desc"): T[] {
  if (!sortBy) return rows;
  const withValues = rows.map((row) => ({
    row,
    value:
      sortBy === "baseContractValue"
        ? normalizeMoney((row as Record<string, unknown>).baseContractValue)
        : (row as Record<string, unknown>)[sortBy],
  }));
  withValues.sort((a, b) => (sortDir === "asc" ? compareValues(a.value, b.value) : compareValues(b.value, a.value)));
  return withValues.map((w) => w.row);
}
