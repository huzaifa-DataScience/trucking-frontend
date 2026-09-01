"use client";

import Link from "next/link";
import {
  BID_HANDOFF_STAGES,
  type BidChromeStage,
  type BidWorkflow,
} from "@/lib/bidding/process-types";

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
  const current = (workflow?.stage || processStage || "intake").toString();
  const showOutcome = workflow?.showOutcomeTab !== false;
  const showPost = Boolean(workflow?.showAward || workflow?.showLost);

  const preStages = BID_HANDOFF_STAGES.filter(
    (s) => s.id !== "result" || showOutcome
  );

  return (
    <nav aria-label="Bid workflow stages" className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/35">
        Pre
      </p>
      <ol className="flex flex-wrap items-center gap-1 text-[11px] text-ink/45">
        {preStages.map((s, i) => {
          const isActive = active === s.id;
          const isCurrent =
            current === s.id ||
            current.replace(/_/g, "") === s.id.replace(/_/g, "");
          return (
            <li key={s.id} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="mx-0.5 text-ink/25">▸</span> : null}
              <Link
                href={`/bidding/${bidId}?stage=${s.id}`}
                className={
                  isActive
                    ? "font-semibold text-brand"
                    : isCurrent
                      ? "font-semibold text-ink/70"
                      : "hover:text-ink/70"
                }
              >
                {s.short}
              </Link>
            </li>
          );
        })}
      </ol>

      {showPost ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/35">
            Post
          </p>
          <ol className="flex flex-wrap items-center gap-2 text-[11px]">
            {workflow?.showAward ? (
              <>
                <Link
                  href={`/bidding/${bidId}?stage=award`}
                  className={
                    active === "award"
                      ? "font-semibold text-emerald-700"
                      : "font-medium text-emerald-700/80 hover:text-emerald-800"
                  }
                >
                  Awarded / startup
                </Link>
                <Link
                  href={`/bidding/${bidId}?stage=production`}
                  className={
                    active === "production"
                      ? "font-semibold text-brand"
                      : "text-ink/50 hover:text-ink/70"
                  }
                >
                  Production
                </Link>
              </>
            ) : null}
            {workflow?.showLost ? (
              <Link
                href={`/bidding/${bidId}?stage=lost`}
                className={
                  active === "lost"
                    ? "font-semibold text-ink"
                    : "font-medium text-ink/60 hover:text-ink"
                }
              >
                Lost
              </Link>
            ) : null}
          </ol>
        </>
      ) : null}

      <div
        role="tablist"
        aria-label="Bid stage"
        className="flex flex-wrap items-center gap-1 rounded-2xl border border-ink/[0.08] bg-surface/80 p-1.5 shadow-[0_1px_3px_rgba(1,1,1,0.04)]"
      >
        {preStages.map((t) => {
          const on = active === t.id;
          return (
            <Link
              key={t.id}
              href={`/bidding/${bidId}?stage=${t.id}`}
              role="tab"
              aria-selected={on}
              className={`rounded-xl px-3 py-2 text-sm transition sm:px-3.5 ${
                on
                  ? "bg-brand font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)]"
                  : "font-medium text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        {workflow?.showAward ? (
          <>
            <span className="mx-1 hidden h-5 w-px bg-ink/10 sm:inline" />
            <Link
              href={`/bidding/${bidId}?stage=award`}
              role="tab"
              aria-selected={active === "award"}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                active === "award"
                  ? "bg-emerald-700 font-semibold text-white"
                  : "font-medium text-emerald-800/80 hover:bg-emerald-50"
              }`}
            >
              Awarded
            </Link>
            <Link
              href={`/bidding/${bidId}?stage=production`}
              role="tab"
              aria-selected={active === "production"}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                active === "production"
                  ? "bg-brand font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)]"
                  : "font-medium text-ink/70 hover:bg-ink/[0.04]"
              }`}
            >
              Production
            </Link>
          </>
        ) : null}
        {workflow?.showLost ? (
          <Link
            href={`/bidding/${bidId}?stage=lost`}
            role="tab"
            aria-selected={active === "lost"}
            className={`rounded-xl px-3 py-2 text-sm transition ${
              active === "lost"
                ? "bg-ink font-semibold text-white"
                : "font-medium text-ink/70 hover:bg-ink/[0.04]"
            }`}
          >
            Lost
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
