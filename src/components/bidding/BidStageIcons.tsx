/** Outline icons for bid stage / secondary-rail identification when collapsed. */

import type { ComponentType, ReactNode } from "react";
import type { BidChromeStage } from "@/lib/bidding/process-types";

type IconProps = { className?: string };

function StageSvg({
  className = "h-4 w-4 shrink-0",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function StageIconIntake({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconAssignment({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M13 7a4 4 0 11-8 0 4 4 0 018 0zM21 20v-1a4 4 0 00-3-3.87M17 7a4 4 0 01-8 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconDrawings({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M4 5h16v14H4V5zM4 15l4-4 3 3 4-5 5 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconSpecSheets({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M8 4h7l5 5v11a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 4v5h5M10 13h6M10 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </StageSvg>
  );
}

export function StageIconHandoff({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M4 12h12M12 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconTakeoff({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M4 20L20 4M7 7l-3 3 3 3M17 17l3-3-3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconProposal({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconPostBid({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16V10M12 16V7M16 16v-5" strokeLinecap="round" strokeLinejoin="round" />
    </StageSvg>
  );
}

export function StageIconOutcome({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </StageSvg>
  );
}

export function StageIconAward({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M8 4h8v4a4 4 0 01-8 0V4zM8 6H5l1 4h2M16 6h3l-1 4h-2M10 12v3l2 5 2-5v-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export function StageIconLost({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </StageSvg>
  );
}

export function StageIconProduction({ className }: IconProps) {
  return (
    <StageSvg className={className}>
      <path
        d="M3 20h18M5 20V10l4-3v3l4-3v13M15 20V9h4v11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StageSvg>
  );
}

export const BID_STAGE_ICONS: Record<
  BidChromeStage,
  ComponentType<{ className?: string }>
> = {
  intake: StageIconIntake,
  assignment: StageIconAssignment,
  drawings: StageIconDrawings,
  spec_sheets: StageIconSpecSheets,
  estimating_setup: StageIconHandoff,
  takeoff: StageIconTakeoff,
  proposal: StageIconProposal,
  post_bid: StageIconPostBid,
  result: StageIconOutcome,
  award: StageIconAward,
  lost: StageIconLost,
  production: StageIconProduction,
};
