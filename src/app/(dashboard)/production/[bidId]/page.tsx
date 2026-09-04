"use client";

import { use } from "react";
import { ProductionPage } from "@/components/bidding/production/ProductionPage";

/**
 * Production detail stays under /production/[bidId].
 * Do not redirect into the bid estimate chrome — FRONTEND_PRODUCTION_REPORT.md list → detail.
 */
export default function ProductionDetailPage({
  params,
}: {
  params: Promise<{ bidId: string }>;
}) {
  const { bidId } = use(params);
  return <ProductionPage bidId={bidId} />;
}
