"use client";

import { bidStageProgress } from "@/lib/bidding/stage-progress";
import { teamColorForId } from "@/lib/bidding/team-colors";

export function BidStageProgressBar({
  processStage,
  teamId,
  compact = false,
  showLabel = true,
  /** Clearstory list: plain stage label + brand bar (no per-stage rainbow chips). */
  tone = "clearstory",
}: {
  processStage?: string | null;
  teamId?: number | null;
  compact?: boolean;
  showLabel?: boolean;
  tone?: "clearstory" | "vivid";
}) {
  const progress = bidStageProgress(processStage);
  const team = teamColorForId(teamId ?? null);
  const barClass =
    tone === "vivid"
      ? progress.bar || team.bar
      : progress.urgent
        ? "bg-brand-secondary"
        : "bg-brand";

  return (
    <div className={compact ? "min-w-0 space-y-1" : "min-w-[8rem] space-y-1.5"}>
      {showLabel ? (
        <div className="flex items-center justify-between gap-2">
          {tone === "vivid" ? (
            <span
              className={`inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${progress.chip}`}
            >
              {progress.label}
            </span>
          ) : (
            <span className="max-w-full truncate text-[13px] font-medium text-ink">
              {progress.label}
            </span>
          )}
          <span className="cs-helper shrink-0 tabular-nums">{progress.percent}%</span>
        </div>
      ) : null}
      <div
        className={`overflow-hidden rounded-full bg-canvas ${compact ? "h-1" : "h-1.5"}`}
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${progress.label}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
