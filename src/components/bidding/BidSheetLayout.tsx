"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { BidStageStrip } from "@/components/bidding/BidStageStrip";
import {
  BidHandoffActions,
  BidSaveButton,
} from "@/components/bidding/BidHandoffActions";
import { BidActivityPanel } from "@/components/bidding/BidActivityPanel";
import { BidSidebarDrawer, BidFloatingButton } from "@/components/bidding/BidSidebarDrawer";
import { BidSheetSkeleton } from "@/components/ui/Skeleton";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  formatOutcome,
  formatProcessStage,
  formatWorkType,
  parseChromeStage,
} from "@/lib/bidding/process-types";

function ActivityIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  );
}

/** Shared bid chrome — BIDDING_FRONTEND_API.md §0 (PDF stages + handoff) */
export function BidSheetLayout({ children }: { children: ReactNode }) {
  const { bid, saving, initialLoading, unsavedChanges, confirmLeaveUnsaved } =
    useBidSheet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activityOpen, setActivityOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const stage = parseChromeStage(
    searchParams.get("stage"),
    searchParams.get("tab"),
    bid?.processStage ?? bid?.process?.stage
  );

  if (initialLoading || !bid) {
    return <BidSheetSkeleton />;
  }

  const processStage =
    bid.processStage ?? bid.process?.stage ?? bid.workflow?.stage ?? null;
  const work = bid.workType ?? bid.process?.workType ?? null;
  const outcome =
    bid.outcomeStatus ?? bid.process?.outcome ?? bid.workflow?.outcome ?? "open";

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col gap-4 bid-animate-in">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            void (async () => {
              if (!(await confirmLeaveUnsaved())) return;
              router.push("/bidding");
            })();
          }}
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
          {unsavedChanges ? (
            <span className="text-[10px] font-semibold text-amber-700">
              · unsaved
            </span>
          ) : null}
        </button>
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
              {bid.canEdit === false ? (
                <span className="rounded-lg border border-ink/10 bg-ink/[0.04] px-2 py-1 text-[11px] font-semibold text-ink/55">
                  View only
                </span>
              ) : null}
              {saving ? (
                <span className="text-xs font-medium text-brand">Saving…</span>
              ) : null}
              <span className="hidden text-sm text-ink/45 sm:inline">
                {bid.companyName}
              </span>
              <BidSaveButton />
            </div>
          }
        />
        <BidStageStrip
          bidId={bid.id}
          active={stage}
          processStage={processStage}
          workflow={bid.workflow}
        />
      </div>

      <div className="flex min-h-0 w-full max-w-[1520px] flex-1 flex-col">
        {children}
      </div>
    </div>

    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2.5">
      <BidFloatingButton
        label="Notes"
        icon={<NotesIcon />}
        active={notesOpen}
        onClick={() => setNotesOpen((v) => !v)}
      />
      <BidFloatingButton
        label="Activity"
        icon={<ActivityIcon />}
        active={activityOpen}
        onClick={() => setActivityOpen((v) => !v)}
      />
    </div>

    <BidSidebarDrawer title="Notes" open={notesOpen} onClose={() => setNotesOpen(false)}>
      <BidHandoffActions />
    </BidSidebarDrawer>

    <BidSidebarDrawer
      title="Activity"
      open={activityOpen}
      onClose={() => setActivityOpen(false)}
      badge={
        bid.activitySummary?.changeCount != null ? (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold text-ink/50">
            {bid.activitySummary.changeCount} changes
          </span>
        ) : undefined
      }
    >
      <BidActivityPanel open={activityOpen} />
    </BidSidebarDrawer>
    </>
  );
}
