"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidListCard } from "@/components/bidding/BidListCard";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useCompany } from "@/contexts/CompanyContext";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidListItem, BidStatus } from "@/lib/bidding/types";

const STATUS_FILTERS: { value: "all" | BidStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "archived", label: "Archived" },
];

export default function BiddingListPage() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BidStatus>("all");
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entityId = companyId ? Number(companyId) : undefined;

  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await biddingApi.listBids({
        status: status === "all" ? undefined : status,
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
  }, [status, entityId, search]);

  useEffect(() => {
    const t = setTimeout(() => void loadBids(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadBids, search]);

  const emptyMessage = useMemo(() => {
    if (error) return error;
    if (search.trim()) return "No bids match your search.";
    if (status !== "all") return "No bids with this status.";
    return "No estimates yet.";
  }, [error, search, status]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 bid-animate-in">
      <PageHeader
        title="Bidding sheet"
        subtitle="Base Bid estimator — team, wage rates, systems, and live MIKE/PJ totals from the backend calculator."
        action={
          <Link
            href="/bidding/new"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            New estimate
          </Link>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
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
        <input
          type="search"
          placeholder="Search estimate #, job, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-80"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LogoLoader />
        </div>
      ) : bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-surface/80 px-8 py-16 text-center">
          <p className="text-sm font-medium text-ink/60">{emptyMessage}</p>
          {!error ? (
            <Link
              href="/bidding/new"
              className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
            >
              Start a new estimate
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="bid-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bids.map((bid) => (
            <BidListCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}
    </div>
  );
}
