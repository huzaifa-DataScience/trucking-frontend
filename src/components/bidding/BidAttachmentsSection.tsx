"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import type { BidAttachment } from "@/lib/bidding/types";

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
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
];

export type DrawingPhaseOption = {
  value: string;
  label: string;
  percent?: string | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-[22px] w-[22px] shrink-0 text-ink/35 transition group-hover:text-brand group-data-[drag=true]:text-brand ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        d="M12 16V7M8.5 10.5 12 7l3.5 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function fileKindLabel(attachment: BidAttachment): string {
  if (attachment.mimeType === "application/pdf") return "PDF";
  if (
    attachment.mimeType === "text/csv" ||
    attachment.fileName.toLowerCase().endsWith(".csv")
  ) {
    return "CSV";
  }
  if (isWordDoc(attachment.mimeType)) return "DOC";
  if (attachment.mimeType.startsWith("image/")) return "IMG";
  return "FILE";
}

function AttachmentPreview({
  attachment,
  compact = false,
}: {
  attachment: BidAttachment;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const height = compact ? "h-14" : "h-[88px]";

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
      <div
        className={`flex ${height} items-center justify-center bg-ink/[0.04] text-xs font-semibold text-[#b91c1c]`}
      >
        PDF
      </div>
    );
  }

  if (
    attachment.mimeType === "text/csv" ||
    attachment.fileName.toLowerCase().endsWith(".csv")
  ) {
    return (
      <div
        className={`flex ${height} items-center justify-center bg-ink/[0.04] text-xs font-semibold text-ink/45`}
      >
        CSV
      </div>
    );
  }

  if (isWordDoc(attachment.mimeType)) {
    return (
      <div
        className={`flex ${height} items-center justify-center bg-ink/[0.04] text-xs font-semibold text-ink/45`}
      >
        DOC
      </div>
    );
  }

  if (error || !url) {
    return (
      <div
        className={`flex ${height} items-center justify-center bg-ink/[0.04] text-xs text-ink/40`}
      >
        {compact ? "—" : "Preview unavailable"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={attachment.label ?? attachment.fileName}
      className={`${height} w-full object-cover`}
    />
  );
}

function downloadAttachment(att: BidAttachment) {
  void biddingApi.fetchBidAttachmentBlob(att.downloadPath).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.fileName;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function AttachmentGrid({
  attachments,
  isEditable,
  confirmDialog,
  onDelete,
  emptyLabel = "No files yet.",
  variant = "cards",
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  onDelete: (id: number) => Promise<void>;
  emptyLabel?: string;
  /** cards = preview tiles; list = dense rows (Drawings tab). */
  variant?: "cards" | "list";
}) {
  if (attachments.length === 0) {
    return <p className="m-0 text-[13px] text-ink/40">{emptyLabel}</p>;
  }

  if (variant === "list") {
    return (
      <ul className="max-h-56 divide-y divide-ink/[0.06] overflow-y-auto rounded-xl border border-ink/[0.07] bg-white">
        {attachments.map((att) => (
          <li
            key={att.id}
            className="flex min-w-0 items-center gap-3 px-3 py-2.5"
          >
            <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md bg-ink/[0.04] text-[10px] font-bold tracking-wide text-ink/50">
              {fileKindLabel(att)}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold text-ink"
                title={att.fileName}
              >
                {att.fileName}
              </p>
              <p className="text-xs text-ink/45">{formatBytes(att.sizeBytes)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => downloadAttachment(att)}
                className="text-xs font-semibold text-brand hover:underline"
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
                  className="text-xs font-semibold text-[#b91c1c]/80 hover:text-danger"
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

  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      {attachments.map((att) => (
        <li
          key={att.id}
          className="overflow-hidden rounded-[14px] border border-ink/[0.07] bg-white"
        >
          <AttachmentPreview attachment={att} />
          <div className="px-3.5 py-3">
            <p
              className="truncate text-sm font-semibold text-ink"
              title={att.fileName}
            >
              {att.fileName}
            </p>
            <p className="mt-0.5 text-xs text-ink/45">
              {formatBytes(att.sizeBytes)}
            </p>
            <div className="mt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => downloadAttachment(att)}
                className="text-xs font-semibold text-brand hover:underline"
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
                  className="text-xs font-semibold text-[#b91c1c]/80 hover:text-danger"
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

function PhaseDropzone({
  disabled,
  uploading,
  onFiles,
  compact = false,
}: {
  disabled: boolean;
  uploading: boolean;
  onFiles: (files: FileList | null) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-drag={dragging || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      className={`group flex transition ${
        compact
          ? "mb-3 flex-row items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5"
          : "mb-3 flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed px-[18px] py-[22px]"
      } ${
        dragging
          ? "border-brand/55 bg-brand/[0.04] shadow-[inset_0_0_0_1px_rgba(255,123,17,0.12)]"
          : "border-ink/[0.12] bg-linear-to-b from-[#fbfbfc] to-[#f4f5f7] hover:border-brand/55 hover:bg-brand/[0.04]"
      } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {compact ? (
        <>
          <UploadIcon className="h-5 w-5" />
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-semibold text-ink">
              Drop files or browse
            </div>
            <div className="text-xs text-ink/45">PDF or image · this phase</div>
          </div>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#f26620] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Browse"}
          </button>
        </>
      ) : (
        <>
          <UploadIcon className="mb-0.5" />
          <div className="text-[15px] font-semibold text-ink">Drop files here</div>
          <div className="text-[13px] text-ink/45">
            PDF or image · this phase only
          </div>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-2 min-h-[46px] rounded-full bg-brand px-[18px] py-2.5 text-sm font-semibold text-white transition hover:bg-[#f26620] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Browse files"}
          </button>
        </>
      )}
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
  cardClassName,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  onUpload: (
    file: File,
    opts?: { label?: string; category?: string; drawingCategory?: string }
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  /** "drawings" = Drawings tab: files always tagged label="drawings", grouped by drawingCategory. */
  mode?: "general" | "drawings";
  /** Only used in "drawings" mode — from processMeta().drawingCategories. */
  drawingCategoryOptions?: DrawingPhaseOption[];
  cardClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localUploading, setLocalUploading] = useState(false);
  const [uploadingPhase, setUploadingPhase] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState("project_documents");
  const confirmDialog = useConfirmDialog();

  const uploadBatch = useCallback(
    async (
      files: FileList | null,
      opts: { label?: string; category?: string; drawingCategory?: string }
    ) => {
      if (!files?.length) return;
      setLocalError(null);

      if (attachments.length + files.length > MAX_FILES) {
        setLocalError(`Maximum ${MAX_FILES} attachments per bid.`);
        return;
      }

      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          setLocalError(`${file.name} exceeds 10 MB.`);
          return;
        }
      }

      setLocalUploading(true);
      if (opts.drawingCategory) setUploadingPhase(opts.drawingCategory);
      try {
        for (const file of Array.from(files)) {
          await onUpload(file, opts);
        }
      } finally {
        setLocalUploading(false);
        setUploadingPhase(null);
      }
    },
    [attachments.length, onUpload]
  );

  const bucketed =
    mode === "drawings"
      ? groupBy(attachments, (a) => a.drawingCategory ?? "")
      : groupBy(attachments, (a) => a.category ?? "project_documents");

  if (mode === "drawings") {
    return (
      <DrawingsPhasesLayout
        phases={drawingCategoryOptions ?? []}
        bucketed={bucketed}
        attachments={attachments}
        isEditable={isEditable}
        uploading={Boolean(uploading || localUploading)}
        uploadingPhase={uploadingPhase}
        localError={localError}
        confirmDialog={confirmDialog}
        onDelete={onDelete}
        onUploadPhase={(list, drawingCategory) =>
          void uploadBatch(list, {
            label: "drawings",
            drawingCategory,
          })
        }
      />
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader
        title="Attachments"
        subtitle="Not the drawing set. Invitation, specifications, and addenda files. Up to 20 files, 10 MB each."
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
              void uploadBatch(e.target.files, { category: pendingCategory });
              e.target.value = "";
            }}
          />
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
          <button
            type="button"
            disabled={
              uploading || localUploading || attachments.length >= MAX_FILES
            }
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-50"
          >
            {uploading || localUploading ? "Uploading…" : "Add file"}
          </button>
        </div>
      ) : null}

      {localError ? <p className="mb-3 text-xs text-danger">{localError}</p> : null}

      <div className="space-y-5">
        {ATTACHMENT_CATEGORY_OPTIONS.map((o) => (
          <div key={o.value}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
              {o.label}
            </p>
            <AttachmentGrid
              attachments={bucketed[o.value] ?? []}
              isEditable={isEditable}
              confirmDialog={confirmDialog}
              onDelete={onDelete}
              emptyLabel="No attachments yet."
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DrawingsPhasesLayout({
  phases,
  bucketed,
  attachments,
  isEditable,
  uploading,
  uploadingPhase,
  localError,
  confirmDialog,
  onDelete,
  onUploadPhase,
}: {
  phases: DrawingPhaseOption[];
  bucketed: Record<string, BidAttachment[]>;
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading: boolean;
  uploadingPhase: string | null;
  localError: string | null;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  onDelete: (id: number) => Promise<void>;
  onUploadPhase: (files: FileList | null, drawingCategory: string) => void;
}) {
  const uncategorized = bucketed[""] ?? [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const phase of phases) {
      // Phases with files start open; empty ones stay collapsed to cut scroll.
      init[phase.value] = (bucketed[phase.value] ?? []).length > 0;
    }
    if (uncategorized.length > 0) init.__uncategorized = true;
    return init;
  });

  // Keep phases with files expanded when uploads land; seed new phase keys.
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const phase of phases) {
        const hasFiles = (bucketed[phase.value] ?? []).length > 0;
        if (!(phase.value in next)) {
          next[phase.value] = hasFiles;
          changed = true;
        } else if (hasFiles && !next[phase.value]) {
          next[phase.value] = true;
          changed = true;
        }
      }
      if (uncategorized.length > 0 && !next.__uncategorized) {
        next.__uncategorized = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [bucketed, phases, uncategorized.length]);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (phases.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {localError ? <p className="text-xs text-danger">{localError}</p> : null}
        <section className="rounded-2xl border border-ink/[0.07] bg-white p-5">
          <AttachmentGrid
            attachments={attachments}
            isEditable={isEditable}
            confirmDialog={confirmDialog}
            onDelete={onDelete}
            variant="list"
          />
        </section>
      </div>
    );
  }

  const atCap = attachments.length >= MAX_FILES;

  return (
    <div className="flex flex-col gap-3">
      {localError ? <p className="text-xs text-danger">{localError}</p> : null}

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 bg-[#f0f1f4]/95 px-1 py-2 backdrop-blur-sm">
        {phases.map((phase) => {
          const count = (bucketed[phase.value] ?? []).length;
          const on = expanded[phase.value];
          return (
            <button
              key={phase.value}
              type="button"
              onClick={() => {
                setExpanded((prev) => ({ ...prev, [phase.value]: true }));
                document
                  .getElementById(`drawing-phase-${phase.value}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                on
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-ink/10 bg-white text-ink/55 hover:border-ink/20 hover:text-ink"
              }`}
            >
              {phase.value.toUpperCase()}
              <span className="ml-1 tabular-nums text-ink/40">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {phases.map((phase) => {
          const files = bucketed[phase.value] ?? [];
          const open = Boolean(expanded[phase.value]);
          const busy = uploading && uploadingPhase === phase.value;
          const hasFiles = files.length > 0;
          return (
            <section
              key={phase.value}
              id={`drawing-phase-${phase.value}`}
              className="min-w-0 self-start rounded-2xl border border-ink/[0.07] bg-white px-4 py-3.5 sm:px-5"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="m-0 text-[15px] font-semibold text-ink">
                    {phase.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/45">
                    {hasFiles
                      ? `${files.length} file${files.length === 1 ? "" : "s"}`
                      : isEditable
                        ? "Upload drawings for this phase"
                        : "No files yet"}
                    {phase.percent ? ` · ${phase.percent}` : ""}
                  </p>
                </div>
                {hasFiles ? (
                  <button
                    type="button"
                    onClick={() => toggle(phase.value)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-ink/20 hover:text-ink"
                    aria-expanded={open}
                  >
                    {open ? "Hide files" : `Show files (${files.length})`}
                    <span
                      className={`text-ink/35 transition ${open ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                ) : null}
              </div>

              {isEditable ? (
                <PhaseDropzone
                  compact
                  disabled={uploading || atCap}
                  uploading={busy}
                  onFiles={(list) => onUploadPhase(list, phase.value)}
                />
              ) : null}

              {hasFiles && open ? (
                <AttachmentGrid
                  attachments={files}
                  isEditable={isEditable}
                  confirmDialog={confirmDialog}
                  onDelete={onDelete}
                  variant="list"
                />
              ) : null}

              {hasFiles && !open ? (
                <p className="m-0 text-xs text-ink/40">
                  {files.length} file{files.length === 1 ? "" : "s"} hidden —{" "}
                  <button
                    type="button"
                    className="font-semibold text-brand hover:underline"
                    onClick={() => toggle(phase.value)}
                  >
                    Show files
                  </button>
                </p>
              ) : null}
            </section>
          );
        })}

        {uncategorized.length > 0 ? (
          <section
            id="drawing-phase-uncategorized"
            className="min-w-0 self-start rounded-2xl border border-ink/[0.07] bg-white px-4 py-3.5 sm:px-5 xl:col-span-2"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="m-0 text-[15px] font-semibold text-ink">
                  Uncategorized
                </h3>
                <p className="mt-0.5 text-xs text-ink/45">
                  {uncategorized.length} file
                  {uncategorized.length === 1 ? "" : "s"} without a revision
                  phase
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle("__uncategorized")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-ink/20 hover:text-ink"
                aria-expanded={Boolean(expanded.__uncategorized)}
              >
                {expanded.__uncategorized
                  ? "Hide files"
                  : `Show files (${uncategorized.length})`}
                <span
                  className={`text-ink/35 transition ${
                    expanded.__uncategorized ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
            </div>
            {expanded.__uncategorized ? (
              <AttachmentGrid
                attachments={uncategorized}
                isEditable={isEditable}
                confirmDialog={confirmDialog}
                onDelete={onDelete}
                variant="list"
              />
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
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
