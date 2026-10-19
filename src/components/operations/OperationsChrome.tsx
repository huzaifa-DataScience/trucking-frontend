"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const REPORT_TABS: { href: string; label: string }[] = [
  { href: "/operations/reports/jobs", label: "By job" },
  { href: "/operations/reports/haulers", label: "By hauler" },
  { href: "/operations/reports/destinations", label: "By destination" },
  { href: "/operations/reports/leed", label: "LEED / aggregates" },
];

export function OperationsChrome({
  title,
  subtitle,
  action,
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Sticky filter strip under the nav (dates, search, etc.). */
  filters?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onReports = pathname.startsWith("/operations/reports");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 sm:min-w-[22rem]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
            Trucking · Operations
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 max-w-2xl text-[13px] text-ink/50">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>

      {/* Section links (Haul log, rates, reports) live in the Trucking sidebar; only report views switch here. */}
      {onReports ? (
        // Report pages: view switch on the left, date range on the right — one row, like the dashboards.
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <nav
            className="inline-flex h-9 w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-ink/10 bg-white p-[3px]"
            aria-label="Report views"
          >
            {REPORT_TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-7 shrink-0 items-center rounded-md px-3 text-[13px] transition-colors ${
                    active
                      ? "bg-brand-tint font-semibold text-brand-secondary"
                      : "font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {filters ? <div className="ml-auto">{filters}</div> : null}
        </div>
      ) : filters ? (
        <div className="rounded-xl border border-ink/[0.08] bg-white/80 px-3 py-3 shadow-[0_4px_12px_rgba(91,173,232,0.05)] backdrop-blur-sm sm:px-4">
          {filters}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

export const opsFieldClass =
  "h-9 w-full rounded-lg border border-ink/10 bg-white px-2.5 text-[13px] text-ink outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

export const opsBtnPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50";

export const opsBtnGhost =
  "inline-flex h-9 items-center justify-center rounded-lg border border-ink/10 bg-white px-3.5 text-[13px] font-semibold text-ink/70 transition hover:bg-ink/[0.03] disabled:opacity-50";

export const opsBtnDanger =
  "inline-flex h-9 items-center justify-center rounded-lg border border-danger/25 bg-white px-3.5 text-[13px] font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50";
