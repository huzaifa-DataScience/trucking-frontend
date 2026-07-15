/** Workforce live chat — docs/FRONTEND_CONNECTEAM_CHAT.md */

import type { WorkforceUserSummary } from "@/lib/workforce/types";

export type ConversationType = "team" | "channel" | "private";
export type ChatRecordSource = "sync" | "native";

export interface ChatConversation {
  conversationId: string;
  title?: string | null;
  type: ConversationType;
  conversationSource?: string;
  recordSource?: ChatRecordSource;
  isDeleted?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageSenderName?: string | null;
  messageCount?: number;
  conversationLabel?: string;
  typeLabel?: string;
  lastMessageAtIso?: string | null;
  unreadCount?: number;
}

export interface PaginatedConversations {
  page: number;
  pageSize: number;
  total: number;
  totalUnread?: number;
  conversations: ChatConversation[];
}

export interface ChatAttachment {
  type?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  userId?: number;
  appUserId?: number | null;
  body: string;
  sentAt?: string;
  sentAtIso?: string | null;
  recordSource?: ChatRecordSource;
  externalMessageId?: string | null;
  isDeleted?: boolean;
  messageType?: string;
  modifiedAt?: string | null;
  senderName?: string | null;
  user?: WorkforceUserSummary | null;
  attachments?: ChatAttachment[] | null;
}

export interface PaginatedMessages {
  page: number;
  pageSize: number;
  total: number;
  source?: string;
  messages: ChatMessage[];
}

export interface SendMessageBody {
  body: string;
  userId?: number;
}

export interface ConnecteamSendResult {
  sent: boolean;
  externalMessageId?: string | null;
  error?: string | null;
}

export interface SendMessageResponse {
  ok: boolean;
  message: ChatMessage;
  connecteam?: ConnecteamSendResult;
}

export interface CreateConversationBody {
  title: string;
  type?: ConversationType;
}

export interface CreateConversationResponse {
  ok: boolean;
  conversation: ChatConversation;
  createdByAppUserId?: number;
  connecteam?: ConnecteamSendResult;
}

/** Socket.IO — server → client (docs/FRONTEND_CONNECTEAM_CHAT.md §2.1) */
export interface ChatMessageSocketPayload {
  message: ChatMessage;
  conversation: ChatConversation;
}

export interface ChatMessageDeletedSocketPayload {
  conversationId: string;
  messageId?: string;
  externalMessageId?: string | null;
}

export interface ChatConversationUpdatedSocketPayload {
  conversation: ChatConversation;
}

export interface ChatUnreadUpdatedSocketPayload {
  conversationId: string;
  unreadCount: number;
  totalUnread: number;
}

export interface MarkConversationReadBody {
  lastReadMessageId?: string;
  lastReadAt?: string;
}

export interface MarkConversationReadResponse {
  ok: boolean;
  unreadCount: number;
  totalUnread: number;
}

export type ChatSocketStatus = "connecting" | "connected" | "disconnected";

export type ConversationFilter = "all" | ConversationType;

export const CHAT_FALLBACK_POLL_INTERVAL_MS = 30_000;
/** Background inbox refresh while WS is connected (safety net) */
export const CHAT_INBOX_SYNC_INTERVAL_MS = 45_000;
/** Inbox list page size */
export const CHAT_PAGE_SIZE = 50;
/** Thread fetch — API allows up to 200; load more via "Load older" */
export const CHAT_THREAD_PAGE_SIZE = 200;
export const CHAT_MAX_BODY_LENGTH = 1000;
