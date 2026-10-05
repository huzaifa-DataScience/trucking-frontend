"use client";

import { useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidAttachment } from "@/lib/bidding/types";

/** Hub files already on the bid. Download or set a drawing phase. Do not upload a second copy. */
export function BidHubFiles({
  title,
  attachments,
  drawingCategoryOptions,
}: {
  title: string;
  attachments: BidAttachment[];
  drawingCategoryOptions?: { value: string; label: string }[];
}) {
  const { bid, refresh } = useBidSheet();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const download = async (att: BidAttachment) => {
    setError(null);
    try {
      const blob = await biddingApi.fetchBidAttachmentBlob(att.downloadPath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't download that file"));
    }
  };

  const setPhase = async (att: BidAttachment, drawingCategory: string) => {
    if (!bid) return;
    setBusyId(att.id);
    setError(null);
    try {
      await biddingApi.patchBidAttachment(bid.id, att.id, { drawingCategory: drawingCategory || null });
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't update the drawing phase"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="intake-section">
      <div className="intake-section-head">{title}</div>
      <div className="intake-section-body flex flex-col gap-2">
        {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
        {attachments.length === 0 ? (
          <p className="text-[13px] text-[#6b7280]">None on this bid yet. Upload them on Intake.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attachments.map((att) => (
              <li key={att.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-brand hover:underline"
                  onClick={() => void download(att)}
                >
                  {att.fileName}
                </button>
                {drawingCategoryOptions && drawingCategoryOptions.length > 0 ? (
                  <select
                    className="intake-field appearance-none"
                    aria-label={`Phase for ${att.fileName}`}
                    disabled={busyId === att.id}
                    value={att.drawingCategory ?? ""}
                    onChange={(e) => void setPhase(att, e.target.value)}
                  >
                    <option value="">Phase</option>
                    {drawingCategoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
