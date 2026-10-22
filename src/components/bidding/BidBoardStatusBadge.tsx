import {
  formatBoardStatus,
  isBoardStatus,
  type BoardStatus,
} from "@/lib/bidding/boardStatus";

const STYLES: Record<BoardStatus, { wrap: string; dot: string }> = {
  not_started: {
    wrap: "border-[var(--border-subtle)] bg-canvas text-ink-muted",
    dot: "bg-ink-soft",
  },
  bidding: {
    wrap: "border-brand/30 bg-brand-tint text-ink",
    dot: "bg-brand",
  },
  bid_submitted: {
    wrap: "border-brand/40 bg-brand/15 text-ink",
    dot: "bg-brand",
  },
  won: {
    wrap: "border-success/30 bg-success-tint text-success",
    dot: "bg-success",
  },
  lost: {
    wrap: "border-danger/25 bg-danger-tint/40 text-danger",
    dot: "bg-danger",
  },
  no_bid: {
    wrap: "border-[var(--border-subtle)] bg-canvas text-ink-muted",
    dot: "bg-ink-soft",
  },
  on_hold: {
    wrap: "border-warning-border bg-warning-tint text-warning",
    dot: "bg-warning",
  },
  cancelled: {
    wrap: "border-[var(--border-subtle)] bg-canvas text-ink-muted",
    dot: "bg-ink-soft",
  },
};

const FALLBACK = {
  wrap: "border-[var(--border-subtle)] bg-canvas text-ink-muted",
  dot: "bg-ink-soft",
};

/** Project board status — FRONTEND_MEETING_2026-10-21.md */
export function BidBoardStatusBadge({
  status,
  size = "md",
}: {
  status: string | null | undefined;
  size?: "sm" | "md";
}) {
  if (!status) return null;
  const style = isBoardStatus(status) ? STYLES[status] : FALLBACK;
  const sizing =
    size === "sm"
      ? "h-5 gap-1 px-1.5 text-[11px]"
      : "h-6 gap-1.5 px-2 text-[12px]";
  const label = formatBoardStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded border font-medium leading-none ${sizing} ${style.wrap}`}
      title={`Status: ${label}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {label}
    </span>
  );
}
