"use client";

import type { ReactNode } from "react";

interface KpiStatProps {
  label: string;
  value: ReactNode;
  /** Small line under the value (e.g. delta or context). */
  sub?: ReactNode;
  /** Renders the stat as a clickable filter tile. */
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * Executive KPI stat: eyebrow label + large tabular numeral.
 * Clickable variant doubles as a filter tile (e.g. aging buckets, status counts).
 */
export function KpiStat({ label, value, sub, onClick, active = false, className = "" }: KpiStatProps) {
  const baseClasses = `ui-shadow-card ui-card-highlight rounded-2xl border bg-surface p-4 text-left transition duration-200 ${
    active
      ? "border-brand/40 ring-2 ring-brand/15"
      : "border-ink/[0.06]"
  } ${className}`;

  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="ui-num mt-1.5 text-[1.4rem] font-semibold leading-none text-ink">{value}</p>
      {sub ? <div className="mt-1.5 text-xs text-ink/50">{sub}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${baseClasses} cursor-pointer hover:-translate-y-0.5 hover:border-brand/30 hover:!shadow-[0_1px_2px_rgba(1,1,1,0.05),0_16px_32px_-16px_rgba(1,1,1,0.18)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
      >
        {body}
      </button>
    );
  }

  return <div className={baseClasses}>{body}</div>;
}
