import {
  BID_HANDOFF_STAGES,
  formatProcessStage,
  normalizeProcessStage,
  type BidChromeStage,
} from "@/lib/bidding/process-types";

export type StageProgress = {
  stageId: BidChromeStage;
  label: string;
  index: number;
  total: number;
  percent: number;
  /** Tailwind classes for label chip */
  chip: string;
  bar: string;
  urgent?: boolean;
};

const STAGE_COLORS: Record<string, { chip: string; bar: string; urgent?: boolean }> = {
  intake: { chip: "bg-brand-tint text-brand-secondary", bar: "bg-brand" },
  assignment: { chip: "bg-[#eef1ff] text-[#3d52a0]", bar: "bg-[#7c9cff]" },
  drawings: { chip: "bg-[#f3f4f6] text-[#4b5563]", bar: "bg-[#9ca3af]" },
  spec_sheets: { chip: "bg-[#f3f4f6] text-[#4b5563]", bar: "bg-[#6b7280]" },
  estimating_setup: { chip: "bg-[#ecfdf5] text-[#047857]", bar: "bg-[#059669]" },
  takeoff: {
    chip: "bg-[#fef3c7] text-[#92400e]",
    bar: "bg-[#f59e0b]",
    urgent: true,
  },
  proposal: {
    chip: "bg-[#fde68a] text-[#78350f]",
    bar: "bg-[#e8893a]",
    urgent: true,
  },
  post_bid: {
    chip: "bg-[#fee2e2] text-[#991b1b]",
    bar: "bg-[#ef4444]",
    urgent: true,
  },
  result: { chip: "bg-[#d1fae5] text-[#065f46]", bar: "bg-[#10b981]" },
  award: { chip: "bg-[#d1fae5] text-[#065f46]", bar: "bg-[#059669]" },
  lost: { chip: "bg-[#f3f4f6] text-[#6b7280]", bar: "bg-[#9ca3af]" },
  production: { chip: "bg-[#e0e7ff] text-[#3730a3]", bar: "bg-[#6366f1]" },
};

/** Progress through Intake → Outcome (handoff chrome stages). */
export function bidStageProgress(
  processStage: string | null | undefined
): StageProgress {
  const stageId = normalizeProcessStage(processStage);
  const index = Math.max(
    0,
    BID_HANDOFF_STAGES.findIndex((s) => s.id === stageId)
  );
  const total = BID_HANDOFF_STAGES.length;
  const percent = Math.min(100, Math.round(((index + 1) / total) * 100));
  const colors = STAGE_COLORS[stageId] ?? STAGE_COLORS.intake!;
  return {
    stageId,
    label: formatProcessStage(stageId) || "—",
    index,
    total,
    percent,
    chip: colors.chip,
    bar: colors.bar,
    urgent: colors.urgent,
  };
}
