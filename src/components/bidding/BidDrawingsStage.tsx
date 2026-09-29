"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta } from "@/lib/bidding/process-types";

/** Fallback phases when process-meta has not loaded — same set as Intake / mock. */
const FALLBACK_PHASES: { value: string; label: string }[] = [
  { value: "sd", label: "SD · Schematic design" },
  { value: "dd", label: "DD · Design development" },
  { value: "ifb", label: "IFB" },
  { value: "ifp", label: "IFP" },
  { value: "ifc", label: "IFC · 100% CD" },
  { value: "ifr", label: "IFR" },
];

/** Chrome tab after Setup, before Spec sheets — every drawing (attachments), by revision phase. */
export function BidDrawingsStage() {
  const { bid, editable, saving } = useProcessDraft();
  const { uploadAttachment, deleteAttachment } = useBidSheet();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  if (!bid) return null;

  const fromMeta = (meta?.drawingCategories ?? []).map((id) => ({
    value: id,
    label: meta?.drawingCategoryLabels?.[id] ?? id,
    percent: meta?.drawingCategoryPercents?.[id] ?? null,
  }));
  const drawingCategoryOptions =
    fromMeta.length > 0
      ? fromMeta
      : FALLBACK_PHASES.map((p) => ({
          ...p,
          percent: meta?.drawingCategoryPercents?.[p.value] ?? null,
        }));

  const drawings = (bid.attachments ?? []).filter((a) => a.label === "drawings");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Drawings</h2>
        <p className="mt-1 text-[13px] text-ink/45">
          Upload into the phase that matches the set — SD, DD, IFB, IFP, IFC,
          IFR. Each phase shows Drop / Browse; use Show files when a phase
          already has uploads.
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
