import { formatMoneyPrecise } from "@/lib/bidding/format";

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatMoneyPrecise(n);
}

export function tons(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function qty(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function hours(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Default haul-log / report window (FRONTEND_OPERATIONS: always send from+to). */
export function defaultOpsDateRange(): { from: string; to: string } {
  const to = new Date().toISOString().slice(0, 10);
  return { from: "2025-01-01", to };
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
