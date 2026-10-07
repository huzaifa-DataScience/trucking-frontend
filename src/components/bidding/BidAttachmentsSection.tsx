"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import type { BidAttachment } from "@/lib/bidding/types";

const MAX_FILES = 200;
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,text/csv,.csv,application/zip,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";
const WORD_DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ATTACHMENT_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "project_documents", label: "Project Documents" },
  { value: "proposal", label: "Proposal" },
  { value: "master-scan", label: "Master scan" },
];

const HUB_LABEL_OPTIONS: { value: string; label: string }[] = [
  { value: "drawings", label: "Drawings" },
  { value: "specifications", label: "Specifications" },
  { value: "invitation", label: "Invitation" },
  { value: "addenda", label: "Addenda" },
];

const DRAWING_PHASE_TITLES: Record<string, string> = {
  sd: "SD — Schematic Design",
  dd: "DD — Design Development",
  cd: "CD — Construction Documents",
  ifb: "IFB — Issued for Bid",
  ifp: "IFP — Issued for Permit",
  ifc: "IFC — Issued for Construction",
  ifr: "IFR — Issued for Record",
};

function isWordDoc(mimeType: string): boolean {
  return WORD_DOC_MIMES.has(mimeType);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(att: BidAttachment): string {
  const name = att.fileName.toLowerCase();
  const mime = att.mimeType;
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (mime === "text/csv" || name.endsWith(".csv")) return "CSV";
  if (isWordDoc(mime) || name.endsWith(".doc") || name.endsWith(".docx")) return "DOC";
  if (
    mime === "application/zip" ||
    mime === "application/x-zip-compressed" ||
    name.endsWith(".zip")
  ) {
    return "ZIP";
  }
  if (mime.startsWith("image/")) return "IMG";
  return "FILE";
}

async function downloadAttachment(att: BidAttachment) {
  const blob = await biddingApi.fetchBidAttachmentBlob(att.downloadPath);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = att.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function viewAttachment(att: BidAttachment) {
  const blob = await biddingApi.fetchBidAttachmentBlob(att.downloadPath);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    // Popup blocked — fall back to download.
    const a = document.createElement("a");
    a.href = url;
    a.download = att.fileName;
    a.click();
  }
  // Revoke after the tab has a chance to load the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    return <p className="text-[12.5px] text-[#6b7280]">No attachments yet.</p>;
  }
  return (
    <ul className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
      {attachments.map((att) => (
        <li key={att.id} className="overflow-hidden rounded border border-[#e5e7eb] bg-white">
          <AttachmentPreview attachment={att} />
          <div className="space-y-0.5 p-2">
            <p className="truncate text-[12.5px] font-medium text-[#1f2937]" title={att.fileName}>
              {att.label ?? att.fileName}
            </p>
            <p className="text-[11px] text-[#9ca3af]">{formatBytes(att.sizeBytes)}</p>
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => void downloadAttachment(att)}
                className="text-[11px] font-semibold text-[#4b5563] hover:underline"
              >
                Download
              </button>
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
                  className="text-[11px] font-semibold text-[#9ca3af] hover:text-danger"
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

function DrawingFileRows({
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
    return (
      <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-5 text-center text-[12.5px] text-[#6b7280]">
        No drawings in this phase yet.
      </div>
    );
  }

  return (
    <ul className="mt-3 overflow-hidden rounded-lg border border-[#e5e7eb]">
      {attachments.map((att) => (
        <li
          key={att.id}
          className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#e5e7eb] bg-white px-3 py-2.5 first:border-t-0 hover:bg-[#faf7f0]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-[#f3f1ea] text-[10px] font-bold tracking-wide text-[#5a5340]">
            {fileKindLabel(att)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-[#1f2937]" title={att.fileName}>
              {att.fileName}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9ca3af]">{formatBytes(att.sizeBytes)}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void downloadAttachment(att)}
                className="cursor-pointer text-[11px] font-semibold text-[#4b5563] hover:underline"
              >
                Download
              </button>
              {isEditable ? (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirmDialog({
                        title: "Remove drawing?",
                        message: `Remove "${att.fileName}"?`,
                        confirmLabel: "Remove",
                        variant: "danger",
                      });
                      if (!ok) return;
                      void onDelete(att.id);
                    })();
                  }}
                  className="cursor-pointer text-[11px] font-semibold text-[#9ca3af] hover:text-danger"
                >
                  Remove
                </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DrawingsPanel({
  attachments,
  isEditable,
  uploading,
  localUploading,
  localError,
  drawingCategoryOptions,
  activePhase,
  onPhaseChange,
  onBrowse,
  onDropFiles,
  inputRef,
  confirmDialog,
  onDelete,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  localUploading: boolean;
  localError: string | null;
  drawingCategoryOptions: { value: string; label: string }[];
  activePhase: string;
  onPhaseChange: (phase: string) => void;
  onBrowse: () => void;
  onDropFiles: (files: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const busy = Boolean(uploading || localUploading);
  const atLimit = attachments.length >= MAX_FILES;

  const bucketed = useMemo(
    () => groupBy(attachments, (a) => a.drawingCategory ?? ""),
    [attachments]
  );
  const phaseFiles = bucketed[activePhase] ?? [];
  const activeOpt = drawingCategoryOptions.find((o) => o.value === activePhase);
  const phaseTitle =
    DRAWING_PHASE_TITLES[activePhase] ??
    (activeOpt ? `${activeOpt.label}` : activePhase.toUpperCase());
  const fileMeta = phaseFiles.length === 1 ? "1 file" : `${phaseFiles.length} files`;

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex flex-wrap gap-1.5" aria-label="Drawing phases">
        {drawingCategoryOptions.map((o) => {
          const count = (bucketed[o.value] ?? []).length;
          const active = o.value === activePhase;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPhaseChange(o.value)}
              className={`inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "border-[#d9d4c8] bg-[#f3f1ea] text-[#5a5340]"
                  : "border-[#d5dbe3] bg-white text-[#4b5563] hover:border-[#94a3b8] hover:bg-[#fafafa]"
              }`}
            >
              <span>{o.label}</span>
              <span
                className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-[18px] ${
                  active ? "bg-[#ebe6da] text-[#5a5340]" : "bg-[#eef1f4] text-[#6b7280]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="intake-section">
        <div className="intake-section-head flex items-center justify-between gap-3">
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.02em] text-[#5a5340]">
            {phaseTitle}
          </h3>
          <span className="shrink-0 text-[12px] font-normal text-[#7a7360]">{fileMeta}</span>
        </div>

        <div className="intake-section-body">
          {isEditable ? (
            <div
              className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-3.5 py-3.5 ${
                dragging ? "border-[#94a3b8] bg-[#f3f1ea]" : "border-[#c5ccd6] bg-[#fafbfc]"
              } ${busy || atLimit ? "cursor-default opacity-70" : ""}`}
              onClick={() => {
                if (!busy && !atLimit) onBrowse();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!busy && !atLimit) onDropFiles(e.dataTransfer.files);
              }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#7a7360]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#374151]">
                    {busy ? "Uploading…" : "Drop PDF or image here"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6b7280]">
                    or browse — max {MAX_FILES} files · ZIP ok
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy || atLimit}
                className="intake-head-btn shrink-0 cursor-pointer border-[#d9d4c8] bg-[#f3f1ea] text-[#5a5340] hover:bg-[#ebe6da] disabled:cursor-default disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onBrowse();
                }}
              >
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                  onDropFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          ) : null}

          {localError ? <p className="mt-2 text-[12.5px] text-danger">{localError}</p> : null}

          <DrawingFileRows
            attachments={phaseFiles}
            isEditable={isEditable}
            confirmDialog={confirmDialog}
            onDelete={onDelete}
          />
        </div>
      </section>

    </div>
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
  labels,
  title,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  onUpload: (file: File, opts?: { label?: string; category?: string; drawingCategory?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  /** drawings = phase tabs. markup = Takeoff — one open file drop + list. */
  mode?: "general" | "drawings" | "markup";
  /** Only used in "drawings" mode — [{value, label}], from processMeta().drawingCategories. */
  drawingCategoryOptions?: { value: string; label: string }[];
  /** Limit which upload labels show. Hub uses drawings/specs/invitation; addenda is its own box. */
  labels?: string[];
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingLabelRef = useRef(
    labels?.[0] ?? (mode === "markup" ? "takeoff" : "drawings")
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [localUploading, setLocalUploading] = useState(false);
  const [pendingLabel, setPendingLabel] = useState(
    labels?.[0] ?? (mode === "markup" ? "takeoff" : "drawings")
  );
  const [pendingCategory, setPendingCategory] = useState("project_documents");
  const phaseOptions = drawingCategoryOptions ?? [];
  const [pendingDrawingCategory, setPendingDrawingCategory] = useState(() => {
    if (phaseOptions.some((o) => o.value === "cd")) return "cd";
    return phaseOptions[0]?.value ?? "cd";
  });
  const confirmDialog = useConfirmDialog();

  useEffect(() => {
    if (mode !== "drawings" || phaseOptions.length === 0) return;
    if (!phaseOptions.some((o) => o.value === pendingDrawingCategory)) {
      const fallback = phaseOptions.find((o) => o.value === "cd") ?? phaseOptions[0]!;
      setPendingDrawingCategory(fallback.value);
    }
  }, [mode, phaseOptions, pendingDrawingCategory]);

  const handleFiles = useCallback(
    async (files: FileList | null, labelOverride?: string) => {
      if (!files?.length) return;
      setLocalError(null);

      const label = labelOverride ?? pendingLabel;
      const batch = Array.from(files);

      if (attachments.length + batch.length > MAX_FILES) {
        setLocalError(`Maximum ${MAX_FILES} attachments per bid.`);
        return;
      }

      for (const file of batch) {
        setLocalUploading(true);
        try {
          if (mode === "drawings") {
            await onUpload(file, {
              label: "drawings",
              drawingCategory: pendingDrawingCategory || undefined,
            });
          } else if (mode === "markup") {
            await onUpload(file, {
              label: label || "takeoff",
              category: "takeoff_markup",
            });
          } else {
            await onUpload(file, { label, category: pendingCategory });
          }
        } finally {
          setLocalUploading(false);
        }
      }
    },
    [attachments.length, onUpload, mode, pendingLabel, pendingCategory, pendingDrawingCategory]
  );

  if (mode === "drawings") {
    return (
      <DrawingsPanel
        attachments={attachments}
        isEditable={isEditable}
        uploading={uploading}
        localUploading={localUploading}
        localError={localError}
        drawingCategoryOptions={phaseOptions}
        activePhase={pendingDrawingCategory}
        onPhaseChange={setPendingDrawingCategory}
        onBrowse={() => inputRef.current?.click()}
        onDropFiles={(files) => void handleFiles(files)}
        inputRef={inputRef}
        confirmDialog={confirmDialog}
        onDelete={onDelete}
      />
    );
  }

  if (mode === "markup") {
    return (
      <MarkupPanel
        title={title ?? "Takeoff files"}
        attachments={attachments.filter(
          (a) =>
            a.category === "takeoff_markup" ||
            a.label === "takeoff" ||
            a.label === "takeoff-zip" ||
            a.label === "takeoff-snap" ||
            a.label === "takeoff-recap" ||
            a.label === "master-scan"
        )}
        isEditable={isEditable}
        busy={Boolean(uploading || localUploading)}
        localError={localError}
        confirmDialog={confirmDialog}
        onUploadFiles={(files) => void handleFiles(files, "takeoff")}
        onDelete={onDelete}
      />
    );
  }

  const labelOptions = HUB_LABEL_OPTIONS.filter((o) => !labels || labels.includes(o.value));
  const shown = attachments.filter((a) => a.category !== "takeoff_markup");
  const bucketed = groupBy(shown, (a) => a.label || "drawings");
  const busy = Boolean(uploading || localUploading);
  const atLimit = attachments.length >= MAX_FILES;
  /** When hub labels are provided, each bucket gets its own Add — no shared type dropdown. */
  const perLabelAdd = Boolean(labels?.length);
  pendingLabelRef.current = pendingLabel;

  const browseForLabel = (label: string) => {
    setPendingLabel(label);
    pendingLabelRef.current = label;
    inputRef.current?.click();
  };

  return (
    <section className="intake-section">
      <div className="intake-section-head">{title ?? "Bid documents"}</div>
      <div className="intake-section-body flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files, pendingLabelRef.current);
            e.target.value = "";
          }}
        />

        {isEditable && !perLabelAdd ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="intake-field appearance-none"
              value={pendingCategory}
              onChange={(e) => setPendingCategory(e.target.value)}
              aria-label="Attachment category"
            >
              {ATTACHMENT_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="intake-field appearance-none"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              aria-label="Document type"
            >
              {labelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || atLimit}
              onClick={() => inputRef.current?.click()}
              className="intake-head-btn disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Add file"}
            </button>
          </div>
        ) : null}

        {localError ? <p className="text-[12.5px] text-danger">{localError}</p> : null}

        <div className="flex flex-col gap-3">
          {!labels
            ? ATTACHMENT_CATEGORY_OPTIONS.map((o) => (
                <div key={o.value}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    {o.label}
                  </p>
                  <AttachmentGrid
                    attachments={shown.filter((a) => (a.category ?? "project_documents") === o.value)}
                    isEditable={isEditable}
                    confirmDialog={confirmDialog}
                    onDelete={onDelete}
                  />
                </div>
              ))
            : null}
          {labelOptions.map((o) => (
            <div key={o.value}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  {o.label}
                </p>
                {isEditable && perLabelAdd ? (
                  <button
                    type="button"
                    disabled={busy || atLimit}
                    onClick={() => browseForLabel(o.value)}
                    className="intake-head-btn disabled:opacity-50"
                  >
                    {busy && pendingLabel === o.value ? "Uploading…" : "+ Add"}
                  </button>
                ) : null}
              </div>
              <AttachmentGrid
                attachments={bucketed[o.value] ?? []}
                isEditable={isEditable}
                confirmDialog={confirmDialog}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarkupPanel({
  title,
  attachments,
  isEditable,
  busy,
  localError,
  confirmDialog,
  onUploadFiles,
  onDelete,
}: {
  title: string;
  attachments: BidAttachment[];
  isEditable: boolean;
  busy: boolean;
  localError: string | null;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  onUploadFiles: (files: FileList | null) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const atLimit = attachments.length >= MAX_FILES;
  const locked = busy || atLimit;
  const countLabel =
    attachments.length === 0
      ? null
      : attachments.length === 1
        ? "1 file"
        : `${attachments.length} files`;

  return (
    <section className="intake-section">
      <div className="intake-section-head-bar flex items-center justify-between gap-2">
        <div className="intake-section-head">{title}</div>
        {countLabel ? <span className="intake-head-count pr-3 text-[12px] font-semibold text-ink/45">{countLabel}</span> : null}
      </div>
      <div className="intake-section-body flex flex-col gap-2">
        {localError ? <p className="text-[12.5px] text-danger">{localError}</p> : null}
        {isEditable ? (
          <div
            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 ${
              dragging ? "border-[#b45309] bg-[#fff7ed]" : "border-[#c5ccd6] bg-[#fafbfc]"
            } ${locked ? "cursor-default opacity-70" : ""}`}
            onClick={() => {
              if (!locked) inputRef.current?.click();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!locked) onUploadFiles(e.dataTransfer.files);
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#374151]">
                {busy ? "Uploading…" : "Drop file here or browse"}
              </p>
            </div>
            <button
              type="button"
              disabled={locked}
              className="intake-head-btn shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                if (!locked) inputRef.current?.click();
              }}
            >
              Browse
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                onUploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {attachments.length === 0 ? (
          isEditable ? null : (
            <p className="text-[12.5px] text-[#6b7280]">No takeoff files uploaded.</p>
          )
        ) : (
          <ul className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#e5e7eb] bg-white px-3 py-2 first:border-t-0"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-[#f3f1ea] text-[10px] font-bold tracking-wide text-[#5a5340]">
                  {fileKindLabel(att)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[#1f2937]" title={att.fileName}>
                    {att.fileName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">{formatBytes(att.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void viewAttachment(att)}
                    className="cursor-pointer text-[11px] font-semibold text-brand hover:underline"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadAttachment(att)}
                    className="cursor-pointer text-[11px] font-semibold text-[#4b5563] hover:underline"
                  >
                    Download
                  </button>
                  {isEditable ? (
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const ok = await confirmDialog({
                            title: "Remove file?",
                            message: `Remove "${att.fileName}"?`,
                            confirmLabel: "Remove",
                            variant: "danger",
                          });
                          if (!ok) return;
                          void onDelete(att.id);
                        })();
                      }}
                      className="cursor-pointer text-[11px] font-semibold text-[#9ca3af] hover:text-danger"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
