"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BidSheetForm } from "@/components/bidding/BidSheetForm";
import { BidIntakeStage } from "@/components/bidding/BidIntakeStage";
import { BidAssignmentStage } from "@/components/bidding/BidAssignmentStage";
import { BidEstimatingSetupStage } from "@/components/bidding/BidEstimatingSetupStage";
import { BidDrawingsStage } from "@/components/bidding/BidDrawingsStage";
import { BidTakeoffComparisonPanel } from "@/components/bidding/BidTakeoffComparisonPanel";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { TogalProjectBar } from "@/components/bidding/TogalPanels";
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
  const { bid, isEditable, updateSystemRow, uploadAttachment, uploadAttachments, deleteAttachment, saving } = useBidSheet();
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
      const hasComparison =
        Array.isArray(bid.workflow?.takeoffComparisons) &&
        (bid.workflow?.takeoffComparisons?.length ?? 0) > 0;
      return (
        <div className="intake-compact flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto">
          <header>
            <h2 className="intake-title">Takeoff</h2>
          </header>
          <TogalProjectBar pull />
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
            <section className="intake-section min-w-0">
              <h3 className="intake-section-head">Internal bid date</h3>
              <div className="intake-section-body">
                <label className="intake-row">
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
            <section className="intake-section min-w-0">
              <h3 className="intake-section-head">Scope status</h3>
              <div className="intake-section-body flex flex-col gap-2">
                <p className="text-[11px] text-[#6b7280]">
                  Mark each scope done or none — replaces a separate turn-in email sheet.
                </p>
                {(draft.takeoffAssignments ?? []).length === 0 ? (
                  <p className="text-[12.5px] text-[#9ca3af]">No takeoff assignments yet.</p>
                ) : (
                  (draft.takeoffAssignments ?? []).map((row, index) => {
                    const role = String(row.role ?? `scope-${index}`);
                    const status =
                      row.status === "done" || row.status === "none" ? row.status : "";
                    return (
                      <div
                        key={`${role}-${index}`}
                        className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2"
                      >
                        <span className="truncate text-[12.5px] font-medium text-[#1f2937]">
                          {role}
                          {row.assigneeName ? (
                            <span className="font-normal text-[#6b7280]">
                              {" "}
                              · {row.assigneeName}
                            </span>
                          ) : null}
                        </span>
                        <select
                          className="intake-field appearance-none"
                          disabled={!processEditable}
                          value={status}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next = [...(draft.takeoffAssignments ?? [])];
                            next[index] = {
                              ...row,
                              status: v === "done" || v === "none" ? v : null,
                            };
                            setField("takeoffAssignments", next);
                          }}
                        >
                          <option value="">—</option>
                          <option value="done">Done</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
          <BidAttachmentsSection
            title="Takeoff files"
            attachments={(bid.attachments ?? []).filter(
              (a) =>
                a.category === "takeoff_markup" ||
                a.label === "takeoff" ||
                a.label === "takeoff-zip" ||
                a.label === "takeoff-snap" ||
                a.label === "takeoff-recap" ||
                a.label === "master-scan"
            )}
            isEditable={isEditable}
            uploading={saving}
            mode="markup"
            onUpload={async (file, opts) => uploadAttachment(file, opts)}
            onUploadMany={async (files, opts) => uploadAttachments(files, opts)}
            onDelete={async (id) => deleteAttachment(id)}
          />
          <div
            className={`grid grid-cols-1 items-start gap-3 ${
              hasComparison ? "xl:grid-cols-2" : ""
            }`}
          >
            <BidTakeoffComparisonPanel />
            <div className={hasComparison ? "min-w-0" : "min-w-0 xl:col-span-full"}>
              <BidSystemsInputTable
                systems={bid.systems ?? []}
                systemsComputed={parseSystemsComputed(bid.computed)}
                isEditable={isEditable}
                onUpdateRow={updateSystemRow}
              />
            </div>
          </div>
          <SpecsPage bidId={bidId} embedded />
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
