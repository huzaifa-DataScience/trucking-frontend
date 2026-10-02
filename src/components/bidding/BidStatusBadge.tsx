import type { BidStatus } from "@/lib/bidding/types";

const LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  archived: "Archived",
};

const STYLES: Record<BidStatus, { wrap: string; dot: string }> = {
  draft: {
    wrap: "border-peach-border bg-peach-fill text-ink",
    dot: "bg-brand",
  },
  submitted: {
    wrap: "border-info-border bg-info-tint text-info",
    dot: "bg-info",
  },
  archived: {
    wrap: "border-ink/10 bg-ink/[0.05] text-ink/60",
    dot: "bg-ink/35",
  },
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${style.wrap}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
