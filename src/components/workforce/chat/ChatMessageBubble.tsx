"use client";

import { UserAvatar } from "@/components/workforce/UserAvatar";
import type { ChatMessage } from "@/lib/workforce/chat-types";
import {
  formatMessageTime,
  isOwnChatMessage,
  messageSenderDisplay,
  messageSentAt,
  shouldShowSenderName,
} from "@/lib/workforce/chat-utils";
import { ChatMessageAttachments } from "./ChatMessageAttachments";

export function ChatMessageBubble({
  message,
  conversationType,
  connecteamUserId,
  appUserId,
  showAvatar = true,
}: {
  message: ChatMessage;
  conversationType?: string;
  connecteamUserId?: number | null;
  appUserId?: number | null;
  showAvatar?: boolean;
}) {
  const isOwn = isOwnChatMessage(message, connecteamUserId, appUserId);
  const showSender = shouldShowSenderName(conversationType, isOwn);
  const attachments = message.attachments?.filter(Boolean) ?? [];
  const sentLabel = formatMessageTime(messageSentAt(message));
  const modified = message.modifiedAt ? " · edited" : "";

  return (
    <div className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {showAvatar && !isOwn ? (
        <UserAvatar user={message.user} size={32} />
      ) : showAvatar ? (
        <div className="w-8 shrink-0" aria-hidden />
      ) : null}

      <div className={`flex max-w-[min(520px,85%)] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {showSender ? (
          <p className="mb-1 px-1 text-[11px] font-semibold text-ink/45">
            {messageSenderDisplay(message)}
          </p>
        ) : null}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
            isOwn
              ? "rounded-br-md bg-brand text-white"
              : "rounded-bl-md border border-ink/[0.06] bg-surface text-ink"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          {attachments.length > 0 ? (
            <div className={isOwn ? "text-white" : ""}>
              <ChatMessageAttachments attachments={attachments} />
            </div>
          ) : null}
        </div>
        {sentLabel ? (
          <p className={`mt-1 px-1 text-[10px] text-ink/35 ${isOwn ? "text-right" : ""}`}>
            {sentLabel}
            {modified}
            {message.recordSource === "native" && isOwn ? " · sent from portal" : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
