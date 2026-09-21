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

  const drawingCategoryOptions = (meta?.drawingCategories ?? []).map((id) => ({
    value: id,
    label: meta?.drawingCategoryLabels?.[id] ?? id,
  }));
  const drawings = (bid.attachments ?? []).filter((a) => a.label === "drawings");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Drawings</h2>
        <p className="mt-0.5 text-sm text-ink/50">
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
