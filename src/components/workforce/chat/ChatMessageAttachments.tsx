"use client";

import { useEffect, useState } from "react";
import type { ChatAttachment } from "@/lib/workforce/chat-types";

function ImagePreviewModal({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!attachment.url) return null;
  const name = attachment.fileName ?? "photo";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex gap-2">
        <a
          href={attachment.url}
          download={name}
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
        >
          Download
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-lg bg-white/10 p-1.5 text-white backdrop-blur transition hover:bg-white/20"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.url}
        alt={name}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ChatMessageAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  const [preview, setPreview] = useState<ChatAttachment | null>(null);

  if (!attachments.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a, i) => {
        const name = a.fileName ?? "file";
        if (a.type === "image" && a.url) {
          return (
            <button
              key={`${a.url}-${i}`}
              type="button"
              onClick={() => setPreview(a)}
              className="block overflow-hidden rounded-lg ring-1 ring-black/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={name}
                className="max-h-80 max-w-full object-cover"
                loading="lazy"
              />
            </button>
          );
        }
        if (a.url) {
          return (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M14 3v4a1 1 0 001 1h4M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {name}
            </a>
          );
        }
        return (
          <span key={`${name}-${i}`} className="text-xs opacity-75">
            [file: {name}]
          </span>
        );
      })}
      {preview ? <ImagePreviewModal attachment={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
