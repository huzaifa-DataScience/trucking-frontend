"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidListCard } from "@/components/bidding/BidListCard";
import { KpiStat } from "@/components/ui/KpiStat";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCardGrid, SkeletonStatRow } from "@/components/ui/Skeleton";
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

export default function BiddingListPage() {
  const { companyId } = useCompany();
  const { canRead, canWrite } = useBiddingAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
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
      });
      setBids(list);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load bids"));
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, search]);

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
          title="Bidding sheet"
          subtitle="Base Bid estimator — team, wage rates, systems, and live MIKE/PJ totals."
        />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view the bidding list."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
      <PageHeader
        title="Bidding sheet"
        subtitle="Base Bid estimator — team, wage rates, systems, and live MIKE/PJ totals."
        action={
          canWrite ? (
            <Link href="/bidding/new" className={buttonClasses("secondary")}>
              <span className="text-lg leading-none" aria-hidden>
                +
              </span>
              New estimate
            </Link>
          ) : undefined
        }
      />

      {loading && bids.length === 0 ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiStat
            label="Estimates"
            value={counts.total}
            active={status === "all"}
            onClick={() => setStatus("all")}
          />
          <KpiStat
            label="Drafts"
            value={counts.draft}
            active={status === "draft"}
            onClick={() => toggleStatus("draft")}
          />
          <KpiStat
            label="Submitted"
            value={counts.submitted}
            active={status === "submitted"}
            onClick={() => toggleStatus("submitted")}
          />
          <KpiStat
            label="Archived"
            value={counts.archived}
            active={status === "archived"}
            onClick={() => toggleStatus("archived")}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                status === f.value
                  ? "bg-ink text-white"
                  : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink/45">
            Sort
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              aria-label="Sort bids"
            >
              <option value="updated">Last updated</option>
              <option value="estimate">Estimate #</option>
            </select>
          </label>
          <input
            type="search"
            placeholder="Search estimate #, job, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-72"
          />
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
            <BidListCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}
    </div>
  );
}
