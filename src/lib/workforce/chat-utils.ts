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
  if (m.messageId) return `id:${m.messageId}`;
  if (m.externalMessageId) return `ext:${m.externalMessageId}`;
  const sender = m.userId ?? m.appUserId ?? "unknown";
  return `fb:${m.conversationId}:${m.sentAt ?? ""}:${sender}:${m.body}`;
}

/** True when two rows represent the same chat message (WS vs REST ids may differ). */
export function messagesSame(a: ChatMessage, b: ChatMessage): boolean {
  if (a.messageId && b.messageId && a.messageId === b.messageId) return true;
  if (
    a.externalMessageId &&
    b.externalMessageId &&
    a.externalMessageId === b.externalMessageId
  ) {
    return true;
  }
  if (a.messageId || b.messageId || a.externalMessageId || b.externalMessageId) {
    return false;
  }
  return (
    a.conversationId === b.conversationId &&
    a.body === b.body &&
    messageSentAt(a) === messageSentAt(b) &&
    (a.userId ?? a.appUserId) === (b.userId ?? b.appUserId)
  );
}

/** Merge polled / WS messages — never collapse different senders or missing ids. */
export function mergeChatMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const list = [...existing];
  for (const m of incoming) {
    if (m.isDeleted) {
      const idx = list.findIndex((x) => messagesSame(x, m));
      if (idx >= 0) list.splice(idx, 1);
      continue;
    }
    const idx = list.findIndex((x) => messagesSame(x, m));
    if (idx >= 0) list[idx] = { ...list[idx], ...m };
    else list.push(m);
  }
  return messagesChronological(list);
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

export function mergeInboxFromApi(
  existing: ChatConversation[],
  fromApi: ChatConversation[]
): ChatConversation[] {
  const byId = new Map<string, ChatConversation>();
  for (const c of existing) byId.set(c.conversationId, c);
  for (const c of fromApi) {
    const prev = byId.get(c.conversationId);
    if (!prev || conversationLastMessageTime(c) >= conversationLastMessageTime(prev)) {
      byId.set(c.conversationId, c);
    }
  }
  return sortConversationsByRecent([...byId.values()]);
}

export function conversationFromMessage(
  message: ChatMessage,
  existing?: ChatConversation | null
): ChatConversation {
  return {
    conversationId: message.conversationId,
    type: existing?.type ?? "team",
    title: existing?.title,
    conversationLabel: existing?.conversationLabel,
    typeLabel: existing?.typeLabel,
    lastMessagePreview: message.body,
    lastMessageSenderName: message.senderName ?? undefined,
    lastMessageAtIso: message.sentAtIso ?? message.sentAt ?? undefined,
    messageCount: (existing?.messageCount ?? 0) + 1,
    recordSource: existing?.recordSource,
  };
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
