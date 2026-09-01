"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BidSheetForm } from "@/components/bidding/BidSheetForm";
import { BidIntakeStage } from "@/components/bidding/BidIntakeStage";
import { BidAssignmentStage } from "@/components/bidding/BidAssignmentStage";
import { BidEstimatingSetupStage } from "@/components/bidding/BidEstimatingSetupStage";
import { BidSpecSheetsStage } from "@/components/bidding/BidSpecSheetsStage";
import { BidIntelTab } from "@/components/bidding/BidIntelTab";
import { BidOutcomeStage } from "@/components/bidding/BidOutcomeStage";
import { BidAwardTab } from "@/components/bidding/BidAwardTab";
import { BidLostStage } from "@/components/bidding/BidLostStage";
import { SpecsPage } from "@/components/bidding/specs/SpecsPage";
import { ProductionPage } from "@/components/bidding/production/ProductionPage";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { parseChromeStage } from "@/lib/bidding/process-types";

function BidWorkspaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bid } = useBidSheet();
  const bidId = bid?.id ?? "";
  const stage = parseChromeStage(
    searchParams.get("stage"),
    searchParams.get("tab"),
    bid?.processStage ?? bid?.process?.stage
  );

  useEffect(() => {
    if (!bidId) return;
    const tab = searchParams.get("tab");
    const hasStage = searchParams.get("stage");
    if (tab && !hasStage) {
      router.replace(`/bidding/${bidId}?stage=${stage}`);
    }
  }, [bidId, router, searchParams, stage]);

  // Post screens only when workflow allows — else send to Outcome tab
  useEffect(() => {
    if (!bidId || !bid?.workflow) return;
    if (stage === "award" && !bid.workflow.showAward) {
      router.replace(`/bidding/${bidId}?stage=result`);
    }
    if (stage === "lost" && !bid.workflow.showLost) {
      router.replace(`/bidding/${bidId}?stage=result`);
    }
    if (stage === "production" && !bid.workflow.showAward) {
      router.replace(`/bidding/${bidId}?stage=result`);
    }
  }, [bid, bidId, router, stage]);

  if (!bidId) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <LogoLoader />
      </div>
    );
  }

  switch (stage) {
    case "intake":
      return <BidIntakeStage />;
    case "assignment":
      return <BidAssignmentStage />;
    case "estimating_setup":
      return <BidEstimatingSetupStage />;
    case "spec_sheets":
      return <BidSpecSheetsStage />;
    case "takeoff":
      return <SpecsPage bidId={bidId} embedded />;
    case "proposal":
      return <BidSheetForm />;
    case "post_bid":
      return <BidIntelTab />;
    case "result":
      return <BidOutcomeStage />;
    case "award":
      return <BidAwardTab />;
    case "lost":
      return <BidLostStage />;
    case "production":
      return <ProductionPage bidId={bidId} embedded />;
    default:
      return <BidIntakeStage />;
  }
}

/** Stage body for /bidding/[id]?stage= — BIDDING_FRONTEND_API §0 */
export default function BidSheetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-16">
          <LogoLoader />
        </div>
      }
    >
      <BidWorkspaceInner />
    </Suspense>
  );
}
