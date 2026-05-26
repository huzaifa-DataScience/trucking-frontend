"use client";

import Link from "next/link";
import { use } from "react";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { formatMoney } from "@/lib/bidding/mock-data";
import { getMockBid } from "@/lib/bidding/mock-data";

const PROPOSAL_LINES = [
  { section: "Ductwork (Mechanical Insulation)", amount: 0 },
  { section: "HVAC Piping (Mechanical Insulation)", amount: 0 },
  { section: "Plumbing (Mechanical Insulation)", amount: 1000 },
  { section: "Ladders Last — 5%", amount: 50 },
];

export default function BidReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const bid = getMockBid(id);
  if (!bid) return null;

  const grandTotal = PROPOSAL_LINES.reduce((s, l) => s + l.amount, 0) + bid.pjEstimate * 0.02;

  return (
    <div className="bid-animate-in space-y-6">
      <Card className="overflow-hidden border-brand/15 bg-gradient-to-br from-surface via-surface to-brand/[0.04]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
              Proposal preview
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {formatMoney(bid.pjEstimate)}
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink/55">
              PJ estimate is the customer-facing number. MIKE path: {formatMoney(bid.mikeEstimate)} for
              internal comparison.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BidStatusBadge status={bid.status} />
            <button
              type="button"
              className="rounded-xl border border-ink/10 bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/30"
            >
              Export PDF
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-secondary"
            >
              Mark submitted
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Proposal breakdown" subtitle="Proposal Sheet tab" />
          <ul className="space-y-3">
            {PROPOSAL_LINES.map((line) => (
              <li
                key={line.section}
                className="flex items-center justify-between gap-4 border-b border-ink/[0.05] pb-3 last:border-0"
              >
                <span className="text-sm text-ink/70">{line.section}</span>
                <span className="font-mono text-sm font-semibold text-ink">
                  {formatMoney(line.amount)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-2">
              <span className="font-semibold text-ink">Indicative total</span>
              <span className="font-mono text-lg font-bold text-brand">{formatMoney(grandTotal)}</span>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Readiness checklist" />
          <ul className="space-y-3 text-sm">
            {[
              ["Startup complete", true],
              ["Base bid & wage selected", true],
              ["Labor worksheet calculated", true],
              ["Quantities (Mike sheet)", false],
              ["Exclusions attached", false],
            ].map(([label, done]) => (
              <li key={String(label)} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    done ? "bg-emerald-500/15 text-emerald-700" : "bg-ink/[0.06] text-ink/30"
                  }`}
                >
                  {done ? "✓" : "·"}
                </span>
                <span className={done ? "text-ink" : "text-ink/45"}>{label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex justify-start">
        <Link href={`/bidding/${id}/labor`} className="text-sm font-medium text-ink/50 hover:text-ink">
          ← Labor
        </Link>
      </div>
    </div>
  );
}
