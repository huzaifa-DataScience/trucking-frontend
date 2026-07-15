"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import { useConnecteamChatSocket } from "@/hooks/useConnecteamChatSocket";
import type {
  ChatConversation,
  ChatMessage,
  ConversationFilter,
  SendMessageResponse,
} from "@/lib/workforce/chat-types";
import { CHAT_FALLBACK_POLL_INTERVAL_MS, CHAT_PAGE_SIZE } from "@/lib/workforce/chat-types";
import {
  mergeChatMessages,
  messagesChronological,
  removeDeletedChatMessage,
  upsertConversationInInbox,
} from "@/lib/workforce/chat-utils";

export function useWorkforceChat(activeConversationId: string | null) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);

  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isFallbackPolling, setIsFallbackPolling] = useState(false);

  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [search, setSearch] = useState("");

  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const searchRef = useRef(search);
  searchRef.current = search;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const prevConversationIdRef = useRef<string | null>(null);

  const fetchInbox = useCallback(async (silent = false) => {
    if (!silent) setInboxLoading(true);
    try {
      const res = await connecteamApi.listConversations({
        search: searchRef.current.trim() || undefined,
        type: filterRef.current === "all" ? undefined : filterRef.current,
        page: 1,
        pageSize: CHAT_PAGE_SIZE,
      });
      setConversations(res.conversations ?? []);
      setInboxTotal(res.total ?? res.conversations?.length ?? 0);
      setInboxError(null);
    } catch (e) {
      if (!silent) setInboxError(getApiErrorMessage(e, "Failed to load conversations"));
    } finally {
      if (!silent) setInboxLoading(false);
    }
  }, []);

  const fetchThread = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setThreadLoading(true);
    try {
      const [convRes, msgRes] = await Promise.all([
        connecteamApi.getConversation(conversationId),
        connecteamApi.listConversationMessages(conversationId, {
          page: 1,
          pageSize: CHAT_PAGE_SIZE,
        }),
      ]);
      setActiveConversation(convRes.conversation);
      if (!convRes.conversation) {
        setThreadError("Conversation not found.");
        setMessages([]);
        setMessagesTotal(0);
        return;
      }
      const chronological = messagesChronological(msgRes.messages ?? []);
      setMessages(chronological);
      setMessagesPage(1);
      setMessagesTotal(msgRes.total ?? chronological.length);
      setThreadError(null);
    } catch (e) {
      if (!silent) setThreadError(getApiErrorMessage(e, "Failed to load messages"));
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  const pollThread = useCallback(async (conversationId: string) => {
    try {
      const msgRes = await connecteamApi.listConversationMessages(conversationId, {
        page: 1,
        pageSize: CHAT_PAGE_SIZE,
      });
      setMessages((prev) => mergeChatMessages(prev, msgRes.messages ?? []));
      setMessagesTotal(msgRes.total ?? msgRes.messages?.length ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  const socketHandlers = useMemo(
    () => ({
      onMessage: ({ message, conversation }: { message: ChatMessage; conversation: ChatConversation }) => {
        setConversations((prev) => upsertConversationInInbox(prev, conversation));
        setInboxTotal((prev) => Math.max(prev, conversationsRef.current.length));

        if (activeConversationIdRef.current === conversation.conversationId) {
          setActiveConversation(conversation);
          setMessages((prev) => mergeChatMessages(prev, [message]));
        }
      },
      onMessageDeleted: ({
        conversationId,
        messageId,
        externalMessageId,
      }: {
        conversationId: string;
        messageId?: string;
        externalMessageId?: string | null;
      }) => {
        if (activeConversationIdRef.current === conversationId) {
          setMessages((prev) => removeDeletedChatMessage(prev, messageId, externalMessageId));
        }
      },
      onConversationUpdated: ({ conversation }: { conversation: ChatConversation }) => {
        setConversations((prev) => upsertConversationInInbox(prev, conversation));
        if (activeConversationIdRef.current === conversation.conversationId) {
          setActiveConversation(conversation);
        }
      },
    }),
    []
  );

  const socketStatus = useConnecteamChatSocket(socketHandlers);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || loadingOlder) return;
    const nextPage = messagesPage + 1;
    const maxPage = Math.ceil(messagesTotal / CHAT_PAGE_SIZE);
    if (nextPage > maxPage) return;

    setLoadingOlder(true);
    try {
      const msgRes = await connecteamApi.listConversationMessages(activeConversationId, {
        page: nextPage,
        pageSize: CHAT_PAGE_SIZE,
      });
      setMessages((prev) => mergeChatMessages(prev, msgRes.messages ?? []));
      setMessagesPage(nextPage);
    } catch (e) {
      setThreadError(getApiErrorMessage(e, "Failed to load older messages"));
    } finally {
      setLoadingOlder(false);
    }
  }, [activeConversationId, loadingOlder, messagesPage, messagesTotal]);

  const sendMessage = useCallback(
    async (body: string, userId?: number): Promise<SendMessageResponse | null> => {
      if (!activeConversationId || !body.trim()) return null;
      setSending(true);
      try {
        const res = await connecteamApi.sendConversationMessage(activeConversationId, {
          body: body.trim(),
          userId,
        });
        setMessages((prev) => mergeChatMessages(prev, [res.message]));
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationId === activeConversationId
              ? {
                  ...c,
                  lastMessagePreview: res.message.body,
                  lastMessageSenderName: res.message.senderName ?? undefined,
                  lastMessageAtIso: res.message.sentAtIso ?? res.message.sentAt ?? undefined,
                }
              : c
          )
        );
        setThreadError(null);
        return res;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Failed to send message");
        setThreadError(msg);
        throw new Error(msg);
      } finally {
        setSending(false);
      }
    },
    [activeConversationId]
  );

  const createChannel = useCallback(
    async (title: string) => {
      const res = await connecteamApi.createConversation({ title, type: "team" });
      await fetchInbox(true);
      return res.conversation;
    },
    [fetchInbox]
  );

  // Initial inbox + filter/search
  useEffect(() => {
    const t = setTimeout(() => void fetchInbox(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchInbox, search, filter]);

  // Thread load on conversation change
  useEffect(() => {
    if (!activeConversationId) {
      prevConversationIdRef.current = null;
      setActiveConversation(null);
      setMessages([]);
      setMessagesPage(1);
      setMessagesTotal(0);
      setThreadError(null);
      setThreadLoading(false);
      return;
    }

    const isSwitch = prevConversationIdRef.current !== activeConversationId;
    prevConversationIdRef.current = activeConversationId;

    const cached = conversationsRef.current.find(
      (c) => c.conversationId === activeConversationId
    );
    if (cached) setActiveConversation(cached);

    if (isSwitch) {
      setMessages([]);
      setMessagesPage(1);
      setMessagesTotal(0);
      setThreadError(null);
    }

    void fetchThread(activeConversationId);
  }, [activeConversationId, fetchThread]);

  // Resync once when socket (re)connects
  useEffect(() => {
    if (socketStatus !== "connected") return;
    void fetchInbox(true);
    if (activeConversationId) void pollThread(activeConversationId);
  }, [socketStatus, activeConversationId, fetchInbox, pollThread]);

  // Fallback poll only when WebSocket is down
  useEffect(() => {
    if (socketStatus === "connected" || socketStatus === "connecting") {
      setIsFallbackPolling(false);
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setIsFallbackPolling(true);
      void fetchInbox(true).finally(() => setIsFallbackPolling(false));
      if (activeConversationIdRef.current) void pollThread(activeConversationIdRef.current);
    };

    const start = () => {
      if (timer) return;
      tick();
      timer = setInterval(tick, CHAT_FALLBACK_POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      setIsFallbackPolling(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [socketStatus, fetchInbox, pollThread]);

  const hasOlderMessages = messagesPage * CHAT_PAGE_SIZE < messagesTotal;

  return {
    conversations,
    inboxTotal,
    inboxLoading,
    inboxError,
    activeConversation,
    messages,
    messagesTotal,
    threadLoading,
    loadingOlder,
    hasOlderMessages,
    threadError,
    sending,
    socketStatus,
    isFallbackPolling,
    filter,
    setFilter,
    search,
    setSearch,
    sendMessage,
    loadOlderMessages,
    createChannel,
    refreshInbox: () => fetchInbox(true),
    refreshThread: () =>
      activeConversationId ? fetchThread(activeConversationId, true) : Promise.resolve(),
  };
}
