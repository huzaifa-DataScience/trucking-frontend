"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BILLING_COMPANY_PARAM,
  BILLING_NAV_KEY,
  billingNavItems,
  billingReturnHref,
  type BillingNavContext,
} from "@/lib/billing-nav";
import { getSitelineAgingOverduePage, getSitelineAgingReportPage } from "@/lib/api/endpoints/siteline";

const COMPANY_NAMES: Record<number, string> = { 1: "GOEL", 2: "GOEL DC", 3: "DCB" };

// sessionStorage as an external store: no server value, stable string snapshot on the client.
const subscribe = () => () => {};
const getSnapshot = () => {
  try {
    return sessionStorage.getItem(BILLING_NAV_KEY);
  } catch {
    return null;
  }
};
const getServerSnapshot = () => null;

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Billing project page top line: Back (returns to the exact Billing list), breadcrumb
 * Billing › Company › List, what Back restores, and previous / next through that list.
 * Without a saved list (e.g. a shared link), Back goes to plain Billing and the arrows hide.
 */
export function BillingProjectNav({ contractId, entityId }: { contractId: string; entityId: number | null }) {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const nav = useMemo<BillingNavContext | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BillingNavContext;
    } catch {
      return null;
    }
  }, [raw]);

  // The Billing tables are paged on the server, so the saved list may be just the page the user was on.
  // Fetch the whole ordered list (ids + names only) once, then keep it for the next projects.
  const [fullItems, setFullItems] = useState<{ key: string; items: BillingNavContext["items"] } | null>(null);
  useEffect(() => {
    if (!nav?.query || nav.complete || !raw) return;
    let cancelled = false;
    const { entityIds, filters, sortBy, sortDir } = nav.query;
    const query = { entityIds, sortBy, sortDir, all: true, nav: true } as const;
    const load =
      nav.list === "aging"
        ? getSitelineAgingReportPage(filters, query).then((r) => ("rows" in r ? r.rows : null))
        : getSitelineAgingOverduePage(filters, query).then((r) => ("items" in r ? r.items : null));
    load
      .then((rows) => {
        if (cancelled || !rows) return;
        const items = billingNavItems(rows);
        setFullItems({ key: raw, items });
        try {
          sessionStorage.setItem(BILLING_NAV_KEY, JSON.stringify({ ...nav, items, complete: true }));
        } catch {
          /* storage blocked: this page still has the full list */
        }
      })
      .catch(() => {
        /* keep the saved page: prev / next still work within it */
      });
    return () => {
      cancelled = true;
    };
  }, [nav, raw]);

  const haveFull = Boolean(fullItems && fullItems.key === raw);
  const items = haveFull ? fullItems!.items : (nav?.items ?? []);
  // Until the whole list arrives, `items` is one page: show the position in the whole list anyway.
  const partial = !haveFull && !nav?.complete && nav?.total != null;
  const index = nav ? items.findIndex((i) => i.id === contractId) : -1;
  const inList = index >= 0;
  const prev = inList && index > 0 ? items[index - 1] : null;
  const next = inList && index < items.length - 1 ? items[index + 1] : null;
  const position = (partial ? (nav!.offset ?? 0) : 0) + index + 1;
  const listLength = partial ? nav!.total! : items.length;
  const backHref = inList ? billingReturnHref : "/billings";
  const company = entityId != null ? COMPANY_NAMES[entityId] : null;
  const href = (id: string) => `/billings/projects/${encodeURIComponent(id)}`;

  const crumbLink =
    "rounded px-1 py-0.5 font-medium text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand-secondary";
  const arrow =
    "inline-flex h-[26px] min-w-[26px] items-center justify-center gap-1 rounded-full px-2 font-medium text-ink-muted transition-colors hover:bg-[#f3f4f6] hover:text-ink";

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={backHref}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-white pl-2 pr-2.5 text-[13px] font-medium text-ink transition-colors hover:border-[#d1d5db] hover:bg-[#f3f4f6]"
        >
          <span className="text-ink-muted">
            <Chevron dir="left" />
          </span>
          Back
        </Link>

        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-0.5 text-[12.5px]">
            <li className="hidden sm:inline-flex">
              <Link href="/billings" className={crumbLink}>
                Billing
              </Link>
            </li>
            {company ? (
              <li className="inline-flex items-center">
                <span aria-hidden className="mx-0.5 hidden text-ink-soft sm:inline">
                  ›
                </span>
                <button
                  type="button"
                  className={`${crumbLink} inline-flex items-center gap-1.5`}
                  onClick={() => {
                    router.push(`/billings?${BILLING_COMPANY_PARAM}=${entityId}`);
                  }}
                  title={`Show ${company} billing`}
                >
                  <span className="h-[7px] w-[7px] rounded-[2px] bg-[#5598e7]" aria-hidden />
                  {company}
                </button>
              </li>
            ) : null}
            {inList ? (
              <li className="inline-flex items-center">
                <span aria-hidden className="mx-0.5 text-ink-soft">›</span>
                <Link href={billingReturnHref} className={crumbLink}>
                  {nav!.listLabel}
                </Link>
              </li>
            ) : null}
          </ol>
        </nav>

        {inList && nav!.chips.length ? (
          <span className="hidden flex-wrap items-center gap-1 md:inline-flex" aria-label="Back restores these filters">
            {nav!.chips.map((c) => (
              <span key={c} className="inline-flex h-5 items-center rounded-full bg-[#f3f4f6] px-2 text-[11.5px] font-medium text-ink-muted">
                {c}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {inList && listLength > 1 ? (
        <div className="flex items-center gap-2">
          {next ? (
            <span className="hidden max-w-[16rem] truncate text-[11.5px] text-ink-soft lg:inline" aria-hidden>
              Next: {next.label}
            </span>
          ) : null}
          <div
            role="group"
            aria-label="Move between projects"
            className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-white p-0.5 text-[13px]"
          >
            {prev ? (
              <Link href={href(prev.id)} className={arrow} aria-label={`Previous project: ${prev.label}`} title={prev.label}>
                <Chevron dir="left" />
              </Link>
            ) : (
              <span className={`${arrow} pointer-events-none opacity-35`} aria-hidden>
                <Chevron dir="left" />
              </span>
            )}
            <span className="px-1.5 text-[12px] tabular-nums text-ink-muted">
              {position} of {listLength}
            </span>
            {next ? (
              <Link href={href(next.id)} className={arrow} aria-label={`Next project: ${next.label}`} title={next.label}>
                Next
                <Chevron dir="right" />
              </Link>
            ) : (
              <span className={`${arrow} pointer-events-none opacity-35`} aria-hidden>
                Next
                <Chevron dir="right" />
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
