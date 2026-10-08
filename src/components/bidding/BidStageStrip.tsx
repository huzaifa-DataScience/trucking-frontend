"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  BID_HANDOFF_STAGES,
  normalizeProcessStage,
  type BidChromeStage,
  type BidWorkflow,
} from "@/lib/bidding/process-types";

function tabQueryStage(tab: { id: string; stage?: string | null }): BidChromeStage {
  if (tab.id === "specs" || tab.id === "spec_sheets") return "spec_sheets";
  if (tab.id === "handoff" || tab.stage === "estimating_setup") return "estimating_setup";
  return normalizeProcessStage(tab.stage || tab.id);
}

const COMPACT_LABEL: Partial<Record<BidChromeStage, string>> = {
  intake: "Intake",
  assignment: "Assign",
  drawings: "Drawings",
  spec_sheets: "Spec sheets",
  estimating_setup: "Handoff",
  takeoff: "Takeoff",
  proposal: "Proposal",
  post_bid: "Post-Bid",
  result: "Outcome",
  award: "Awarded",
  lost: "Lost",
  production: "Production",
};

/** Soft shell — faint border, page bg, no harsh frame. */
const SHELL_STYLE: CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  width: "100%",
  maxWidth: "100%",
  minHeight: 52,
  height: 52,
  padding: "0 6px",
  margin: 0,
  backgroundColor: "transparent",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(33, 33, 33, 0.04)",
  overflow: "hidden",
};

const SCROLL_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 2,
  flex: "1 1 auto",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

function TabButton({
  active,
  tone = "default",
  onClick,
  children,
  tabRef,
}: {
  active: boolean;
  tone?: "default" | "award";
  onClick: () => void;
  children: React.ReactNode;
  tabRef?: (el: HTMLButtonElement | null) => void;
}) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    padding: "0 14px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: "none",
    transition: "background-color 180ms ease, color 180ms ease",
    ...(active
      ? tone === "award"
        ? { backgroundColor: "#D1FAE5", color: "#047857", fontWeight: 600 }
        : { backgroundColor: "#DBEAFE", color: "#1D4ED8", fontWeight: 600 }
      : { backgroundColor: "transparent", color: "#616161", fontWeight: 500 }),
  };

  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "rgba(33, 33, 33, 0.05)";
          e.currentTarget.style.color = "#212121";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#616161";
        }
      }}
    >
      {children}
    </button>
  );
}

export function BidStageStrip({
  bidId,
  active,
  processStage: _processStage,
  workflow,
}: {
  bidId: string;
  active: BidChromeStage;
  processStage?: string | null;
  workflow?: BidWorkflow | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { confirmLeaveUnsaved } = useBidSheet();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const showOutcome = workflow?.showOutcomeTab !== false;
  const takeoffOnly = user?.role === "assistant_estimator" || user?.role === "user";

  const source = takeoffOnly
    ? BID_HANDOFF_STAGES.filter((s) => s.id === "takeoff")
    : BID_HANDOFF_STAGES.filter((s) => s.id !== "result" || showOutcome);
  const tabs = source.map((s) => ({
    id: s.id,
    stage: s.id,
    label: s.label,
    compact: COMPACT_LABEL[s.id] ?? s.label,
  }));

  const go = (href: string) => {
    void (async () => {
      if (!(await confirmLeaveUnsaved())) return;
      router.push(href);
    })();
  };

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [active]);

  // Extra belt-and-suspenders: kill webkit scrollbar on the scroll node.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const style = document.createElement("style");
    style.setAttribute("data-bid-stage-tabs", "1");
    style.textContent = `
      [data-bid-stage-scroll]::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  return (
    <nav aria-label="Bid workflow stages" style={{ minWidth: 0, maxWidth: "100%" }}>
      <div style={SHELL_STYLE} className="bid-stage-tabs-shell" data-bid-stage-shell="1">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Bid stage"
          data-bid-stage-scroll="1"
          style={SCROLL_STYLE}
          className="bid-stage-tabs-scroll"
        >
          {tabs.map((t) => {
            const stage = tabQueryStage(t);
            const isActive = active === stage;
            return (
              <TabButton
                key={t.id}
                active={isActive}
                tabRef={isActive ? (el) => { activeRef.current = el; } : undefined}
                onClick={() => go(`/bidding/${bidId}?stage=${stage}`)}
              >
                <span className="sm:hidden">{t.compact}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </TabButton>
            );
          })}
          {takeoffOnly ? null : workflow?.showAward && !workflow?.showLost ? (
            <>
              <TabButton
                active={active === "award"}
                tone="award"
                tabRef={
                  active === "award"
                    ? (el) => { activeRef.current = el; }
                    : undefined
                }
                onClick={() => go(`/bidding/${bidId}?stage=award`)}
              >
                Awarded
              </TabButton>
              <TabButton
                active={active === "production"}
                tabRef={
                  active === "production"
                    ? (el) => { activeRef.current = el; }
                    : undefined
                }
                onClick={() => go(`/bidding/${bidId}?stage=production`)}
              >
                <span className="sm:hidden">Prod</span>
                <span className="hidden sm:inline">Production</span>
              </TabButton>
            </>
          ) : null}
          {takeoffOnly ? null : workflow?.showLost && !workflow?.showAward ? (
            <TabButton
              active={active === "lost"}
              tabRef={
                active === "lost" ? (el) => { activeRef.current = el; } : undefined
              }
              onClick={() => go(`/bidding/${bidId}?stage=lost`)}
            >
              Lost
            </TabButton>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
