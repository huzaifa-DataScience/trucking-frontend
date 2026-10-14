/** Shared A–Z ordering for dropdowns and sortable tables: case-insensitive, numbers in natural order ("Duct 2" before "Duct 10"). */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export type SortDir = "asc" | "desc";

export type SortValue = string | number | boolean | Date | null | undefined;

export function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return collator.compare(a ?? "", b ?? "");
}

/** Compare two cell values; blanks always sort last regardless of direction (handled by the caller via `dir`). */
export function compareValues(a: SortValue, b: SortValue): number {
  if (a instanceof Date) a = a.getTime();
  if (b instanceof Date) b = b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return compareText(String(a), String(b));
}

const isBlank = (v: SortValue) => v == null || v === "" || (typeof v === "number" && Number.isNaN(v));

/** Copy of `rows` sorted by `value(row)`; blank values go to the bottom in both directions. */
export function sortRows<T>(rows: readonly T[], value: (row: T) => SortValue, dir: SortDir): T[] {
  return [...rows].sort((x, y) => {
    const a = value(x);
    const b = value(y);
    const blankA = isBlank(a);
    const blankB = isBlank(b);
    if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
    const c = compareValues(a, b);
    return dir === "asc" ? c : -c;
  });
}

/** Date-like text ("10/12/2026", ISO) → timestamp so it sorts chronologically; anything else is returned as-is. */
export function asDate(value: string | null | undefined): SortValue {
  if (!value) return null;
  const t = /\d[/-]\d/.test(value) ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? value : t;
}
