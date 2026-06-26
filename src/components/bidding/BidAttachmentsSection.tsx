"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { BidAttachment } from "@/lib/bidding/types";

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,text/csv,.csv";

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

export function BidAttachmentsSection({
  attachments,
  isEditable,
  uploading,
  onUpload,
  onDelete,
}: {
  attachments: BidAttachment[];
  isEditable: boolean;
  uploading?: boolean;
  onUpload: (file: File, label?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
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

      for (const file of Array.from(files)) {
        const label = window.prompt(
          `Label for "${file.name}" (optional — press OK to skip)`,
          ""
        );
        await onUpload(file, label?.trim() || undefined);
      }
    },
    [attachments.length, onUpload]
  );

  return (
    <Card>
      <CardHeader
        title="Attachments"
        subtitle="Site photos, screenshots, PDFs, and CSV exports — up to 10 MB each."
        action={
          isEditable ? (
            <>
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
              <button
                type="button"
                disabled={uploading || attachments.length >= MAX_FILES}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Add file"}
              </button>
            </>
          ) : null
        }
      />

      {localError ? (
        <p className="mb-3 text-xs text-danger">{localError}</p>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-ink/45">No attachments yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="overflow-hidden rounded-xl border border-ink/[0.08] bg-surface"
            >
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
                      void biddingApi
                        .fetchBidAttachmentBlob(att.downloadPath)
                        .then((blob) => {
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
                      onClick={() => void onDelete(att.id)}
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
      )}
    </Card>
  );
}
