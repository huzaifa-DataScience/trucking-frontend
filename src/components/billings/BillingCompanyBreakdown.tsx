"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AgingOverdueItem, AgingReportRow } from "@/lib/api/endpoints/siteline";
import { splitProjectName } from "@/lib/siteline-project-name";
import { Skeleton } from "@/components/ui/Skeleton";

const COMPANY_SHORT: Record<number, string> = {
  1: "GOEL",
  2: "GOEL DC",
  3: "DCB",
};

// Collapsed by default; opening it is remembered per browser.
const OPEN_KEY = "billing.companyBreakdown.open";
const OPEN_EVENT = "billing-company-breakdown";
const subscribe = (cb: () => void) => {
  window.addEventListener(OPEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(OPEN_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const getSnapshot = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
};
const getServerSnapshot = () => false;
const setOpen = (open: boolean) => {
  try {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  } catch {
    // Storage blocked: the toggle still works for this render via the event below.
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);

const Chevron = ({ up }: { up: boolean }) => (
  <svg
    className={`h-3.5 w-3.5 transition-transform ${up ? "rotate-180" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    aria-hidden
  >
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * "By company" row under the Billing summary: each company's A/R split into current / over 30 /
 * over 90 days, contracts with older A/R and its biggest older balance. Clicking a company
 * switches the page to it. Collapsed by default. With one company selected it shows a single
 * line with a way back to all companies, so the row never disappears.
 */
export function BillingCompanyBreakdown({
  entityIds,
  rows,
  overdue,
  onPick,
  selectedId = null,
  loading = false,
  onShowAll,
}: {
  entityIds: readonly number[];
  rows: AgingReportRow[];
  overdue: AgingOverdueItem[];
  onPick: (entityId: number) => void;
  /** Company the page is filtered to; null = All companies. */
  selectedId?: number | null;
  /** Data is being fetched: numbers become skeletons, the toggle stays usable. */
  loading?: boolean;
  onShowAll?: () => void;
}) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const open = selectedId == null && stored;

  const companies = useMemo(() => {
    const grand = rows.reduce((s, r) => s + (r.projectTotal || 0), 0);
    return entityIds.map((id) => {
      const mine = rows.filter((r) => r.entityId === id);
      const late = overdue.filter((it) => it.entityId === id);
      const total = mine.reduce((s, r) => s + (r.projectTotal || 0), 0);
      const over90 = mine.reduce((s, r) => s + (r.buckets["91-120 Days"] ?? 0) + (r.buckets[">120 Days"] ?? 0), 0);
      const older = late.reduce((s, it) => s + (it.netDollars || 0), 0);
      const biggest = late.reduce<AgingOverdueItem | null>(
        (b, it) => (!b || (it.netDollars || 0) > (b.netDollars || 0) ? it : b),
        null,
      );
      return {
        id,
        name: COMPANY_SHORT[id] ?? String(id),
        total,
        share: grand > 0 ? total / grand : 0,
        older,
        over90,
        contracts: mine.length,
        withOlder: new Set(late.map((it) => it.contractId)).size,
        biggest,
      };
    });
  }, [entityIds, rows, overdue]);

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[#fafbfc] lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h3 className="text-[14px] font-semibold text-ink">By company</h3>
          {selectedId != null ? (
            <span className="text-[12px] text-ink-muted">Showing {COMPANY_SHORT[selectedId] ?? selectedId} only</span>
          ) : loading ? (
            <Skeleton className="h-3.5 w-56 self-center" />
          ) : (
            <span className="text-[12px] text-ink-muted">
              {companies.map((c) => `${c.name} ${short(c.total)}`).join(" · ")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {open ? (
            <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-ink-muted" aria-hidden>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-[#86b6ef]" />
                Current
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-[#d97706]" />
                Over 30 days
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-[#9a3412]" />
                Over 90 days
              </span>
            </span>
          ) : null}
          {selectedId != null ? (
            onShowAll ? (
              <button
                type="button"
                onClick={onShowAll}
                className="inline-flex h-[28px] items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-[#1565c0] transition-colors hover:border-[#c7d7ee] hover:bg-[#f5f9ff]"
              >
                Compare all companies →
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="inline-flex h-[28px] items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-[#1565c0] transition-colors hover:border-[#c7d7ee] hover:bg-[#f5f9ff]"
            >
              {open ? "Hide companies" : "Show companies"}
              <Chevron up={open} />
            </button>
          )}
        </div>
      </div>

      {open && loading ? (
        <div
          className="grid grid-cols-1 gap-2.5 px-5 pb-[18px] md:grid-cols-3"
          aria-busy="true"
          aria-label="Loading companies"
        >
          {entityIds.map((id) => (
            <div
              key={id}
              className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--border-subtle)] bg-white px-3.5 py-3"
            >
              <span className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-ink">{COMPANY_SHORT[id] ?? id}</span>
                <Skeleton className="h-3 w-16" />
              </span>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : open ? (
        <div className="grid grid-cols-1 gap-2.5 px-5 pb-[18px] md:grid-cols-3">
          {companies.map((c) => {
            const current = Math.max(0, c.total - c.older);
            const mid = Math.max(0, c.older - c.over90);
            const big = c.biggest ? splitProjectName(c.biggest.projectName ?? c.biggest.contractId) : null;
            const bigNo = c.biggest
              ? (c.biggest.internalProjectNumber ?? big?.number ?? c.biggest.projectNumber)
              : null;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                title={`Show ${c.name} only`}
                className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-white px-3.5 py-3 text-left transition-[border-color,box-shadow] hover:border-[#c7d7ee] hover:shadow-[0_2px_8px_rgba(30,136,229,0.08)]"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{c.name}</span>
                  <span className="text-[12px] text-ink-muted">{(c.share * 100).toFixed(1)}% of A/R</span>
                </span>
                <span className="text-[18px] font-semibold tabular-nums text-ink">{money(c.total)}</span>
                <span
                  className="flex h-2 w-full gap-[2px]"
                  role="img"
                  aria-label={`${c.name}: current ${money(current)}, 30 to 90 days ${money(mid)}, over 90 days ${money(c.over90)}`}
                >
                  {[
                    { v: current, color: "#86b6ef", label: "Current" },
                    { v: mid, color: "#d97706", label: "30–90 days" },
                    { v: c.over90, color: "#9a3412", label: "Over 90 days" },
                  ]
                    .filter((s) => s.v > 0)
                    .map((s) => (
                      <i
                        key={s.label}
                        title={`${s.label}: ${money(s.v)}`}
                        className="block h-full first:rounded-l last:rounded-r"
                        style={{ flex: s.v, background: s.color }}
                      />
                    ))}
                </span>
                <span className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[12px] text-ink-muted">
                  <span>
                    Over 30 days <b className="font-semibold tabular-nums text-[#8a4b00]">{short(c.older)}</b>
                  </span>
                  <span>
                    Over 90 <b className="font-semibold tabular-nums text-ink">{short(c.over90)}</b>
                  </span>
                  <span>
                    Contracts <b className="font-semibold tabular-nums text-ink">{c.contracts}</b>
                  </span>
                  <span>
                    With older A/R <b className="font-semibold tabular-nums text-ink">{c.withOlder}</b>
                  </span>
                </span>
                {c.biggest && big ? (
                  <span className="truncate border-t border-dashed border-[var(--border-subtle)] pt-[7px] text-[12px] text-ink-muted">
                    Biggest:{" "}
                    <b className="font-medium text-ink">
                      {bigNo ? `${bigNo} · ` : ""}
                      {big.name}
                    </b>{" "}
                    · {short(c.biggest.netDollars || 0)}
                  </span>
                ) : null}
                <span className="text-[12px] font-medium text-[#1565c0]">Show {c.name} only →</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
