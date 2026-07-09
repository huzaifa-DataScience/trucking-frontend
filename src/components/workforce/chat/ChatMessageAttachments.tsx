"use client";

import type { ChatAttachment } from "@/lib/workforce/chat-types";

export function ChatMessageAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  if (!attachments.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a, i) => {
        const name = a.fileName ?? "file";
        if (a.type === "image" && a.url) {
          return (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg ring-1 ring-black/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={name}
                className="max-h-48 max-w-full object-cover"
                loading="lazy"
              />
            </a>
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
    </div>
  );
}
