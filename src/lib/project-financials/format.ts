import { formatMoneyPrecise } from "@/lib/bidding/format";

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return formatMoneyPrecise(n);
}

/** API ratios: 0.25 → 25.0% */
export function ratio(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function count(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
}

export function asOfLabel(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function foundationMissing(missing: string[] | undefined): boolean {
  return (missing ?? []).includes("foundation_job_cost");
}
