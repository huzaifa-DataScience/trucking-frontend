import type { BidStatus } from "@/lib/bidding/types";

const STYLES: Record<BidStatus, string> = {
  draft: "bg-ink/[0.06] text-ink/70",
  in_review: "bg-amber-500/10 text-amber-800",
  submitted: "bg-brand/10 text-brand-secondary",
  won: "bg-emerald-500/10 text-emerald-800",
  lost: "bg-rose-500/10 text-rose-800",
  archived: "bg-ink/[0.04] text-ink/40",
};

const LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
