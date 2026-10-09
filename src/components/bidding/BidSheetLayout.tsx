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
  type BidChromeStage,
} from "@/lib/bidding/process-types";
import { BID_STAGE_ICONS } from "@/components/bidding/BidStageIcons";
import { TogalConnectRail } from "@/components/bidding/TogalConnectRail";
import {
  SECONDARY_COLLAPSED_KEY,
  SIDEBAR_SECONDARY_COLLAPSED_W,
  SIDEBAR_SECONDARY_W,
} from "@/components/dashboard/Sidebar";

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

function stageRailLinkClass(active: boolean, collapsed: boolean) {
  return `flex cursor-pointer items-center rounded-[var(--radius)] text-[13px] font-medium transition-colors ${
    collapsed
      ? "h-9 w-9 justify-center"
      : "h-9 gap-2.5 px-2.5"
  } ${
    active
      ? collapsed
        ? "bg-brand-tint text-ink"
        : "bg-brand-tint text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
      : "text-ink-muted hover:bg-canvas hover:text-ink"
  }`;
}

function StageRailLink({
  href,
  label,
  stageId,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  stageId: BidChromeStage;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = BID_STAGE_ICONS[stageId];
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={stageRailLinkClass(active, collapsed)}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="min-w-0 truncate">{label}</span> : null}
    </Link>
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
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);
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
        setSecondaryCollapsed(localStorage.getItem(SECONDARY_COLLAPSED_KEY) === "1");
      } catch {
        /* ignore */
      }
    };
    readCollapsed();
    window.addEventListener("sidebar-collapsed-change", readCollapsed);
    window.addEventListener("secondary-collapsed-change", readCollapsed);
    return () => {
      window.removeEventListener("sidebar-collapsed-change", readCollapsed);
      window.removeEventListener("secondary-collapsed-change", readCollapsed);
    };
  }, []);

  const toggleSecondaryCollapsed = () => {
    // Keep side effects out of setState updaters (Strict Mode may invoke them twice).
    let next = !secondaryCollapsed;
    try {
      next = localStorage.getItem(SECONDARY_COLLAPSED_KEY) !== "1";
      localStorage.setItem(SECONDARY_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setSecondaryCollapsed(next);
    window.dispatchEvent(new Event("secondary-collapsed-change"));
  };

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

  /** Left offset follows primary collapse; width follows secondary collapse. */
  const secondaryLeft = primaryCollapsed ? "left-16" : "left-64";

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Fixed second sidebar — xl+; collapsible like Estimates sub-menu */}
      {isWide ? (
        <aside
          className={`workspace-secondary-rail fixed top-0 z-30 flex h-dvh shrink-0 flex-col border-r border-[var(--border-subtle)] bg-white transition-[left,width] duration-200 ${secondaryLeft} ${
            secondaryCollapsed
              ? `${SIDEBAR_SECONDARY_COLLAPSED_W} min-w-12 max-w-12`
              : `${SIDEBAR_SECONDARY_W} min-w-[232px] max-w-[232px]`
          }`}
          aria-label="Estimate and stages"
          data-collapsible="true"
          data-collapsed={secondaryCollapsed ? "true" : "false"}
        >
          <div
            className={`flex h-14 shrink-0 items-center border-b border-[var(--border-subtle)] ${
              secondaryCollapsed ? "justify-center px-1" : "justify-between gap-2 px-3"
            }`}
          >
            {!secondaryCollapsed ? (
              <span className="text-[12px] font-semibold text-ink-muted">Estimate</span>
            ) : null}
            <button
              type="button"
              onClick={toggleSecondaryCollapsed}
              title={secondaryCollapsed ? "Expand stages menu" : "Collapse stages menu"}
              aria-label={secondaryCollapsed ? "Expand stages menu" : "Collapse stages menu"}
              aria-expanded={!secondaryCollapsed}
              className={`inline-flex cursor-pointer shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-canvas text-ink transition hover:border-ink/20 hover:bg-[#eef1f5] ${
                secondaryCollapsed ? "h-9 w-9 shadow-sm" : "h-8 w-8 text-ink-muted"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  secondaryCollapsed ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                aria-hidden
              >
                <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${
              secondaryCollapsed ? "items-center px-1 py-2" : "px-2 py-3"
            }`}
          >
            {!secondaryCollapsed ? (
              <>
                <div className="mb-3 space-y-1.5 border-b border-[var(--border-subtle)] px-2.5 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={goBackToBids}
                      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-canvas px-2 text-[12.5px] font-semibold text-ink transition hover:border-ink/20 hover:bg-[#eef1f5]"
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

                <p className="cs-rail-section mb-1 px-2.5">Bid stages</p>
              </>
            ) : (
              <button
                type="button"
                onClick={goBackToBids}
                title="Back to Bids"
                aria-label="Back to Bids"
                className="mb-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius)] text-ink-muted transition hover:bg-canvas hover:text-ink"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <nav className={`space-y-0.5 ${secondaryCollapsed ? "flex w-full flex-col items-center" : ""}`}>
              {BID_HANDOFF_STAGES.map((s) => {
                const active = stage === s.id;
                const Icon = BID_STAGE_ICONS[s.id];
                return (
                  <Link
                    key={s.id}
                    href={stageHref(s.id)}
                    title={s.label}
                    aria-label={s.label}
                    className={stageRailLinkClass(active, secondaryCollapsed)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!secondaryCollapsed ? <span className="min-w-0 truncate">{s.label}</span> : null}
                  </Link>
                );
              })}
              {/* Post screens — Friday model: Lost = 1 tab; Awarded = Awarded + Production */}
              {bid.workflow?.showAward && !bid.workflow?.showLost ? (
                <>
                  <StageRailLink
                    href={stageHref("award")}
                    label="Awarded"
                    stageId="award"
                    active={stage === "award"}
                    collapsed={secondaryCollapsed}
                  />
                  <StageRailLink
                    href={stageHref("production")}
                    label="Production"
                    stageId="production"
                    active={stage === "production"}
                    collapsed={secondaryCollapsed}
                  />
                </>
              ) : null}
              {bid.workflow?.showLost && !bid.workflow?.showAward ? (
                <StageRailLink
                  href={stageHref("lost")}
                  label="Lost"
                  stageId="lost"
                  active={stage === "lost"}
                  collapsed={secondaryCollapsed}
                />
              ) : null}
            </nav>

            <div className="mt-auto pt-3">
              <TogalConnectRail collapsed={secondaryCollapsed} />
            </div>
          </div>
        </aside>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        {/* Compact chrome on small screens / tablet — xl+ uses the secondary rail */}
        <div className="flex flex-col gap-2 border-0 pb-0 xl:hidden sm:gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={goBackToBids}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-canvas px-2 text-[12.5px] font-semibold text-ink transition hover:border-ink/20 hover:bg-[#eef1f5] sm:gap-1.5 sm:px-2.5 sm:text-[13px]"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Bids</span>
                </button>
                <h1 className="truncate text-[16px] font-semibold tracking-tight text-ink sm:text-[18px]">
                  {bid.estimateNumber}
                </h1>
                <BidStatusBadge status={bid.status} size="sm" />
              </div>
              <p className="mt-0.5 truncate text-[12.5px] font-medium text-ink sm:mt-1 sm:text-[13px]">
                {bid.bidName || "Untitled estimate"}
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <BidSaveButton />
            </div>
          </div>
          <BidStageStrip
            bidId={bid.id}
            active={stage}
            processStage={processStage}
            workflow={bid.workflow}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 sm:pb-24 xl:pb-28">
          {children}
        </div>
      </div>

      {/* Phone: bottom dock. sm+: corner stack */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-[var(--border-subtle)] bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:flex-col sm:items-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
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
