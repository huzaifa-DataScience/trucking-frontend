/** Excel-like helpers for Base Bid engine (see BiddingSheet.xlsx). */

export function nvl(n: number | undefined | null, fallback = 0): number {
  if (n == null || Number.isNaN(n)) return fallback;
  return n;
}

export function bool(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v === "no" || v === "No") return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  }
  return false;
}

/** Excel ROUNDUP */
export function roundUp(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  if (digits >= 0) {
    const mult = 10 ** digits;
    return Math.ceil(value * mult - 1e-12) / mult;
  }
  const mult = 10 ** -digits;
  return Math.ceil(value / mult - 1e-12) * mult;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse YYYY-MM-DD or Excel serial; returns null if invalid. */
export function parseBidDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw.slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const serial = Number(raw);
  if (!Number.isNaN(serial) && serial > 30000) {
    const utc = (serial - 25569) * 86400 * 1000;
    return new Date(utc);
  }
  return null;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
