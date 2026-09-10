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
      className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
        active
          ? `font-semibold ${colorClass ?? "text-ink"}`
          : "font-medium text-ink/55 hover:text-ink"
      }`}
    >
      {children}
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
    if (!confirmLeaveUnsaved()) return;
    router.push(href);
  };

  return (
    <nav aria-label="Bid workflow stages" className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Bid stage"
        className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]"
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
