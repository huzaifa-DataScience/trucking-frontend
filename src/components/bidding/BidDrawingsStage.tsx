"use client";

import { useEffect, useMemo, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta } from "@/lib/bidding/process-types";
import { newId } from "@/lib/bidding/newId";

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

/** Drawing phases with upload, download, and delete — custom set names allowed. */
export function BidDrawingsStage() {
  const { bid, draft, editable, saving, setField } = useProcessDraft();
  const { uploadAttachment, uploadAttachments, deleteAttachment } = useBidSheet();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  const drawings = useMemo(
    () => (bid?.attachments ?? []).filter((a) => a.label === "drawings"),
    [bid?.attachments]
  );

  const drawingCategoryOptions = useMemo(() => {
    if (!bid) return [];
    const categoryIds = meta?.drawingCategories?.length
      ? meta.drawingCategories
      : [...DEFAULT_PHASES];
    const withCd = categoryIds.includes("cd")
      ? categoryIds
      : [...categoryIds, "cd"];
    const hidden = new Set(
      (draft.drawingSetHidden ?? []).map((s) => s.toLowerCase())
    );
    const builtIn = withCd
      .filter((id) => !hidden.has(id.toLowerCase()))
      .map((id) => ({
        value: id,
        label:
          meta?.drawingCategoryLabels?.[id] ??
          PHASE_SHORT[id] ??
          id.toUpperCase(),
      }));
    const custom = (draft.drawingSetCustom ?? []).map((c) => ({
      value: c.id,
      label: c.label,
    }));
    // Prefer intake drawingCategory as first tab when present.
    const preferred = draft.drawingCategory?.trim();
    const merged = [...builtIn, ...custom];
    if (preferred && !merged.some((o) => o.value === preferred)) {
      merged.unshift({
        value: preferred,
        label: preferred.toUpperCase(),
      });
    }
    return merged;
  }, [
    bid,
    meta,
    draft.drawingSetHidden,
    draft.drawingSetCustom,
    draft.drawingCategory,
  ]);

  if (!bid) return null;

  const addCustomSet = () => {
    const label = customLabel.trim();
    if (!label) return;
    const id = `custom_${newId().replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`;
    setField("drawingSetCustom", [
      ...(draft.drawingSetCustom ?? []),
      { id, label },
    ]);
    setCustomLabel("");
  };

  const toggleHide = (id: string) => {
    const hidden = new Set(draft.drawingSetHidden ?? []);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    setField("drawingSetHidden", [...hidden]);
  };

  const removeCustom = (id: string) => {
    setField(
      "drawingSetCustom",
      (draft.drawingSetCustom ?? []).filter((c) => c.id !== id)
    );
  };

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="intake-title">Drawings</h2>
          <p className="mt-0.5 text-[12.5px] text-[#6b7280]">
            Intake uploads appear here. Rename or add custom sets (e.g. DD 50% /
            DD 85%).
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            className="intake-head-btn"
            onClick={() => setShowManage((v) => !v)}
          >
            {showManage ? "Done" : "Manage sets"}
          </button>
        ) : null}
      </header>

      {showManage && editable ? (
        <section className="intake-section">
          <div className="intake-section-head-bar">
            <div>
              <h3>Drawing sets</h3>
              <p>Hide unused phases or add custom names</p>
            </div>
          </div>
          <div className="intake-section-body flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {(meta?.drawingCategories?.length
                ? meta.drawingCategories
                : [...DEFAULT_PHASES]
              ).map((id) => {
                const hidden = (draft.drawingSetHidden ?? []).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleHide(id)}
                    className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${
                      hidden
                        ? "border-dashed border-[#d5dbe3] text-[#9ca3af] line-through"
                        : "border-[#d9d4c8] bg-[#f3f1ea] text-[#5a5340]"
                    }`}
                    title={hidden ? "Show this set" : "Hide this set"}
                  >
                    {meta?.drawingCategoryLabels?.[id] ??
                      PHASE_SHORT[id] ??
                      id.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="intake-field min-w-[12rem] flex-1"
                placeholder="Custom set name (e.g. DD 50%)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSet();
                  }
                }}
              />
              <button
                type="button"
                className="intake-head-btn"
                disabled={!customLabel.trim()}
                onClick={addCustomSet}
              >
                Add set
              </button>
            </div>
            {(draft.drawingSetCustom ?? []).length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {(draft.drawingSetCustom ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#d5dbe3] bg-white px-2 py-1 text-[12px]"
                  >
                    <span className="font-semibold text-[#374151]">{c.label}</span>
                    <button
                      type="button"
                      className="text-[#9ca3af] hover:text-danger"
                      aria-label={`Remove ${c.label}`}
                      onClick={() => removeCustom(c.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <BidAttachmentsSection
        attachments={drawings}
        isEditable={editable}
        uploading={saving}
        onUpload={async (file, opts) => uploadAttachment(file, opts)}
        onUploadMany={async (files, opts) => uploadAttachments(files, opts)}
        onDelete={async (id) => deleteAttachment(id)}
        mode="drawings"
        drawingCategoryOptions={
          drawingCategoryOptions.length
            ? drawingCategoryOptions
            : [{ value: "cd", label: "CD" }]
        }
      />
    </div>
  );
}
