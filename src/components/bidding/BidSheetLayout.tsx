"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { BidStageStrip } from "@/components/bidding/BidStageStrip";
import {
  BidHandoffActions,
  BidSaveButton,
} from "@/components/bidding/BidHandoffActions";
import { BidCommentsPanel } from "@/components/bidding/BidCommentsPanel";
import { BidActivityPanel } from "@/components/bidding/BidActivityPanel";
import { BidSidebarDrawer, BidFloatingButton } from "@/components/bidding/BidSidebarDrawer";
import { BidSheetSkeleton } from "@/components/ui/Skeleton";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  BID_HANDOFF_STAGES,
  formatOutcome,
  formatProcessStage,
  formatWorkType,
  parseChromeStage,
} from "@/lib/bidding/process-types";
import { SIDEBAR_SECONDARY_W } from "@/components/dashboard/Sidebar";

const SIDEBAR_COLLAPSED_KEY = "construction-logistics-sidebar-collapsed";

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

function HandoffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        d="M4 12h12M12 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shared bid chrome — BIDDING_FRONTEND_API.md §0 (PDF stages + handoff) */
export function BidSheetLayout({ children }: { children: ReactNode }) {
  const { bid, initialLoading, unsavedChanges, confirmLeaveUnsaved } =
    useBidSheet();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activityOpen, setActivityOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [notesManualOpen, setNotesManualOpen] = useState(false);
  const [primaryCollapsed, setPrimaryCollapsed] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const notesFromQuery =
    searchParams.get("notes") === "1" ||
    searchParams.get("openNotes") === "1" ||
    Boolean(searchParams.get("commentId"));
  const notesOpen = notesManualOpen || notesFromQuery;
  const stage = parseChromeStage(
    searchParams.get("stage"),
    searchParams.get("tab"),
    bid?.processStage ?? bid?.process?.stage
  );
  const statusParam = searchParams.get("status");

  useEffect(() => {
    const readCollapsed = () => {
      try {
        setPrimaryCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
      } catch {
        /* ignore */
      }
    };
    readCollapsed();
    window.addEventListener("sidebar-collapsed-change", readCollapsed);
    return () => window.removeEventListener("sidebar-collapsed-change", readCollapsed);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const closeNotes = () => {
    setNotesManualOpen(false);
    if (!notesFromQuery && !searchParams.get("commentId")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("notes");
    next.delete("openNotes");
    next.delete("commentId");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (!bid?.status) return;
    if (searchParams.get("status") === bid.status) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("status", bid.status);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [bid?.status, pathname, router, searchParams]);

  if (initialLoading || !bid) {
    return <BidSheetSkeleton />;
  }

  const processStage =
    bid.processStage ?? bid.process?.stage ?? bid.workflow?.stage ?? null;
  const work = bid.workType ?? bid.process?.workType ?? null;
  const outcome =
    bid.outcomeStatus ?? bid.process?.outcome ?? bid.workflow?.outcome ?? "open";

  const stageHref = (stageId: string) => {
    const statusQs =
      statusParam && statusParam !== "all"
        ? `&status=${encodeURIComponent(statusParam)}`
        : bid.status
          ? `&status=${encodeURIComponent(bid.status)}`
          : "";
    return `/bidding/${bid.id}?stage=${stageId}${statusQs}`;
  };

  const goBackToBids = () => {
    void (async () => {
      if (!(await confirmLeaveUnsaved())) return;
      router.push("/bidding");
    })();
  };

  /** Secondary stays full width; only its left offset follows primary collapse. */
  const secondaryLeft = primaryCollapsed ? "left-16" : "left-64";

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Fixed second sidebar — xl+ only; never collapsible itself */}
      {isWide ? (
        <aside
          className={`workspace-secondary-rail fixed top-0 z-30 flex h-dvh ${SIDEBAR_SECONDARY_W} min-w-[232px] max-w-[232px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-white transition-[left] duration-200 ${secondaryLeft}`}
          aria-label="Estimate and stages"
          data-collapsible="false"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
            <div className="mb-3 space-y-1.5 border-b border-[var(--border-subtle)] px-2.5 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={goBackToBids}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-canvas px-2 text-[12.5px] font-semibold text-ink transition hover:border-ink/20 hover:bg-[#eef1f5]"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Bids
                </button>
                <h1 className="text-[15px] font-semibold tracking-tight text-ink">
                  {bid.estimateNumber}
                </h1>
                <BidStatusBadge status={bid.status} size="sm" />
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink">
                {bid.bidName || "Untitled estimate"}
              </p>
              <p className="text-[12px] leading-relaxed text-ink-muted">
                {formatWorkType(work ?? undefined)}
                {" · "}
                {formatProcessStage(processStage ?? undefined)}
                {" · "}
                {formatOutcome(outcome ?? undefined)}
              </p>
              {bid.companyName ? (
                <p className="text-[12px] text-ink-muted">{bid.companyName}</p>
              ) : null}
              {bid.canEdit === false ? (
                <span className="inline-flex rounded-[var(--radius)] border border-[var(--border-subtle)] bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                  View only
                </span>
              ) : null}
            </div>

            <div className="mb-3">
              <BidSaveButton fullWidth />
            </div>

            <p className="cs-rail-section mb-1 px-2.5">
              Bid stages
            </p>
            <nav className="space-y-0.5">
              {BID_HANDOFF_STAGES.map((s) => {
                const active = stage === s.id;
                return (
                  <Link
                    key={s.id}
                    href={stageHref(s.id)}
                    className={`flex h-9 items-center rounded-[var(--radius)] px-2.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-brand-tint text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                        : "text-ink-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </Link>
                );
              })}
              {/* Post screens — Friday model: Lost = 1 tab; Awarded = Awarded + Production */}
              {bid.workflow?.showAward && !bid.workflow?.showLost ? (
                <>
                  <Link
                    href={stageHref("award")}
                    className={`flex h-9 items-center rounded-[var(--radius)] px-2.5 text-[13px] font-medium transition-colors ${
                      stage === "award"
                        ? "bg-brand-tint text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                        : "text-ink-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    Awarded
                  </Link>
                  <Link
                    href={stageHref("production")}
                    className={`flex h-9 items-center rounded-[var(--radius)] px-2.5 text-[13px] font-medium transition-colors ${
                      stage === "production"
                        ? "bg-brand-tint text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                        : "text-ink-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    Production
                  </Link>
                </>
              ) : null}
              {bid.workflow?.showLost && !bid.workflow?.showAward ? (
                <Link
                  href={stageHref("lost")}
                  className={`flex h-9 items-center rounded-[var(--radius)] px-2.5 text-[13px] font-medium transition-colors ${
                    stage === "lost"
                      ? "bg-brand-tint text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                      : "text-ink-muted hover:bg-canvas hover:text-ink"
                  }`}
                >
                  Lost
                </Link>
              ) : null}
            </nav>
          </div>
        </aside>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Compact chrome on small screens only */}
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-3 xl:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={goBackToBids}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-canvas px-2.5 text-[13px] font-semibold text-ink transition hover:border-ink/20 hover:bg-[#eef1f5]"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Bids
                </button>
                <h1 className="text-[18px] font-semibold tracking-tight text-ink">
                  {bid.estimateNumber}
                </h1>
                <BidStatusBadge status={bid.status} />
              </div>
              <p className="mt-1 text-[13px] font-medium text-ink">
                {bid.bidName || "Untitled estimate"}
              </p>
            </div>
            <BidSaveButton />
          </div>
          <BidStageStrip
            bidId={bid.id}
            active={stage}
            processStage={processStage}
            workflow={bid.workflow}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-28">
          {children}
        </div>
      </div>

      <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        <BidFloatingButton
          label="Notes"
          icon={<NotesIcon />}
          active={notesOpen}
          onClick={() => {
            if (notesOpen) closeNotes();
            else setNotesManualOpen(true);
          }}
        />
        <BidFloatingButton
          label="Handoff"
          icon={<HandoffIcon />}
          active={handoffOpen}
          onClick={() => setHandoffOpen((v) => !v)}
        />
        <BidFloatingButton
          label="Activity"
          icon={<ActivityIcon />}
          active={activityOpen}
          onClick={() => setActivityOpen((v) => !v)}
        />
      </div>

      <BidSidebarDrawer title="Notes" open={notesOpen} onClose={closeNotes}>
        <BidCommentsPanel highlightCommentId={searchParams.get("commentId")} />
      </BidSidebarDrawer>

      <BidSidebarDrawer
        title="Handoff"
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
      >
        <BidHandoffActions />
      </BidSidebarDrawer>

      <BidSidebarDrawer
        title="Activity"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        badge={
          bid.activitySummary?.changeCount != null ? (
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold text-ink-muted">
              {bid.activitySummary.changeCount} changes
            </span>
          ) : undefined
        }
      >
        <BidActivityPanel open={activityOpen} />
      </BidSidebarDrawer>
    </div>
  );
}
