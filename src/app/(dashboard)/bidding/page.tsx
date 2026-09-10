"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidListCard } from "@/components/bidding/BidListCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCardGrid } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useCompany } from "@/contexts/CompanyContext";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidListItem, BidStatus } from "@/lib/bidding/types";

type StatusFilter = "all" | BidStatus;
type SortKey = "updated" | "estimate";

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

/** Underline-only filter select — gray bottom line on all of them, brand orange (matching the tabs) on the focused one. */
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
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? prefix}
        className="h-10 w-full appearance-none border-0 border-b border-ink/15 bg-transparent pr-6 text-sm font-medium text-ink outline-none transition focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {prefix}: {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
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
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const counts = useMemo(() => {
    const byStatus: Record<BidStatus, number> = { draft: 0, submitted: 0, archived: 0 };
    for (const bid of bids) byStatus[bid.status] += 1;
    return { total: bids.length, ...byStatus };
  }, [bids]);

  const visibleBids = useMemo(() => {
    const filtered = status === "all" ? bids : bids.filter((b) => b.status === status);
    return [...filtered].sort((a, b) =>
      sortKey === "estimate"
        ? a.estimateNumber.localeCompare(b.estimateNumber, undefined, { numeric: true })
        : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [bids, status, sortKey]);

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
            <p className="text-2xl font-semibold leading-none text-ink">{counts.total}</p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">Total estimates</p>
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
          <div className="w-36">
            <FilterSelect prefix="Work type" value={workType} onChange={setWorkType} options={WORK_TYPE_FILTERS} />
          </div>
          <div className="w-32">
            <FilterSelect prefix="Stage" value={processStage} onChange={setProcessStage} options={STAGE_FILTERS} />
          </div>
          <div className="w-36">
            <FilterSelect prefix="Outcome" value={outcome} onChange={setOutcome} options={OUTCOME_FILTERS} />
          </div>
          <div className="w-40">
            <FilterSelect
              prefix="Sort"
              value={sortKey}
              onChange={(v) => setSortKey(v as SortKey)}
              ariaLabel="Sort bids"
              options={[
                { value: "updated", label: "Last updated" },
                { value: "estimate", label: "Estimate #" },
              ]}
            />
          </div>

          <div className="w-full sm:ml-auto sm:w-[320px]">
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
        </div>
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
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
      ) : (
        <div className="ui-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBids.map((bid) => (
            <BidListCard key={bid.id} bid={bid} hideDraftChip={status === "draft"} />
          ))}
        </div>
      )}
    </div>
  );
}
