"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidInsightStrip } from "@/components/bidding/BidInsightStrip";
import { BidWizardSteps } from "@/components/bidding/BidWizardSteps";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import type { BidDetail, BidInsights } from "@/lib/bidding/types";

export function BidWizardLayout({
  bid,
  insights,
  children,
}: {
  bid: BidDetail;
  insights: BidInsights;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 bid-animate-in">
      <div className="flex flex-col gap-4">
        <Link
          href="/bidding"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-brand"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All bids
        </Link>
        <PageHeader
          title={bid.estimateNumber}
          subtitle={bid.bidName}
          action={
            <div className="flex items-center gap-3">
              <BidStatusBadge status={bid.status} />
              <span className="hidden text-sm text-ink/45 sm:inline">{bid.companyName}</span>
            </div>
          }
        />
      </div>

      <BidInsightStrip insights={insights} />
      <BidWizardSteps bidId={bid.id} />

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
