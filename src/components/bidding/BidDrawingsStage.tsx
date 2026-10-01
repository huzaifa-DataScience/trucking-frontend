"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta } from "@/lib/bidding/process-types";

/** Chrome tab after Setup, before Spec sheets — every drawing (attachments), by revision phase. */
export function BidDrawingsStage() {
  const { bid, editable, saving } = useProcessDraft();
  const { uploadAttachment, deleteAttachment } = useBidSheet();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  if (!bid) return null;

  const categoryIds = meta?.drawingCategories?.length
    ? meta.drawingCategories
    : ["sd", "dd", "cd", "ifb", "ifp", "ifc", "ifr"];
  const withCd = categoryIds.includes("cd") ? categoryIds : [...categoryIds, "cd"];
  const drawingCategoryOptions = withCd.map((id) => ({
    value: id,
    label: meta?.drawingCategoryLabels?.[id] ?? (id === "cd" ? "CD" : id),
  }));
  const drawings = (bid.attachments ?? []).filter((a) => a.label === "drawings");

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header>
        <h2 className="intake-title">Drawings</h2>
        <p className="intake-sub mt-0.5">
          Every drawing on this bid — SD, DD, IFB, IFP, IFC, IFR. Separate from the general Attachments tab.
        </p>
      </header>

      <BidAttachmentsSection
        attachments={drawings}
        isEditable={editable}
        uploading={saving}
        onUpload={async (file, opts) => uploadAttachment(file, opts)}
        onDelete={async (id) => deleteAttachment(id)}
        mode="drawings"
        drawingCategoryOptions={drawingCategoryOptions}
      />
    </div>
  );
}
