/**
 * Chat merge + display helpers — docs/FRONTEND_CONNECTEAM_CHAT.md
 */
import type { ChatConversation, ChatMessage } from "@/lib/workforce/chat-types";
import { userDisplayName } from "@/lib/workforce/display";

export function conversationDisplayLabel(c: ChatConversation): string {
  return c.conversationLabel ?? c.title ?? "Conversation";
}

export function messageSenderDisplay(m: ChatMessage): string {
  if (m.senderName) return m.senderName;
  if (m.user) return userDisplayName(m.user, m.userId);
  return "Unknown";
}

export function messageSentAt(m: ChatMessage): string | null {
  return m.sentAtIso ?? m.sentAt ?? null;
}

export function messagesChronological(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const ta = messageSentAt(a);
    const tb = messageSentAt(b);
    if (!ta && !tb) return 0;
    if (!ta) return -1;
    if (!tb) return 1;
    return new Date(ta).getTime() - new Date(tb).getTime();
  });
}

export function messageDedupKey(m: ChatMessage): string {
  return m.messageId || m.externalMessageId || `${m.conversationId}-${m.sentAt}-${m.body}`;
}

/** Merge polled messages into existing list by messageId / externalMessageId. */
export function mergeChatMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of existing) {
    map.set(messageDedupKey(m), m);
  }
  for (const m of incoming) {
    if (m.isDeleted) {
      map.delete(messageDedupKey(m));
      continue;
    }
    map.set(messageDedupKey(m), m);
  }
  return messagesChronological([...map.values()]);
}

export function inboxPreview(c: ChatConversation): string {
  const preview = c.lastMessagePreview?.trim();
  if (!preview) return "No messages yet";
  const sender = c.lastMessageSenderName?.trim();
  if (sender) return `${sender}: ${preview}`;
  return preview;
}

export function formatChatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatMessageTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isOwnChatMessage(
  m: ChatMessage,
  connecteamUserId?: number | null,
  appUserId?: number | null
): boolean {
  if (connecteamUserId != null && m.userId === connecteamUserId) return true;
  if (appUserId != null && m.appUserId === appUserId) return true;
  return false;
}

export function shouldShowSenderName(
  conversationType: string | undefined,
  isOwn: boolean
): boolean {
  if (isOwn) return false;
  return conversationType !== "private";
}

/** Active thread id from `/workforce/chat` or `/workforce/chat/:id`. */
export function chatConversationIdFromPath(pathname: string): string | null {
  if (pathname === "/workforce/chat") return null;
  const prefix = "/workforce/chat/";
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).split("/")[0];
  return segment ? decodeURIComponent(segment) : null;
}

export function conversationLastMessageTime(c: ChatConversation): number {
  const iso = c.lastMessageAtIso ?? c.lastMessageAt;
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortConversationsByRecent(
  conversations: ChatConversation[]
): ChatConversation[] {
  return [...conversations].sort(
    (a, b) => conversationLastMessageTime(b) - conversationLastMessageTime(a)
  );
}

export function upsertConversationInInbox(
  list: ChatConversation[],
  conversation: ChatConversation
): ChatConversation[] {
  const next = list.filter((c) => c.conversationId !== conversation.conversationId);
  next.push(conversation);
  return sortConversationsByRecent(next);
}

export function messageMatchesDeleteTarget(
  m: ChatMessage,
  messageId?: string,
  externalMessageId?: string | null
): boolean {
  if (messageId && m.messageId === messageId) return true;
  if (externalMessageId && m.externalMessageId === externalMessageId) return true;
  return false;
}

export function removeDeletedChatMessage(
  messages: ChatMessage[],
  messageId?: string,
  externalMessageId?: string | null
): ChatMessage[] {
  return messages.filter((m) => !messageMatchesDeleteTarget(m, messageId, externalMessageId));
}
