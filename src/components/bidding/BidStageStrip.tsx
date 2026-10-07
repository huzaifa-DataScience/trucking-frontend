"use client";

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

function pillLabel(pill: string | null | undefined): string | null {
  if (pill === "complete") return "Done";
  if (pill === "in_progress") return "In progress";
  if (pill === "todo") return "To do";
  return null;
}

function TabButton({
  active,
  colorClass,
  onClick,
  children,
  pill,
}: {
  active: boolean;
  colorClass?: string;
  onClick: () => void;
  children: React.ReactNode;
  pill?: string | null;
}) {
  const pillText = pillLabel(pill);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
        active
          ? `font-semibold ${colorClass ?? "text-ink"}`
          : "font-medium text-ink/55 hover:text-ink"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {pillText ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              pill === "complete"
                ? "bg-emerald-50 text-emerald-800"
                : pill === "in_progress"
                  ? "bg-brand/10 text-brand"
                  : "bg-ink/[0.06] text-ink/45"
            }`}
          >
            {pillText}
          </span>
        ) : null}
      </span>
      {active ? (
        <span
          className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${
            colorClass ? "bg-current" : "bg-brand"
          }`}
        />
      ) : null}
    </button>
  );
}

/** Stage strip — order from workflow.tabs when the server sends it. */
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
  const showOutcome = workflow?.showOutcomeTab !== false;
  const takeoffOnly = user?.role === "assistant_estimator" || user?.role === "user";

  const pillById = new Map((workflow?.tabs ?? []).map((t) => [t.id, t.pill ?? null]));
  const source = takeoffOnly
    ? BID_HANDOFF_STAGES.filter((s) => s.id === "takeoff")
    : BID_HANDOFF_STAGES.filter((s) => s.id !== "result" || showOutcome);
  const tabs = source.map((s) => ({
    id: s.id,
    stage: s.id,
    label: s.label,
    pill: pillById.get(s.id) ?? pillById.get(s.id === "spec_sheets" ? "specs" : s.id) ?? null,
  }));

  const go = (href: string) => {
    void (async () => {
      if (!(await confirmLeaveUnsaved())) return;
      router.push(href);
    })();
  };

  return (
    <nav aria-label="Bid workflow stages" className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Bid stage"
        className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]"
      >
        {tabs.map((t) => {
          const stage = tabQueryStage(t);
          return (
            <TabButton
              key={t.id}
              active={active === stage}
              pill={t.pill}
              onClick={() => go(`/bidding/${bidId}?stage=${stage}`)}
            >
              {t.label}
            </TabButton>
          );
        })}
        {takeoffOnly ? null : workflow?.showAward && !workflow?.showLost ? (
          <>
            <TabButton
              active={active === "award"}
              colorClass="text-emerald-700"
              onClick={() => go(`/bidding/${bidId}?stage=award`)}
            >
              Awarded
            </TabButton>
            <TabButton
              active={active === "production"}
              onClick={() => go(`/bidding/${bidId}?stage=production`)}
            >
              Production
            </TabButton>
          </>
        ) : null}
        {takeoffOnly ? null : workflow?.showLost && !workflow?.showAward ? (
          <TabButton
            active={active === "lost"}
            onClick={() => go(`/bidding/${bidId}?stage=lost`)}
          >
            Lost
          </TabButton>
        ) : null}
      </div>
    </nav>
  );
}
