"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import type { BidAttachment } from "@/lib/bidding/types";

const MAX_FILES = 20;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,text/csv,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";
const WORD_DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
function isWordDoc(mimeType: string): boolean {
  return WORD_DOC_MIMES.has(mimeType);
}

const ATTACHMENT_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "project_documents", label: "Project Documents" },
  { value: "proposal", label: "Proposal" },
  { value: "master-scan", label: "Master scan" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreview({ attachment }: { attachment: BidAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void biddingApi
      .fetchBidAttachmentBlob(attachment.downloadPath)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.downloadPath]);

  if (attachment.mimeType === "application/pdf") {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-ink/[0.04] text-xs font-medium text-ink/50">
        PDF
      </div>
    );
  }

  if (attachment.mimeType === "text/csv" || attachment.fileName.toLowerCase().endsWith(".csv")) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-ink/[0.04] text-xs font-medium text-ink/50">
        CSV
      </div>
    );
  }

  if (isWordDoc(attachment.mimeType)) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-ink/[0.04] text-xs font-medium text-ink/50">
        DOC
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-ink/[0.04] text-xs text-ink/40">
        Preview unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={attachment.label ?? attachment.fileName}
      className="h-24 w-full rounded-lg object-cover"
    />
  );
}

function AttachmentGrid({
  attachments,
  isEditable,
  confirmDialog,
  onDelete,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  onDelete: (id: number) => Promise<void>;
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-ink/45">No attachments yet.</p>;
  }
  return (
    <ul className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      {attachments.map((att) => (
        <li key={att.id} className="overflow-hidden rounded-xl border border-ink/[0.08] bg-surface">
          <AttachmentPreview attachment={att} />
          <div className="space-y-1 p-3">
            <p className="truncate text-sm font-medium text-ink" title={att.fileName}>
              {att.label ?? att.fileName}
            </p>
            <p className="text-xs text-ink/40">{formatBytes(att.sizeBytes)}</p>
            <div className="flex gap-2 pt-1">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  void biddingApi.fetchBidAttachmentBlob(att.downloadPath).then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = att.fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  });
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Download
              </a>
              {isEditable ? (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirmDialog({
                        title: "Remove attachment?",
                        message: `Remove attachment "${att.fileName}"?`,
                        confirmLabel: "Remove",
                        variant: "danger",
                      });
                      if (!ok) return;
                      void onDelete(att.id);
                    })();
                  }}
                  className="text-xs font-semibold text-ink/45 hover:text-danger"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BidAttachmentsSection({
  attachments,
  isEditable,
  uploading,
  onUpload,
  onDelete,
  mode = "general",
  drawingCategoryOptions,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  onUpload: (file: File, opts?: { label?: string; category?: string; drawingCategory?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  /** "drawings" = Drawings tab: files always tagged label="drawings", grouped by drawingCategory. */
  mode?: "general" | "drawings";
  /** Only used in "drawings" mode — [{value, label}], from processMeta().drawingCategories. */
  drawingCategoryOptions?: { value: string; label: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localUploading, setLocalUploading] = useState(false);
  const [pendingCategory, setPendingCategory] = useState("project_documents");
  const [pendingDrawingCategory, setPendingDrawingCategory] = useState(
    drawingCategoryOptions?.[0]?.value ?? ""
  );
  const confirmDialog = useConfirmDialog();
  const [maxBytes, setMaxBytes] = useState(DEFAULT_MAX_BYTES);

  useEffect(() => {
    void biddingApi
      .getProcessMeta()
      .then((meta) => {
        if (typeof meta.attachmentMaxBytes === "number" && meta.attachmentMaxBytes > 0) {
          setMaxBytes(meta.attachmentMaxBytes);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setLocalError(null);

      if (attachments.length + files.length > MAX_FILES) {
        setLocalError(`Maximum ${MAX_FILES} attachments per bid.`);
        return;
      }

      for (const file of Array.from(files)) {
        if (file.size > maxBytes) {
          setLocalError(`${file.name} exceeds ${Math.round(maxBytes / (1024 * 1024))} MB.`);
          return;
        }
      }

      for (const file of Array.from(files)) {
        setLocalUploading(true);
        try {
          if (mode === "drawings") {
            await onUpload(file, { label: "drawings", drawingCategory: pendingDrawingCategory || undefined });
          } else {
            await onUpload(file, { category: pendingCategory });
          }
        } finally {
          setLocalUploading(false);
        }
      }
    },
    [attachments.length, onUpload, mode, pendingCategory, pendingDrawingCategory, maxBytes]
  );

  const bucketed =
    mode === "drawings"
      ? groupBy(attachments, (a) => a.drawingCategory ?? "")
      : groupBy(attachments, (a) => a.category ?? "project_documents");

  return (
    <Card>
      <CardHeader
        title={mode === "drawings" ? "Drawings" : "Attachments"}
        subtitle={
          mode === "drawings"
            ? "Every drawing on this bid, by revision phase."
            : `Site photos, screenshots, PDFs, Word docs, and CSV exports, up to ${Math.round(maxBytes / (1024 * 1024))} MB each.`
        }
      />

      {isEditable ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {mode === "drawings" ? (
            <select
              className="rounded-lg border border-ink/10 bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
              value={pendingDrawingCategory}
              onChange={(e) => setPendingDrawingCategory(e.target.value)}
            >
              {(drawingCategoryOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="rounded-lg border border-ink/10 bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
              value={pendingCategory}
              onChange={(e) => setPendingCategory(e.target.value)}
            >
              {ATTACHMENT_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={uploading || localUploading || attachments.length >= MAX_FILES}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-50"
          >
            {uploading || localUploading ? "Uploading…" : "Add file"}
          </button>
        </div>
      ) : null}

      {localError ? <p className="mb-3 text-xs text-danger">{localError}</p> : null}

      {mode === "drawings" ? (
        (drawingCategoryOptions ?? []).length === 0 ? (
          <AttachmentGrid
            attachments={attachments}
            isEditable={isEditable}
            confirmDialog={confirmDialog}
            onDelete={onDelete}
          />
        ) : (
          <div className="space-y-5">
            {(drawingCategoryOptions ?? []).map((o) => (
              <div key={o.value}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">{o.label}</p>
                <AttachmentGrid
                  attachments={bucketed[o.value] ?? []}
                  isEditable={isEditable}
                  confirmDialog={confirmDialog}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-5">
          {ATTACHMENT_CATEGORY_OPTIONS.map((o) => (
            <div key={o.value}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">{o.label}</p>
              <AttachmentGrid
                attachments={bucketed[o.value] ?? []}
                isEditable={isEditable}
                confirmDialog={confirmDialog}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}
