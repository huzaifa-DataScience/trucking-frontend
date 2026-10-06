import type { BidStatus } from "@/lib/bidding/types";

const LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  archived: "Archived",
};

/** Compact record-status chips — high contrast, medium weight. */
const STYLES: Record<BidStatus, { wrap: string; dot: string }> = {
  draft: {
    wrap: "border-warning-border bg-warning-tint text-warning",
    dot: "bg-warning",
  },
  submitted: {
    wrap: "border-brand/30 bg-brand-tint text-ink",
    dot: "bg-brand",
  },
  archived: {
    wrap: "border-[var(--border-subtle)] bg-canvas text-ink-muted",
    dot: "bg-ink-soft",
  },
};

export function BidStatusBadge({
  status,
  size = "md",
}: {
  status: BidStatus;
  size?: "sm" | "md";
}) {
  const style = STYLES[status];
  const sizing =
    size === "sm"
      ? "h-5 gap-1 px-1.5 text-[11px]"
      : "h-6 gap-1.5 px-2 text-[12px]";
  return (
    <span
      className={`inline-flex items-center rounded border font-medium leading-none ${sizing} ${style.wrap}`}
      title={`Record status: ${LABELS[status]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
