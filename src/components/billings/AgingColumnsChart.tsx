"use client";

import { useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export type AgingColumn = {
  key: string;
  label: string;
  amount: number;
  /** Projects carrying money in this bucket. */
  projects: number;
};

/**
 * Ordinal blue ramp, newest -> oldest (validated: monotone lightness, light end clears 2:1 on white).
 * Index by bucket position; more than five buckets reuse the darkest step.
 */
export const AGE_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

const fullMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const shortMoney = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

/** Round the axis max up to 1 / 2 / 2.5 / 5 × 10^n so ticks land on readable values. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * mag >= max) return step * mag;
  }
  return 10 * mag;
}

/** A/R by age as upright columns, newest to oldest, with project counts under each column. */
export function AgingColumnsChart({
  columns,
  total,
  loading,
  title = "A/R by age",
  height = 200,
  caption,
  bare = false,
  unit = "project",
}: {
  columns: AgingColumn[];
  total: number;
  loading?: boolean;
  title?: string;
  /** Plot height in px. */
  height?: number;
  /** Replaces the "Total A/R" caption on the right of the title row. */
  caption?: ReactNode;
  /** Drop the card border/background when placed inside another card. */
  bare?: boolean;
  /** Singular word for what's counted under each column ("project", "contract"). */
  unit?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const top = niceMax(Math.max(0, ...columns.map((c) => c.amount)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const share = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—");

  return (
    <section className={`flex flex-col gap-4 px-5 py-4 ${bare ? "" : "cs-content-panel rounded-lg"}`} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {caption != null ? (
          <span className="text-[13px] text-ink-muted">{caption}</span>
        ) : (
          <span className="text-[13px] text-ink-muted">
            Total A/R{" "}
            {loading ? (
              <Skeleton className="inline-block h-3.5 w-24 align-middle" />
            ) : (
              <span className="font-semibold tabular-nums text-ink">{fullMoney(total)}</span>
            )}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="w-full rounded-[var(--radius-md)]" style={{ height: height + 36 }} />
      ) : columns.length === 0 ? (
        <p className="cs-helper py-8 text-center">No aging data yet.</p>
      ) : (
        <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-2">
          {/* Y axis */}
          <div className="relative text-[11px] text-ink-soft" style={{ height }} aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 translate-y-1/2 tabular-nums" style={{ bottom: `${(t / top) * 100}%` }}>
                {shortMoney(t)}
              </span>
            ))}
          </div>

          {/* Plot */}
          <div
            className="relative grid items-end gap-3 border-b border-[var(--border-subtle)] px-2 sm:gap-5 sm:px-3"
            style={{ height, gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            role="list"
            aria-label={`${title}, by age bucket`}
          >
            {ticks.slice(1).map((t) => (
              <span
                key={t}
                className="pointer-events-none absolute inset-x-0 h-px bg-[#eef0f2]"
                style={{ bottom: `${(t / top) * 100}%` }}
                aria-hidden
              />
            ))}
            {columns.map((c, i) => {
              const color = AGE_COLORS[Math.min(i, AGE_COLORS.length - 1)];
              const pct = (c.amount / top) * 100;
              const isActive = active === i;
              return (
                <div
                  key={c.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${c.label}: ${fullMoney(c.amount)}, ${share(c.amount)} of A/R, ${c.projects} ${unit}${c.projects === 1 ? "" : "s"}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative z-[1] flex h-full cursor-default flex-col items-center justify-end outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <span className="mb-1 text-[12px] font-semibold tabular-nums text-ink">{shortMoney(c.amount)}</span>
                  <span
                    className={`block w-full max-w-[64px] rounded-t-[4px] transition-opacity ${
                      active != null && !isActive ? "opacity-60" : ""
                    }`}
                    style={{ height: `${Math.max(pct, c.amount > 0 ? 1 : 0)}%`, background: color }}
                  />
                  {isActive ? (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-[#212121] px-2.5 py-1.5 text-left text-[12px] leading-snug text-white shadow-lg"
                    >
                      <span className="font-semibold">{c.label}</span>
                      <br />
                      {fullMoney(c.amount)} · {share(c.amount)} of A/R
                      <br />
                      {c.projects} {unit}{c.projects === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* X labels */}
          <div
            className="col-start-2 grid gap-3 px-2 pt-2 text-center sm:gap-5 sm:px-3"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {columns.map((c) => (
              <span key={c.key} className="min-w-0 text-[12px] text-ink-muted">
                {c.label}
                <span className="block text-[11px] text-ink-soft">
                  {c.projects} {unit}{c.projects === 1 ? "" : "s"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
