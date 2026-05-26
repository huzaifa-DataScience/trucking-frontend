import Link from "next/link";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { formatMoney } from "@/lib/bidding/mock-data";
import type { BidSummary } from "@/lib/bidding/types";

export function BidListCard({ bid }: { bid: BidSummary }) {
  const delta = bid.pjEstimate - bid.mikeEstimate;
  const deltaLabel = delta >= 0 ? `+${formatMoney(delta)}` : formatMoney(delta);

  return (
    <Link
      href={`/bidding/${bid.id}/startup`}
      className="group bid-animate-in block rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_8px_24px_rgba(1,1,1,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-brand">{bid.estimateNumber}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-ink group-hover:text-ink">
            {bid.bidName}
          </h3>
          <p className="mt-1 text-xs text-ink/45">
            {bid.companyName} · {bid.bidDate}
          </p>
        </div>
        <BidStatusBadge status={bid.status} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink/[0.06] pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">MIKE</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{formatMoney(bid.mikeEstimate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">PJ</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{formatMoney(bid.pjEstimate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Delta</p>
          <p
            className={`mt-0.5 text-sm font-bold ${
              Math.abs(delta) / bid.mikeEstimate > 0.12 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {deltaLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand/80 to-brand-secondary transition-all duration-500"
            style={{ width: `${bid.completionPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-ink/40">{bid.completionPercent}%</span>
      </div>
    </Link>
  );
}
