import Link from "next/link";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { formatDate } from "@/lib/bidding/format";
import type { BidListItem } from "@/lib/bidding/types";

export function BidListCard({ bid }: { bid: BidListItem }) {
  return (
    <Link
      href={`/bidding/${bid.id}`}
      className="group ui-animate-in ui-shadow-card block rounded-2xl border border-ink/[0.06] bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:!shadow-[0_1px_2px_rgba(1,1,1,0.05),0_20px_40px_-20px_rgba(1,1,1,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-brand">{bid.estimateNumber}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-ink">
            {bid.bidName || "Untitled estimate"}
          </h3>
          <p className="mt-1 text-xs text-ink/45">
            {bid.companyName}
            {bid.clientCompanyName ? ` · ${bid.clientCompanyName}` : ""}
            {bid.bidDate ? ` · ${formatDate(bid.bidDate)}` : ""}
          </p>
          {bid.timeEstimate != null ? (
            <p className="mt-2 text-xs text-ink/40">
              Est. {bid.timeEstimate} hrs
              {bid.submitDate ? ` · Submit ${formatDate(bid.submitDate.slice(0, 10))}` : ""}
            </p>
          ) : null}
        </div>
        <BidStatusBadge status={bid.status} />
      </div>

      <p className="mt-4 text-xs text-ink/40">
        Updated {formatDate(bid.updatedAt.slice(0, 10))}
      </p>
    </Link>
  );
}
