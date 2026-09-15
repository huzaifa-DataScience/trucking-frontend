"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidListCard } from "@/components/bidding/BidListCard";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCardGrid, TableSkeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useCompany } from "@/contexts/CompanyContext";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/bidding/format";
import { formatOutcome, formatProcessStage, formatWorkType } from "@/lib/bidding/process-types";
import type { BidListItem, BidStatus } from "@/lib/bidding/types";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { SavedViewTabs, conditionKey } from "@/components/filters/SavedViewTabs";
import {
  rowMatchesGroups,
  loadSavedViews,
  saveSavedViews,
  type FilterCondition,
  type FilterGroup,
  type SavedView,
} from "@/lib/filters/types";
import { BIDDING_SAVED_VIEWS_KEY, FILTER_FIELDS } from "@/lib/bidding/savedViews";
import { newId } from "@/lib/bidding/newId";

type StatusFilter = "all" | BidStatus;
type SortKey =
  | "updated"
  | "estimate"
  | "bidDate"
  | "estimator"
  | "status"
  | "workType"
  | "baseBid"
  | "contractAmount"
  | "jobStartDate"
  | "office";
type ViewMode = "tiles" | "list";

const VIEW_MODE_KEY = "bidding-view-mode";

function loadViewMode(): ViewMode {
  if (typeof window === "undefined") return "tiles";
  try {
    const v = window.localStorage.getItem(VIEW_MODE_KEY);
    return v === "list" ? "list" : "tiles";
  } catch {
    return "tiles";
  }
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "archived", label: "Archived" },
];

const WORK_TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "insulation", label: "Insulation" },
  { value: "demo", label: "Demo" },
  { value: "gc", label: "GC" },
  { value: "masonry", label: "Masonry" },
  { value: "other", label: "Other" },
];

const STAGE_FILTERS = [
  { value: "", label: "All" },
  { value: "intake", label: "Intake" },
  { value: "assignment", label: "Assignment" },
  { value: "estimating_setup", label: "Setup" },
  { value: "takeoff", label: "Takeoff" },
  { value: "proposal", label: "Proposal" },
  { value: "post_bid", label: "Post-Bid" },
  { value: "result", label: "Outcome" },
];

const OUTCOME_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "awarded", label: "Awarded" },
  { value: "lost", label: "Lost" },
  { value: "no_bid", label: "No bid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
];

/** Bordered filter chip with a custom dropdown that always opens below the trigger (native <select> lets the browser decide, which can open upward). */
function FilterSelect({
  prefix,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? prefix}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-ink/10 bg-surface pl-3 pr-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/20 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        <span className="truncate">
          {prefix}: {current?.label}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel ?? prefix}
          className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-max overflow-hidden rounded-xl border border-ink/[0.08] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected ? "bg-brand/10 font-semibold text-ink" : "font-medium text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                {prefix}: {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function BiddingListPage() {
  const { companyId } = useCompany();
  const { canRead, canWrite } = useBiddingAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [workType, setWorkType] = useState("");
  const [processStage, setProcessStage] = useState("");
  const [outcome, setOutcome] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeConditionKeys, setActiveConditionKeys] = useState<string[]>([]);

  useEffect(() => {
    setSavedViews(loadSavedViews(BIDDING_SAVED_VIEWS_KEY));
  }, []);

  /** Options for "dynamic" select filter fields (Estimator, Bid Clerk, Take Off Person, Office, …) —
   * derived from values already present on loaded bids, since these have no separate fixed lookup list.
   * "Office" here is the bid's own Company/OurEntity (GOEL / GOEL DC / DCB), not a separate concept. */
  const dynamicOptions = useMemo(() => {
    const uniqueOptions = (key: keyof BidListItem) => {
      const seen = new Set<string>();
      for (const b of bids) {
        const v = b[key];
        if (typeof v === "string" && v.trim()) seen.add(v.trim());
      }
      return [...seen].sort().map((v) => ({ value: v, label: v }));
    };
    return {
      estimator: uniqueOptions("estimator"),
      bidClerk: uniqueOptions("bidClerk"),
      takeOffPerson: uniqueOptions("takeOffPerson"),
      takeOffPerson2: uniqueOptions("takeOffPerson2"),
      takeOffPerson3: uniqueOptions("takeOffPerson3"),
      clientCompanyName: uniqueOptions("clientCompanyName"),
      contactName: uniqueOptions("contactName"),
      companyName: uniqueOptions("companyName"),
    };
  }, [bids]);

  const entityId = companyId ? Number(companyId) : undefined;

  // Fetch all statuses so the KPI strip shows true counts; status filter is client-side.
  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await biddingApi.listBids({
        entityId: entityId && !Number.isNaN(entityId) ? entityId : undefined,
        search: search.trim() || undefined,
        workType: workType || undefined,
        processStage: processStage || undefined,
        outcome: outcome || undefined,
      });
      setBids(list);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load bids"));
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, search, workType, processStage, outcome]);

  useEffect(() => {
    const t = setTimeout(() => void loadBids(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadBids, search]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* ignore storage failures */
    }
  };

  const counts = useMemo(() => {
    const byStatus: Record<BidStatus, number> = { draft: 0, submitted: 0, archived: 0 };
    for (const bid of bids) byStatus[bid.status] += 1;
    return { total: bids.length, ...byStatus };
  }, [bids]);

  const visibleBids = useMemo(() => {
    const filtered = (status === "all" ? bids : bids.filter((b) => b.status === status)).filter((b) =>
      rowMatchesGroups(b as unknown as Record<string, unknown>, filterGroups)
    );
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "estimate":
          return a.estimateNumber.localeCompare(b.estimateNumber, undefined, { numeric: true });
        case "bidDate":
          return (b.bidDate ?? "").localeCompare(a.bidDate ?? "");
        case "estimator":
          return (a.estimator ?? "").localeCompare(b.estimator ?? "");
        case "status":
          return a.status.localeCompare(b.status);
        case "workType":
          return (a.workType ?? "").localeCompare(b.workType ?? "");
        case "baseBid":
          return (b.baseBidAmount ?? -Infinity) - (a.baseBidAmount ?? -Infinity);
        case "contractAmount":
          return (b.contractAmount ?? -Infinity) - (a.contractAmount ?? -Infinity);
        case "jobStartDate":
          return (a.jobStartDate ?? "").localeCompare(b.jobStartDate ?? "");
        case "office":
          return (a.companyName ?? "").localeCompare(b.companyName ?? "");
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }, [bids, status, sortKey, filterGroups]);

  const exportToExcel = useCallback(() => {
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(
        visibleBids.map((b) => ({
          "Estimate #": b.estimateNumber,
          "Bid name": b.bidName,
          Contractor: b.clientCompanyName ?? "",
          Estimator: b.estimator ?? "",
          "Base bid": b.baseBidAmount ?? "",
          "Contract amount": b.contractAmount ?? "",
          "Job start date": b.jobStartDate ?? "",
          "Job end date": b.jobEndDate ?? "",
          Status: b.status,
          "Work type": formatWorkType(b.workType ?? undefined),
          Stage: formatProcessStage(b.processStage ?? undefined),
          Outcome: formatOutcome(b.outcomeStatus ?? undefined),
          "Bid date": b.bidDate ?? "",
          "Due date": b.dueDate ?? "",
          "Updated": b.updatedAt,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estimates");
      XLSX.writeFile(wb, "estimates-export.xlsx");
    });
  }, [visibleBids]);

  const applyFilterGroups = (groups: FilterGroup[]) => {
    setActiveConditionKeys([]);
    setFilterGroups(groups);
    setFilterOpen(false);
  };

  const saveAsView = (name: string, groups: FilterGroup[]) => {
    const view: SavedView = { id: newId(), name, groups };
    const next = [...savedViews, view];
    setSavedViews(next);
    saveSavedViews(BIDDING_SAVED_VIEWS_KEY, next);
    setFilterOpen(false);
    // Saving only creates the chips — it does not apply the filter to the table.
  };

  const findCondition = (views: SavedView[], key: string): FilterCondition | undefined => {
    const [viewId, conditionId] = key.split("::");
    const view = views.find((v) => v.id === viewId);
    return view?.groups.flatMap((g) => g.conditions).find((c) => c.id === conditionId);
  };

  const groupsForActiveKeys = (keys: string[], views: SavedView[]): FilterGroup[] =>
    keys
      .map((k) => findCondition(views, k))
      .filter((c): c is FilterCondition => Boolean(c))
      .map((c) => ({ id: newId(), conditions: [c] }));

  const toggleCondition = (viewId: string, condition: FilterCondition) => {
    const key = conditionKey(viewId, condition.id);
    setActiveConditionKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setFilterGroups(groupsForActiveKeys(next, savedViews));
      return next;
    });
  };

  const removeSavedView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    saveSavedViews(BIDDING_SAVED_VIEWS_KEY, next);
    setActiveConditionKeys((prev) => {
      const nextKeys = prev.filter((k) => !k.startsWith(`${id}::`));
      if (nextKeys.length !== prev.length) setFilterGroups(groupsForActiveKeys(nextKeys, next));
      return nextKeys;
    });
  };

  const clearView = () => {
    setActiveConditionKeys([]);
    setFilterGroups([]);
  };

  const activeFilterCount = useMemo(() => filterGroups.reduce((n, g) => n + g.conditions.length, 0), [filterGroups]);

  const emptyMessage = useMemo(() => {
    if (error) return error;
    if (search.trim()) return "No bids match your search.";
    if (status !== "all") return "No bids with this status.";
    return "No estimates yet.";
  }, [error, search, status]);

  const toggleStatus = (value: StatusFilter) =>
    setStatus((prev) => (prev === value ? "all" : value));

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader
          title="Estimates"
          subtitle="Base Bid estimator — team, wage rates, systems, and live MIKE/PJ totals."
        />
        <RestrictedState
          title="Estimates access required"
          message="You do not have permission to view the bidding list."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
      <PageHeader
        title="Estimates"
        subtitle="Track each estimate from Intake through Outcome. Awarded or Lost bids continue on from their final outcome."
        action={
          canWrite ? (
            <Link href="/bidding/new" className={buttonClasses("secondary")}>
              <span className="text-lg leading-none" aria-hidden>
                +
              </span>
              New bid
            </Link>
          ) : undefined
        }
      />

      <div className="w-fit rounded-2xl border border-ink/[0.08] bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(1,1,1,0.04)]">
        {loading && bids.length === 0 ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div>
            <p className="text-2xl font-semibold leading-none text-ink">
              {visibleBids.length}
              {visibleBids.length !== counts.total ? (
                <span className="text-base font-normal text-ink/40"> of {counts.total}</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">
              {status === "all" ? "Estimates shown" : `${STATUS_FILTERS.find((f) => f.value === status)?.label} estimates shown`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            const count = f.value === "all" ? counts.total : counts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => (f.value === "all" ? setStatus("all") : toggleStatus(f.value))}
                aria-pressed={active}
                className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
                  active ? "font-semibold text-ink" : "font-medium text-ink/55 hover:text-ink"
                }`}
              >
                {f.label}{" "}
                <span className={count === 0 ? "text-ink/30" : active ? "text-ink/50" : "text-ink/35"}>
                  {count}
                </span>
                {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="w-full sm:mr-auto sm:w-[320px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search estimate #, job, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-ink/10 bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3.5 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={visibleBids.length === 0}
            title="Export the currently filtered/sorted list to Excel"
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3.5 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>

          <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-ink/10 bg-surface p-1">
            <button
              type="button"
              onClick={() => changeViewMode("tiles")}
              aria-pressed={viewMode === "tiles"}
              title="Tile view"
              className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition ${
                viewMode === "tiles" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              Tiles
            </button>
            <button
              type="button"
              onClick={() => changeViewMode("list")}
              aria-pressed={viewMode === "list"}
              title="List view"
              className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition ${
                viewMode === "list" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      <SavedViewTabs
        views={savedViews}
        fields={FILTER_FIELDS}
        activeKeys={activeConditionKeys}
        showClear={activeConditionKeys.length > 0 || activeFilterCount > 0}
        onToggleCondition={toggleCondition}
        onRemoveView={removeSavedView}
        onClear={clearView}
      />

      {loading ? (
        viewMode === "list" ? <TableSkeleton rows={8} toolbar={false} /> : <SkeletonCardGrid count={6} />
      ) : visibleBids.length === 0 ? (
        <EmptyState
          message={emptyMessage}
          action={
            !error && canWrite ? (
              <Link
                href="/bidding/new"
                className="text-sm font-semibold text-brand hover:underline"
              >
                Start a new estimate
              </Link>
            ) : undefined
          }
        />
      ) : viewMode === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-ink/[0.08] bg-surface">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/[0.08] bg-ink/[0.02] text-xs font-semibold text-ink/50">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Estimate #</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Estimator</th>
                <th className="px-4 py-3">Work type · Stage</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Base bid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleBids.map((bid, idx) => (
                <tr
                  key={bid.id}
                  className={`border-b border-ink/[0.06] text-sm transition hover:bg-brand/[0.03] ${idx % 2 === 1 ? "bg-ink/[0.012]" : ""}`}
                >
                  <td className="max-w-[20rem] px-4 py-3">
                    <Link
                      href={`/bidding/${bid.id}?stage=intake`}
                      className="block truncate font-semibold text-ink hover:text-brand"
                    >
                      {bid.bidName || "Untitled estimate"}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink/50">{bid.estimateNumber}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-ink/70">{bid.companyName}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-ink/70">{bid.estimator || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                    {formatWorkType(bid.workType ?? undefined)} · {formatProcessStage(bid.processStage ?? undefined)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{formatOutcome(bid.outcomeStatus ?? undefined)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                    {bid.baseBidAmount != null ? formatMoney(bid.baseBidAmount) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {status === "draft" && bid.status === "draft" ? null : <BidStatusBadge status={bid.status} />}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/50">{formatDate(bid.updatedAt.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ui-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBids.map((bid) => (
            <BidListCard key={bid.id} bid={bid} hideDraftChip={status === "draft"} />
          ))}
        </div>
      )}

      <FilterSidebar
        open={filterOpen}
        fields={FILTER_FIELDS}
        title="Filter estimates"
        initialGroups={filterGroups}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilterGroups}
        onSaveAsView={saveAsView}
        dynamicOptions={dynamicOptions}
      />
    </div>
  );
}
