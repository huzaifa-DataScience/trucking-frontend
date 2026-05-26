"use client";

import { notFound } from "next/navigation";
import { use, useMemo } from "react";
import { BidWizardLayout } from "@/components/bidding/BidWizardLayout";
import { getMockBid } from "@/lib/bidding/mock-data";
import type { BidInsights } from "@/lib/bidding/types";

export default function BidWizardRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const bid = getMockBid(id);
  if (!bid) notFound();

  const insights: BidInsights = useMemo(
    () => ({
      mikeEstimate: bid.mikeEstimate,
      pjEstimate: bid.pjEstimate,
      costPerHourMike: bid.costPerHour,
      costPerHourPj: bid.costPerHour * 1.085,
      marginPercent: bid.marginPercent,
      wageTotal: 37.29,
      liftTotal: 1815,
      completionPercent: bid.completionPercent,
    }),
    [bid]
  );

  return (
    <BidWizardLayout bid={bid} insights={insights}>
      {children}
    </BidWizardLayout>
  );
}
