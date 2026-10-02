"use client";

import { useRouter } from "next/navigation";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  BID_HANDOFF_STAGES,
  type BidChromeStage,
  type BidWorkflow,
} from "@/lib/bidding/process-types";

function TabButton({
  active,
  colorClass,
  onClick,
  children,
}: {
  active: boolean;
  colorClass?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-3 py-2 text-[12.5px] transition focus-visible:outline-none ${
        active
          ? colorClass
            ? `bg-peach-fill font-semibold ring-1 ring-peach-border ${colorClass}`
            : "bg-peach-fill font-semibold text-ink ring-1 ring-peach-border"
          : "font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
      }`}
    >
      {children}
    </button>
  );
}

/** PDF stage strip — Pre always; Post only after Outcome pick. §0 */
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
  const { confirmLeaveUnsaved } = useBidSheet();
  const showOutcome = workflow?.showOutcomeTab !== false;

  const preStages = BID_HANDOFF_STAGES.filter(
    (s) => s.id !== "result" || showOutcome
  );

  const go = (href: string) => {
    void (async () => {
      if (!(await confirmLeaveUnsaved())) return;
      router.push(href);
    })();
  };

  return (
    <nav aria-label="Bid workflow stages">
      <div
        role="tablist"
        aria-label="Bid stage"
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white p-1.5"
      >
        {preStages.map((t) => (
          <TabButton
            key={t.id}
            active={active === t.id}
            onClick={() => go(`/bidding/${bidId}?stage=${t.id}`)}
          >
            {t.label}
          </TabButton>
        ))}
        {workflow?.showAward ? (
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
              onClick={() => go(`/production/${bidId}`)}
            >
              Production
            </TabButton>
          </>
        ) : null}
        {workflow?.showLost ? (
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
