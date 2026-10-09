"use client";

import { useMemo, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidAttachment } from "@/lib/bidding/types";

function folderFromFileName(fileName: string): string {
  const norm = fileName.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i > 0 ? norm.slice(0, i) : "";
}

function groupByFolder(attachments: BidAttachment[]): { folder: string; items: BidAttachment[] }[] {
  const map = new Map<string, BidAttachment[]>();
  for (const att of attachments) {
    const folder = folderFromFileName(att.fileName);
    const list = map.get(folder) ?? [];
    list.push(att);
    map.set(folder, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, items]) => ({ folder, items }));
}

/** Hub files already on the bid. View, download, or set a drawing phase. */
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
  const groups = useMemo(() => groupByFolder(attachments), [attachments]);

  const open = async (att: BidAttachment, asDownload: boolean) => {
    setError(null);
    try {
      const raw = await biddingApi.fetchBidAttachmentBlob(att.downloadPath);
      const name = att.fileName.toLowerCase();
      let type = att.mimeType?.trim() || raw.type || "";
      if (!type || type === "application/octet-stream") {
        if (name.endsWith(".pdf")) type = "application/pdf";
        else if (name.endsWith(".png")) type = "image/png";
        else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) type = "image/jpeg";
        else if (name.endsWith(".webp")) type = "image/webp";
      }
      const blob = type && type !== raw.type ? new Blob([raw], { type }) : raw;
      const url = URL.createObjectURL(blob);
      if (asDownload) {
        const a = document.createElement("a");
        a.href = url;
        a.download = att.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (!opened) {
          const a = document.createElement("a");
          a.href = url;
          a.download = att.fileName;
          a.click();
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, asDownload ? "Couldn't download that file" : "Couldn't open that file"));
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
          <div className="flex flex-col gap-3">
            {groups.map(({ folder, items }) => (
              <div key={folder || "__root"}>
                {folder ? (
                  <p className="mb-1 text-[11px] font-semibold text-[#4b5563]">{folder}/</p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {items.map((att) => (
                    <li
                      key={att.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
                    >
                      <p
                        className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1f2937]"
                        title={att.fileName}
                      >
                        {att.fileName}
                      </p>
                      <button
                        type="button"
                        className="cursor-pointer text-[11px] font-semibold text-brand hover:underline"
                        onClick={() => void open(att, false)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer text-[11px] font-semibold text-[#4b5563] hover:underline"
                        onClick={() => void open(att, true)}
                      >
                        Download
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
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
