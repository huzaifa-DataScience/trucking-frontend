"use client";

import Link from "next/link";
import {
  BID_HANDOFF_STAGES,
  type BidChromeStage,
  type BidWorkflow,
} from "@/lib/bidding/process-types";

function TabLink({
  href,
  active,
  colorClass,
  children,
}: {
  href: string;
  active: boolean;
  colorClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
        active ? `font-semibold ${colorClass ?? "text-ink"}` : "font-medium text-ink/55 hover:text-ink"
      }`}
    >
      {children}
      {active ? (
        <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${colorClass ? "bg-current" : "bg-brand"}`} />
      ) : null}
    </Link>
  );
}

/** PDF stage strip — Pre always; Post only after Outcome pick. §0 */
export function BidStageStrip({
  bidId,
  active,
  processStage,
  workflow,
}: {
  bidId: string;
  active: BidChromeStage;
  processStage?: string | null;
  workflow?: BidWorkflow | null;
}) {
  const showOutcome = workflow?.showOutcomeTab !== false;

  const preStages = BID_HANDOFF_STAGES.filter(
    (s) => s.id !== "result" || showOutcome
  );

  return (
    <nav aria-label="Bid workflow stages" className="flex flex-col gap-3">
      <div role="tablist" aria-label="Bid stage" className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]">
        {preStages.map((t) => (
          <TabLink key={t.id} href={`/bidding/${bidId}?stage=${t.id}`} active={active === t.id}>
            {t.label}
          </TabLink>
        ))}
        {workflow?.showAward ? (
          <>
            <TabLink
              href={`/bidding/${bidId}?stage=award`}
              active={active === "award"}
              colorClass="text-emerald-700"
            >
              Awarded
            </TabLink>
            <TabLink href={`/production/${bidId}`} active={active === "production"}>
              Production
            </TabLink>
          </>
        ) : null}
        {workflow?.showLost ? (
          <TabLink href={`/bidding/${bidId}?stage=lost`} active={active === "lost"}>
            Lost
          </TabLink>
        ) : null}
      </div>
    </nav>
  );
}
