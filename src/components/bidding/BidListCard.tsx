import Link from "next/link";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { formatDate } from "@/lib/bidding/format";
import {
  formatProcessStage,
  formatWorkType,
} from "@/lib/bidding/process-types";
import type { BidListItem } from "@/lib/bidding/types";

export function BidListCard({
  bid,
  hideDraftChip = false,
}: {
  bid: BidListItem;
  hideDraftChip?: boolean;
}) {
  const showChip = !(hideDraftChip && bid.status === "draft");

  const metaParts: string[] = [];
  if (bid.companyName) metaParts.push(bid.companyName);
  if (bid.workType) metaParts.push(formatWorkType(bid.workType));
  if (bid.processStage) metaParts.push(formatProcessStage(bid.processStage));

  return (
    <Link
      href={`/bidding/${bid.id}?stage=${encodeURIComponent(
        String(bid.processStage || "intake")
      )}`}
      className="group ui-animate-in cs-stat-card flex min-h-[140px] cursor-pointer flex-col justify-between border border-[var(--border-subtle)] bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-canvas"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-snug text-ink">
            {bid.bidName || "Untitled estimate"}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {showChip ? <BidStatusBadge status={bid.status} /> : null}
            {bid.canEdit === false ? (
              <span className="text-[11px] font-medium text-ink-soft">View only</span>
            ) : null}
            {bid.isNew ? (
              <span className="rounded-[var(--radius)] bg-brand-tint px-1.5 py-0.5 text-[11px] font-medium text-brand">
                New
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-[12px] text-ink-muted">{bid.estimateNumber}</p>
        {metaParts.length ? (
          <p className="mt-2 truncate text-[12px] text-ink-muted">{metaParts.join(" · ")}</p>
        ) : null}
      </div>

      <p className="text-[12px] text-ink-soft">Updated {formatDate(bid.updatedAt.slice(0, 10))}</p>
    </Link>
  );
}
