import Link from "next/link";
import { formatDate } from "@/lib/bidding/format";
import {
  formatProcessStage,
  formatWorkType,
} from "@/lib/bidding/process-types";
import type { BidListItem, BidStatus } from "@/lib/bidding/types";

const STATUS_CHIP_CLASSES: Record<BidStatus, string> = {
  draft: "border-[#f0c396] bg-[#fdf3e9] text-[#a15c1a]",
  submitted: "border-info-border bg-info-tint text-info",
  archived: "border-ink/10 bg-ink/[0.04] text-ink/55",
};

const STATUS_LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  archived: "Archived",
};

export function BidListCard({
  bid,
  hideDraftChip = false,
}: {
  bid: BidListItem;
  /** Omit the status chip when the active list filter already implies it (e.g. the Draft tab). */
  hideDraftChip?: boolean;
}) {
  const showChip = !(hideDraftChip && bid.status === "draft");

  // Only include values that actually exist — the formatters fall back to
  // "—" for missing data, which we don't want to surface in the meta row.
  const metaParts: string[] = [];
  if (bid.companyName) metaParts.push(bid.companyName);
  if (bid.workType) metaParts.push(formatWorkType(bid.workType));
  if (bid.processStage) metaParts.push(formatProcessStage(bid.processStage));

  return (
    <Link
      href={`/bidding/${bid.id}?stage=${encodeURIComponent(
        String(bid.processStage || "intake")
      )}`}
      className="group ui-animate-in flex min-h-[164px] cursor-pointer flex-col justify-between rounded-2xl border border-white/70 bg-white/45 p-6 shadow-[0_6px_16px_rgba(255,123,17,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl transition hover:border-[rgba(255,123,17,0.35)] hover:bg-white/70"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-xl font-semibold leading-tight text-ink">
            {bid.bidName || "Untitled estimate"}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {showChip ? (
              <span
                className={`inline-flex h-7 items-center rounded-full border px-3 text-[13px] font-semibold ${STATUS_CHIP_CLASSES[bid.status]}`}
              >
                {STATUS_LABELS[bid.status]}
              </span>
            ) : null}
            {bid.canEdit === false ? (
              <span className="text-[11px] font-medium text-ink/40">
                View only
              </span>
            ) : null}
            {bid.isNew ? (
              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                New
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-[13px] text-ink/40">{bid.estimateNumber}</p>
        {metaParts.length ? (
          <p className="mt-3 truncate text-[13px] text-ink/50">{metaParts.join(" · ")}</p>
        ) : null}
      </div>

      <p className="text-[13px] text-ink/35">Updated {formatDate(bid.updatedAt.slice(0, 10))}</p>
    </Link>
  );
}
