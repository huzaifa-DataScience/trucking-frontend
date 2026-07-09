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
}

export interface PaginatedConversations {
  page: number;
  pageSize: number;
  total: number;
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

export interface SendMessageResponse {
  ok: boolean;
  message: ChatMessage;
}

export interface CreateConversationBody {
  title: string;
  type?: ConversationType;
}

export interface CreateConversationResponse {
  ok: boolean;
  conversation: ChatConversation;
  createdByAppUserId?: number;
}

export type ConversationFilter = "all" | ConversationType;

export const CHAT_POLL_INTERVAL_MS = 12_000;
export const CHAT_PAGE_SIZE = 50;
export const CHAT_MAX_BODY_LENGTH = 1000;
