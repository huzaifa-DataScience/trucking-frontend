"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import type { BidAttachment } from "@/lib/bidding/types";
import {
  INTAKE_ADD_BTN,
  INTAKE_REMOVE_BTN,
  PlusIcon,
  TrashIcon,
} from "@/components/bidding/intakeIcons";

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
  { value: "specifications", label: "Specs / manuals" },
  { value: "invitation", label: "Invitation" },
  { value: "addenda", label: "Addenda" },
];

/** Folder prefix from `fileName` paths like `Mechanical/M-101.pdf` (FRONTEND_EST.md). */
function folderFromFileName(fileName: string): string {
  const norm = fileName.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i > 0 ? norm.slice(0, i) : "";
}

function groupAttachmentsByFolder(attachments: BidAttachment[]): {
  folder: string;
  items: BidAttachment[];
}[] {
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
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(name)) return "IMG";
  return "FILE";
}

/** Prefer attachment mime / extension so browsers can preview (API often returns octet-stream). */
function typedAttachmentBlob(att: BidAttachment, blob: Blob): Blob {
  const name = att.fileName.toLowerCase();
  let type = att.mimeType?.trim() || blob.type || "";
  if (!type || type === "application/octet-stream") {
    if (name.endsWith(".pdf")) type = "application/pdf";
    else if (name.endsWith(".png")) type = "image/png";
    else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) type = "image/jpeg";
    else if (name.endsWith(".webp")) type = "image/webp";
    else if (name.endsWith(".gif")) type = "image/gif";
    else if (name.endsWith(".csv")) type = "text/csv";
    else if (name.endsWith(".doc")) type = "application/msword";
    else if (name.endsWith(".docx")) {
      type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (name.endsWith(".zip")) type = "application/zip";
  }
  if (type && type !== blob.type) return new Blob([blob], { type });
  return blob;
}

function isImageAttachment(att: BidAttachment): boolean {
  if (att.mimeType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(att.fileName);
}

function isPdfAttachment(att: BidAttachment): boolean {
  return att.mimeType === "application/pdf" || att.fileName.toLowerCase().endsWith(".pdf");
}

function isCsvAttachment(att: BidAttachment): boolean {
  return att.mimeType === "text/csv" || att.fileName.toLowerCase().endsWith(".csv");
}

async function downloadAttachment(att: BidAttachment) {
  const blob = typedAttachmentBlob(att, await biddingApi.fetchBidAttachmentBlob(att.downloadPath));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = att.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function viewAttachment(att: BidAttachment) {
  const blob = typedAttachmentBlob(att, await biddingApi.fetchBidAttachmentBlob(att.downloadPath));
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.download = att.fileName;
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function AttachmentPreview({
  attachment,
  compact = false,
}: {
  attachment: BidAttachment;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void biddingApi
      .fetchBidAttachmentBlob(attachment.downloadPath)
      .then(async (raw) => {
        if (cancelled) return;
        const blob = typedAttachmentBlob(attachment, raw);
        if (isCsvAttachment(attachment)) {
          const text = await blob.text();
          if (cancelled) return;
          setTextPreview(text.slice(0, 400));
          return;
        }
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
  }, [attachment.downloadPath, attachment.fileName, attachment.mimeType]);

  const shell = compact
    ? "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e5e7eb] bg-[#f8f9fb]"
    : "flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-ink/[0.04]";

  if (error) {
    return (
      <div className={`${shell} text-[10px] text-ink/40`}>
        {fileKindLabel(attachment)}
      </div>
    );
  }

  if (isCsvAttachment(attachment)) {
    if (!textPreview) {
      return <div className={`${shell} text-[10px] text-ink/40`}>…</div>;
    }
    return (
      <pre
        className={`${shell} overflow-hidden p-1 text-left text-[7px] leading-tight text-ink/60 whitespace-pre-wrap`}
        title={attachment.fileName}
      >
        {textPreview}
      </pre>
    );
  }

  if (!url) {
    return <div className={`${shell} text-[10px] text-ink/40`}>…</div>;
  }

  if (isPdfAttachment(attachment)) {
    return (
      <iframe
        title={attachment.fileName}
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
        className={compact ? "h-12 w-12 border-0 bg-white pointer-events-none" : "h-28 w-full border-0 bg-white"}
      />
    );
  }

  if (isImageAttachment(attachment)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={attachment.fileName}
        className={compact ? "h-12 w-12 object-cover" : "h-28 w-full object-cover"}
      />
    );
  }

  return (
    <div className={`${shell} text-[10px] font-bold tracking-wide text-[#5a5340]`}>
      {fileKindLabel(attachment)}
    </div>
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
  const groups = groupAttachmentsByFolder(attachments);
  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ folder, items }) => (
        <div key={folder || "__root"}>
          {folder ? (
            <p className="mb-1.5 text-[11px] font-semibold text-[#4b5563]">{folder}/</p>
          ) : null}
          <ul className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {items.map((att) => (
              <li key={att.id} className="overflow-hidden rounded border border-[#e5e7eb] bg-white">
                <button
                  type="button"
                  className="block w-full cursor-pointer text-left"
                  title={`Preview ${att.fileName}`}
                  onClick={() => void viewAttachment(att)}
                >
                  <AttachmentPreview attachment={att} />
                </button>
                <div className="space-y-0.5 p-2">
                  <p
                    className="truncate text-[12.5px] font-medium text-[#1f2937]"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </p>
                  <p className="text-[11px] text-[#9ca3af]">{formatBytes(att.sizeBytes)}</p>
                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => void viewAttachment(att)}
                      className="text-[11px] font-semibold text-brand hover:underline"
                    >
                      View
                    </button>
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
                        className={INTAKE_REMOVE_BTN}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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

  const groups = groupAttachmentsByFolder(attachments);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {groups.map(({ folder, items }) => (
        <div key={folder || "__root"}>
          {folder ? (
            <p className="mb-1 px-0.5 text-[11px] font-semibold text-[#4b5563]">{folder}/</p>
          ) : null}
          <ul className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            {items.map((att) => (
              <li
                key={att.id}
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#e5e7eb] bg-white px-3 py-2.5 first:border-t-0 hover:bg-[#faf7f0]"
              >
                <button
                  type="button"
                  className="cursor-pointer overflow-hidden rounded-md"
                  title={`Preview ${att.fileName}`}
                  onClick={() => void viewAttachment(att)}
                >
                  <AttachmentPreview attachment={att} compact />
                </button>
                <div className="min-w-0">
                  <p
                    className="truncate text-[12.5px] font-semibold text-[#1f2937]"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">
                    {formatBytes(att.sizeBytes)}
                  </p>
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
                            title: "Remove drawing?",
                            message: `Remove "${att.fileName}"?`,
                            confirmLabel: "Remove",
                            variant: "danger",
                          });
                          if (!ok) return;
                          void onDelete(att.id);
                        })();
                      }}
                      className={INTAKE_REMOVE_BTN}
                      aria-label="Remove drawing"
                      title="Remove drawing"
                    >
                      <TrashIcon />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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
  onBrowseFolder,
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
  onBrowseFolder: () => void;
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
                    or browse — max {MAX_FILES} files · ZIP / folder ok
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || atLimit}
                  className="intake-head-btn cursor-pointer border-[#d9d4c8] bg-[#f3f1ea] text-[#5a5340] hover:bg-[#ebe6da] disabled:cursor-default disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrowse();
                  }}
                >
                  Browse files
                </button>
                <button
                  type="button"
                  disabled={busy || atLimit}
                  className="intake-head-btn cursor-pointer border-[#d9d4c8] bg-white text-[#5a5340] hover:bg-[#f3f1ea] disabled:cursor-default disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrowseFolder();
                  }}
                >
                  Add folder
                </button>
              </div>
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
  onUploadMany,
  onDelete,
  mode = "general",
  drawingCategoryOptions,
  labels,
  title,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  onUpload: (
    file: File,
    opts?: { label?: string; category?: string; drawingCategory?: string; relativePath?: string }
  ) => Promise<void>;
  /** Prefer for folder / multi-file — one POST with `files` (FRONTEND_EST.md). */
  onUploadMany?: (
    files: File[],
    opts?: { label?: string; category?: string; drawingCategory?: string }
  ) => Promise<void>;
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
  const folderInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, []);

  const uploadOptsFor = useCallback(
    (label: string) => {
      if (mode === "drawings") {
        return {
          label: "drawings",
          drawingCategory: pendingDrawingCategory || undefined,
        };
      }
      if (mode === "markup") {
        return { label: label || "takeoff", category: "takeoff_markup" as const };
      }
      return { label, category: pendingCategory };
    },
    [mode, pendingCategory, pendingDrawingCategory]
  );

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

      const opts = uploadOptsFor(label);
      setLocalUploading(true);
      try {
        if (onUploadMany && batch.length > 1) {
          await onUploadMany(batch, opts);
        } else if (onUploadMany) {
          await onUploadMany(batch, opts);
        } else {
          for (const file of batch) {
            const relativePath =
              (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
              undefined;
            await onUpload(file, { ...opts, relativePath });
          }
        }
      } finally {
        setLocalUploading(false);
      }
    },
    [attachments.length, onUpload, onUploadMany, pendingLabel, uploadOptsFor]
  );

  if (mode === "drawings") {
    return (
      <>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
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
          onBrowseFolder={() => folderInputRef.current?.click()}
          onDropFiles={(files) => void handleFiles(files)}
          inputRef={inputRef}
          confirmDialog={confirmDialog}
          onDelete={onDelete}
        />
      </>
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

  const browseForLabel = (label: string, folder = false) => {
    setPendingLabel(label);
    pendingLabelRef.current = label;
    if (folder) folderInputRef.current?.click();
    else inputRef.current?.click();
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
        <input
          ref={folderInputRef}
          type="file"
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
            <button
              type="button"
              disabled={busy || atLimit}
              onClick={() => folderInputRef.current?.click()}
              className="intake-head-btn disabled:opacity-50"
            >
              Add folder
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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || atLimit}
                      onClick={() => browseForLabel(o.value, false)}
                      className={`${INTAKE_ADD_BTN} disabled:opacity-50`}
                      aria-label={
                        busy && pendingLabel === o.value
                          ? "Uploading"
                          : `Add ${o.label}`
                      }
                      title={
                        busy && pendingLabel === o.value
                          ? "Uploading…"
                          : `Add ${o.label}`
                      }
                    >
                      {busy && pendingLabel === o.value ? (
                        <span className="text-[10px] font-semibold">…</span>
                      ) : (
                        <PlusIcon />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busy || atLimit}
                      onClick={() => browseForLabel(o.value, true)}
                      className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50"
                      title={`Add folder to ${o.label}`}
                    >
                      Folder
                    </button>
                  </div>
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
      <div className="intake-section-head-bar">
        <div>
          <h3>{title}</h3>
        </div>
        {countLabel ? (
          <span className="intake-head-count">{countLabel}</span>
        ) : null}
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
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#e5e7eb] bg-white px-3 py-2 first:border-t-0"
              >
                <button
                  type="button"
                  className="cursor-pointer overflow-hidden rounded-md"
                  title={`Preview ${att.fileName}`}
                  onClick={() => void viewAttachment(att)}
                >
                  <AttachmentPreview attachment={att} compact />
                </button>
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
                      className={INTAKE_REMOVE_BTN}
                      aria-label="Remove file"
                      title="Remove file"
                    >
                      <TrashIcon />
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
