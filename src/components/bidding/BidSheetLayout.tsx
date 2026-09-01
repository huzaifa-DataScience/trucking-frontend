"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { BidStageStrip } from "@/components/bidding/BidStageStrip";
import { BidHandoffActions } from "@/components/bidding/BidHandoffActions";
import { BidActivityPanel } from "@/components/bidding/BidActivityPanel";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  formatOutcome,
  formatProcessStage,
  formatWorkType,
  parseChromeStage,
} from "@/lib/bidding/process-types";

/** Shared bid chrome — BIDDING_FRONTEND_API.md §0 (PDF stages + handoff) */
export function BidSheetLayout({ children }: { children: ReactNode }) {
  const { bid, saving, initialLoading } = useBidSheet();
  const searchParams = useSearchParams();
  const stage = parseChromeStage(
    searchParams.get("stage"),
    searchParams.get("tab"),
    bid?.processStage ?? bid?.process?.stage
  );

  if (initialLoading || !bid) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
      </div>
    );
  }

  const processStage =
    bid.processStage ?? bid.process?.stage ?? bid.workflow?.stage ?? null;
  const work = bid.workType ?? bid.process?.workType ?? null;
  const outcome =
    bid.outcomeStatus ?? bid.process?.outcome ?? bid.workflow?.outcome ?? "open";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bid-animate-in">
      <div className="flex flex-col gap-3">
        <Link
          href="/bidding"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-brand"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Bids
        </Link>
        <PageHeader
          title={bid.estimateNumber}
          subtitle={bid.bidName || "Untitled estimate"}
          action={
            <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-xs text-ink/50">
                {formatWorkType(work ?? undefined)}
                {" · "}
                {formatProcessStage(processStage ?? undefined)}
                {" · "}
                {formatOutcome(outcome ?? undefined)}
              </span>
              <BidStatusBadge status={bid.status} />
              {saving ? (
                <span className="text-xs font-medium text-brand">Saving…</span>
              ) : null}
              <span className="hidden text-sm text-ink/45 sm:inline">
                {bid.companyName}
              </span>
            </div>
          }
        />
        <BidStageStrip
          bidId={bid.id}
          active={stage}
          processStage={processStage}
          workflow={bid.workflow}
        />
        <BidHandoffActions />
        <BidActivityPanel />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
