"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { TogalProjectBar } from "@/components/bidding/TogalPanels";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta } from "@/lib/bidding/process-types";

const DEFAULT_PHASES = ["sd", "dd", "cd", "ifb", "ifp", "ifc", "ifr"] as const;

const PHASE_SHORT: Record<string, string> = {
  sd: "SD",
  dd: "DD",
  cd: "CD",
  ifb: "IFB",
  ifp: "IFP",
  ifc: "IFC",
  ifr: "IFR",
};

/** Drawing phases with upload, download, and delete. */
export function BidDrawingsStage() {
  const { bid, editable, saving } = useProcessDraft();
  const { uploadAttachment, uploadAttachments, deleteAttachment } = useBidSheet();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  if (!bid) return null;

  const categoryIds = meta?.drawingCategories?.length
    ? meta.drawingCategories
    : [...DEFAULT_PHASES];
  const withCd = categoryIds.includes("cd") ? categoryIds : [...categoryIds, "cd"];
  const drawingCategoryOptions = withCd.map((id) => ({
    value: id,
    label: meta?.drawingCategoryLabels?.[id] ?? PHASE_SHORT[id] ?? id.toUpperCase(),
  }));
  const drawings = (bid.attachments ?? []).filter((a) => a.label === "drawings");

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="intake-title">Drawings</h2>
      </header>

      <TogalProjectBar />

      <BidAttachmentsSection
        attachments={drawings}
        isEditable={editable}
        uploading={saving}
        onUpload={async (file, opts) => uploadAttachment(file, opts)}
        onUploadMany={async (files, opts) => uploadAttachments(files, opts)}
        onDelete={async (id) => deleteAttachment(id)}
        mode="drawings"
        drawingCategoryOptions={drawingCategoryOptions}
      />
    </div>
  );
}
