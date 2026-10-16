"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { href: string; label: string; match: (path: string) => boolean }[] = [
  {
    href: "/operations",
    label: "Haul log",
    match: (p) => p === "/operations" || p.startsWith("/operations/hauls"),
  },
  {
    href: "/operations/hauler-rates",
    label: "Hauler rates",
    match: (p) => p.startsWith("/operations/hauler-rates"),
  },
  {
    href: "/operations/disposal-rates",
    label: "Disposal rates",
    match: (p) => p.startsWith("/operations/disposal-rates"),
  },
  {
    href: "/operations/reports/jobs",
    label: "Reports",
    match: (p) => p.startsWith("/operations/reports"),
  },
];

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
            Trucking · Operations
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 max-w-2xl text-[13px] text-ink/50">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>

      <nav
        className="flex h-10 w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-ink/10 bg-white/80 p-1 shadow-[0_4px_12px_rgba(91,173,232,0.06)]"
        aria-label="Operations sections"
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`h-8 shrink-0 rounded-md px-3 text-xs font-semibold transition ${
                active ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {onReports ? (
        <nav className="flex flex-wrap gap-1.5" aria-label="Report views">
          {REPORT_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                  active
                    ? "bg-brand/15 text-brand"
                    : "bg-ink/[0.04] text-ink/55 hover:bg-ink/[0.07] hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {filters ? (
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
