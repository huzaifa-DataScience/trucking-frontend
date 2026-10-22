"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BidSheetForm } from "@/components/bidding/BidSheetForm";
import { BidIntakeStage } from "@/components/bidding/BidIntakeStage";
import { BidAssignmentStage } from "@/components/bidding/BidAssignmentStage";
import { BidEstimatingSetupStage } from "@/components/bidding/BidEstimatingSetupStage";
import { BidDrawingsStage } from "@/components/bidding/BidDrawingsStage";
import { BidTakeoffComparisonPanel } from "@/components/bidding/BidTakeoffComparisonPanel";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { BidSystemsInputTable } from "@/components/bidding/BidSystemsInputTable";
import { parseSystemsComputed } from "@/lib/bidding/parse-computed";
import { BidSpecSheetsStage } from "@/components/bidding/BidSpecSheetsStage";
import { BidIntelTab } from "@/components/bidding/BidIntelTab";
import { BidOutcomeStage } from "@/components/bidding/BidOutcomeStage";
import { BidAwardTab } from "@/components/bidding/BidAwardTab";
import { BidLostStage } from "@/components/bidding/BidLostStage";
import { SpecsPage } from "@/components/bidding/specs/SpecsPage";
import { ProductionPage } from "@/components/bidding/production/ProductionPage";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { parseChromeStage } from "@/lib/bidding/process-types";

function BidWorkspaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bid, isEditable, updateSystemRow } = useBidSheet();
  const { user } = useAuth();
  const { draft, setField, editable: processEditable } = useProcessDraft();
  const bidId = bid?.id ?? "";
  const stage = parseChromeStage(
    searchParams.get("stage"),
    searchParams.get("tab"),
    bid?.processStage ?? bid?.process?.stage
  );
  const takeoffOnly = user?.role === "assistant_estimator" || user?.role === "user";

  useEffect(() => {
    if (!bidId) return;
    const tab = searchParams.get("tab");
    const hasStage = searchParams.get("stage");
    if (tab && !hasStage) {
      router.replace(`/bidding/${bidId}?stage=${takeoffOnly ? "takeoff" : stage}`);
    }
  }, [bidId, router, searchParams, stage, takeoffOnly]);

  useEffect(() => {
    if (!bidId || !takeoffOnly || stage === "takeoff") return;
    router.replace(`/bidding/${bidId}?stage=takeoff`);
  }, [bidId, router, stage, takeoffOnly]);

  // Post screens only when workflow allows — else send to Outcome tab.
  // Awarded / Lost / Production stay in bid chrome so the stage rail opens real content.
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

  if (!bid || (takeoffOnly && stage !== "takeoff")) {
    return (
      <div className="flex-1 py-2">
        <FormSkeleton fields={5} />
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
    case "drawings":
      return <BidDrawingsStage />;
    case "spec_sheets":
      return <BidSpecSheetsStage />;
    case "takeoff": {
      return (
        <div className="intake-compact flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto">
          {/*
            shrink-0 on blocks: .intake-section uses overflow:hidden, so default
            flex-shrink collapses Specs qty (and siblings) to ~0 in this column.
          */}
          <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="intake-title">Takeoff</h2>
              <p className="intake-sub mt-0.5">
                Compare estimator recaps in fixed Group A / Group B boxes, then
                systems and Mike specs.
              </p>
            </div>
            <section className="intake-section max-w-xs min-w-[12rem] shrink-0 !mb-0">
              <div className="intake-section-body !py-2">
                <label className="intake-row !mb-0">
                  <span className="intake-label">Turn-in date</span>
                  <DatePicker
                    ariaLabel="Internal bid date"
                    className="intake-field"
                    disabled={!processEditable}
                    value={draft.internalBidDate?.slice(0, 10) ?? ""}
                    onChange={(v) => setField("internalBidDate", v || null)}
                  />
                </label>
              </div>
            </section>
          </header>

          <div className="shrink-0">
            <BidTakeoffComparisonPanel />
          </div>

          <div className="shrink-0">
            <BidSystemsInputTable
              systems={bid.systems ?? []}
              systemsComputed={parseSystemsComputed(bid.computed)}
              isEditable={isEditable}
              onUpdateRow={updateSystemRow}
            />
          </div>

          <div className="min-w-0 shrink-0">
            <SpecsPage bidId={bidId} embedded />
          </div>
        </div>
      );
    }
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
        <div className="flex-1 py-2">
          <FormSkeleton fields={5} />
        </div>
      }
    >
      <BidWorkspaceInner />
    </Suspense>
  );
}
