"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidListCard } from "@/components/bidding/BidListCard";
import { MOCK_BIDS } from "@/lib/bidding/mock-data";
import type { BidStatus } from "@/lib/bidding/types";

const STATUS_FILTERS: { value: "all" | BidStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "submitted", label: "Submitted" },
];

export default function BiddingListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BidStatus>("all");

  const bids = useMemo(() => {
    return MOCK_BIDS.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        b.estimateNumber.toLowerCase().includes(q) ||
        b.bidName.toLowerCase().includes(q) ||
        b.companyName.toLowerCase().includes(q)
      );
    });
  }, [search, status]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 bid-animate-in">
      <PageHeader
        title="Bidding sheet"
        subtitle="Build estimates with live labor, wage, and proposal insight — the same flow as your Excel workbook, without leaving the app."
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

      {bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-surface/80 px-8 py-16 text-center">
          <p className="text-sm font-medium text-ink/60">No bids match your filters.</p>
          <Link href="/bidding/new" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
            Start a new estimate
          </Link>
        </div>
      ) : (
        <div className="bid-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bids.map((bid) => (
            <BidListCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-ink/35">
        Prototype UI — connect to <code className="rounded bg-ink/[0.04] px-1">/bids</code> API when backend is ready.
      </p>
    </div>
  );
}
