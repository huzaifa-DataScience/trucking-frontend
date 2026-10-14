"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { AgingColumn } from "@/components/billings/AgingColumnsChart";

/** By bucket (keys from AGING_BUCKETS): blues while current, amber to red as the balance ages. */
const BUCKET_COLORS: Record<string, string> = {
  Current: "#93c5fd",
  "1-30 Days": "#60a5fa",
  "31-60 Days": "#fbbf24",
  "61-90 Days": "#f59e0b",
  "91-120 Days": "#ea580c",
  ">120 Days": "#b91c1c",
};

const fullMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const shortMoney = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

/** Compact A/R by age for the Billing summary strip: one stacked bar, newest to oldest, with a legend of bucket totals. */
export function AgingStackedBar({
  columns,
  total,
  loading,
  unit = "contract",
}: {
  columns: AgingColumn[];
  total: number;
  loading?: boolean;
  unit?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading A/R by age">
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }
  const color = (key: string) => BUCKET_COLORS[key] ?? "#9ca3af";
  const label = columns
    .map((c) => `${c.label} ${fullMoney(c.amount)}`)
    .join(", ");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-[#f3f4f6]" role="img" aria-label={`A/R by age: ${label}`}>
        {total > 0
          ? columns.map((c) =>
              c.amount > 0 ? (
                <i
                  key={c.key}
                  className="block h-full"
                  style={{ flex: c.amount, background: color(c.key) }}
                  title={`${c.label}: ${fullMoney(c.amount)} · ${c.projects} ${unit}${c.projects === 1 ? "" : "s"}`}
                />
              ) : null
            )
          : null}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-ink-muted">
        {columns.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1.5 tabular-nums" title={fullMoney(c.amount)}>
            <i className="h-2 w-2 rounded-[2px]" style={{ background: color(c.key) }} aria-hidden />
            {c.label} <b className="font-semibold text-ink">{c.amount ? shortMoney(c.amount) : "—"}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
