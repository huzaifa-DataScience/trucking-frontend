import Link from "next/link";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { formatDate } from "@/lib/bidding/format";
import type { BidListItem } from "@/lib/bidding/types";

export function BidListCard({ bid }: { bid: BidListItem }) {
  return (
    <Link
      href={`/bidding/${bid.id}`}
      className="group bid-animate-in block rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_8px_24px_rgba(1,1,1,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-brand">{bid.estimateNumber}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-ink">
            {bid.bidName || "Untitled estimate"}
          </h3>
          <p className="mt-1 text-xs text-ink/45">
            {bid.companyName} · {formatDate(bid.bidDate)}
          </p>
        </div>
        <BidStatusBadge status={bid.status} />
      </div>

      <p className="mt-4 text-xs text-ink/40">
        Updated {formatDate(bid.updatedAt.slice(0, 10))}
      </p>
    </Link>
  );
}
