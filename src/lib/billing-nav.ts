/**
 * Hand-off between the Billing list and a billing project page (per browser tab, sessionStorage):
 * - which list the user came from, in its on-screen order (for prev / next and the breadcrumb), and
 * - the Billing view state (tab, filters, sort) so "Back" returns to exactly that list.
 */
import type { SitelineAgingFilters } from "@/lib/api/endpoints/siteline";

export const BILLING_NAV_KEY = "billing:project-nav";
const VIEW_KEY = "billing:view-state";
/** Query flag Billing reads on load to restore the saved view state. */
export const BILLING_RESTORE_PARAM = "restore";
/** Query param that opens Billing on one company ("1" | "2" | "3") without changing the header company. */
export const BILLING_COMPANY_PARAM = "company";

export type BillingListKind = "aging" | "overdue";

export type BillingNavContext = {
  list: BillingListKind;
  /** Breadcrumb label for the list, e.g. "A/R aging" or "Past due". */
  listLabel: string;
  /** Header company id when the user clicked ("1" | "2" | "3"), if any. */
  companyId: string | null;
  /** Short chips describing what Back will restore, e.g. `search "arena"`, `51+ days`. */
  chips: string[];
  /** The list in on-screen order (Siteline contract ids, de-duplicated). */
  items: { id: string; label: string }[];
};

export type BillingSortState = { by: string | null; dir: "asc" | "desc" };

export type BillingViewState = {
  activeTab: "contracts" | "aging" | "overdue";
  agingFilters: SitelineAgingFilters;
  overdueFilters: SitelineAgingFilters;
  agingSort: BillingSortState;
  overdueSort: BillingSortState;
  /** Billing's own company choice (null = all companies); absent in views saved before it existed. */
  companyId?: string | null;
};

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full: navigation still works, just without the extras */
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveBillingNav(nav: BillingNavContext, view: BillingViewState) {
  write(BILLING_NAV_KEY, nav);
  write(VIEW_KEY, view);
}

export const loadBillingNav = () => read<BillingNavContext>(BILLING_NAV_KEY);
export const loadBillingView = () => read<BillingViewState>(VIEW_KEY);

/** Billing URL that brings back the saved list (falls back to plain Billing if nothing is saved). */
export const billingReturnHref = `/billings?${BILLING_RESTORE_PARAM}=1`;

/** Plain-language chips for the filters that differ from the tab's defaults. */
export function describeBillingFilters(kind: BillingListKind, f: SitelineAgingFilters): string[] {
  const chips: string[] = [];
  if (f.search?.trim()) chips.push(`search "${f.search.trim()}"`);
  if (kind === "overdue" && f.minDaysPastDue != null) chips.push(`${f.minDaysPastDue}+ days`);
  if (kind === "aging" && f.overdueOnly) chips.push("past due only");
  if (kind === "aging" && f.minDaysPastDue != null) chips.push(`${f.minDaysPastDue}+ days`);
  if (f.maxDaysPastDue != null) chips.push(`up to ${f.maxDaysPastDue} days`);
  if (f.minNetDollars != null || f.maxNetDollars != null) chips.push("amount range");
  if (f.includeStatuses) chips.push(f.includeStatuses.split(",").map((s) => s.trim().toLowerCase()).join(", "));
  return chips;
}
