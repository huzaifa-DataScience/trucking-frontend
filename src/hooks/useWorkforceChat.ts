"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import { useConnecteamChatSocket } from "@/hooks/useConnecteamChatSocket";
import type {
  ChatConversation,
  ChatMessage,
  ChatUnreadUpdatedSocketPayload,
  ConversationFilter,
  SendMessageResponse,
} from "@/lib/workforce/chat-types";
import {
  CHAT_FALLBACK_POLL_INTERVAL_MS,
  CHAT_INBOX_SYNC_INTERVAL_MS,
  CHAT_PAGE_SIZE,
  CHAT_THREAD_PAGE_SIZE,
} from "@/lib/workforce/chat-types";
import { dispatchChatUnreadTotal } from "@/lib/workforce/chat-unread";
import {
  conversationFromMessage,
  isOwnChatMessage,
  mergeChatMessages,
  mergeInboxFromApi,
  messageSentAt,
  messagesChronological,
  removeDeletedChatMessage,
  upsertConversationInInbox,
} from "@/lib/workforce/chat-utils";

export function useWorkforceChat(
  activeConversationId: string | null,
  options?: { connecteamUserId?: number | null; appUserId?: number | null }
) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [inboxPage, setInboxPage] = useState(1);
  const [loadingMoreInbox, setLoadingMoreInbox] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
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
  const [threadPendingNew, setThreadPendingNew] = useState(0);

  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [search, setSearch] = useState("");

  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const searchRef = useRef(search);
  searchRef.current = search;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const inboxPageRef = useRef(1);
  inboxPageRef.current = inboxPage;
  const inboxTotalRef = useRef(inboxTotal);
  inboxTotalRef.current = inboxTotal;
  const loadingMoreInboxRef = useRef(false);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const threadFetchGenRef = useRef(0);
  const wasSocketConnectedRef = useRef(false);
  const threadAtBottomRef = useRef(true);
  const lastReadPostRef = useRef<Record<string, string>>({});
  const connecteamUserIdRef = useRef(options?.connecteamUserId ?? null);
  const appUserIdRef = useRef(options?.appUserId ?? null);
  connecteamUserIdRef.current = options?.connecteamUserId ?? null;
  appUserIdRef.current = options?.appUserId ?? null;

  const applyUnreadUpdate = useCallback((payload: ChatUnreadUpdatedSocketPayload) => {
    setTotalUnread(payload.totalUnread);
    setConversations((prev) =>
      prev.map((c) =>
        c.conversationId === payload.conversationId
          ? { ...c, unreadCount: payload.unreadCount }
          : c
      )
    );
    dispatchChatUnreadTotal(payload.totalUnread);
  }, []);

  const markRead = useCallback(
    async (conversationId: string, lastMessage?: ChatMessage | null) => {
      const messageId = lastMessage?.messageId;
      if (messageId && lastReadPostRef.current[conversationId] === messageId) {
        setThreadPendingNew(0);
        return;
      }

      setThreadPendingNew(0);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );

      try {
        const res = await connecteamApi.markConversationRead(
          conversationId,
          messageId
            ? {
                lastReadMessageId: messageId,
                lastReadAt: messageSentAt(lastMessage!) ?? undefined,
              }
            : undefined
        );
        if (messageId) lastReadPostRef.current[conversationId] = messageId;
        setTotalUnread(res.totalUnread);
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationId === conversationId
              ? { ...c, unreadCount: res.unreadCount ?? 0 }
              : c
          )
        );
        dispatchChatUnreadTotal(res.totalUnread);
      } catch {
        /* inbox sync will reconcile */
      }
    },
    []
  );

  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  const fetchInboxPage = useCallback(
    async (
      page: number,
      options?: { silent?: boolean; append?: boolean }
    ) => {
      const silent = options?.silent ?? false;
      const append = options?.append ?? false;

      if (!silent && !append) setInboxLoading(true);
      if (append) {
        loadingMoreInboxRef.current = true;
        setLoadingMoreInbox(true);
      }

      try {
        const res = await connecteamApi.listConversations({
          search: searchRef.current.trim() || undefined,
          type: filterRef.current === "all" ? undefined : filterRef.current,
          page,
          pageSize: CHAT_PAGE_SIZE,
        });
        const fromApi = res.conversations ?? [];

        setConversations((prev) => {
          if (append || silent) return mergeInboxFromApi(prev, fromApi);
          return fromApi;
        });

        setInboxTotal(res.total ?? fromApi.length);
        inboxPageRef.current = page;
        setInboxPage(page);

        if (typeof res.totalUnread === "number") {
          setTotalUnread(res.totalUnread);
          dispatchChatUnreadTotal(res.totalUnread);
        }
        setInboxError(null);
      } catch (e) {
        if (!silent && !append) {
          setInboxError(getApiErrorMessage(e, "Failed to load conversations"));
        }
      } finally {
        if (!silent && !append) setInboxLoading(false);
        if (append) {
          loadingMoreInboxRef.current = false;
          setLoadingMoreInbox(false);
        }
      }
    },
    []
  );

  const fetchInbox = useCallback(
    (silent = false) => fetchInboxPage(1, { silent, append: false }),
    [fetchInboxPage]
  );

  const loadMoreInbox = useCallback(async () => {
    if (loadingMoreInboxRef.current) return;
    const nextPage = inboxPageRef.current + 1;
    const total = inboxTotalRef.current;
    if (inboxPageRef.current * CHAT_PAGE_SIZE >= total) return;
    await fetchInboxPage(nextPage, { silent: true, append: true });
  }, [fetchInboxPage]);

  const fetchThread = useCallback(async (conversationId: string) => {
    const gen = ++threadFetchGenRef.current;
    setThreadLoading(true);
    setThreadError(null);

    try {
      const [convRes, msgRes] = await Promise.all([
        connecteamApi.getConversation(conversationId),
        connecteamApi.listConversationMessages(conversationId, {
          page: 1,
          pageSize: CHAT_THREAD_PAGE_SIZE,
        }),
      ]);

      if (
        threadFetchGenRef.current !== gen ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }

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
      threadAtBottomRef.current = true;
      setThreadPendingNew(0);
      void markReadRef.current(
        conversationId,
        chronological[chronological.length - 1] ?? null
      );
    } catch (e) {
      if (
        threadFetchGenRef.current === gen &&
        activeConversationIdRef.current === conversationId
      ) {
        setThreadError(getApiErrorMessage(e, "Failed to load messages"));
      }
    } finally {
      if (
        threadFetchGenRef.current === gen &&
        activeConversationIdRef.current === conversationId
      ) {
        setThreadLoading(false);
      }
    }
  }, []);

  const pollThread = useCallback(async (conversationId: string) => {
    if (activeConversationIdRef.current !== conversationId) return;
    try {
      const msgRes = await connecteamApi.listConversationMessages(conversationId, {
        page: 1,
        pageSize: CHAT_THREAD_PAGE_SIZE,
      });
      if (activeConversationIdRef.current !== conversationId) return;
      setMessages((prev) => mergeChatMessages(prev, msgRes.messages ?? []));
      setMessagesTotal(msgRes.total ?? msgRes.messages?.length ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  const bumpInboxFromMessage = useCallback(
    (message: ChatMessage, conversation?: ChatConversation | null) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.conversationId === message.conversationId);
        const row = conversation
          ? conversation
          : conversationFromMessage(message, existing);
        return upsertConversationInInbox(prev, row);
      });
    },
    []
  );

  const socketHandlers = useMemo(
    () => ({
      onMessage: ({
        message,
        conversation,
      }: {
        message: ChatMessage;
        conversation: ChatConversation;
      }) => {
        bumpInboxFromMessage(message, conversation);

        const activeId = activeConversationIdRef.current;
        const isOwn = isOwnChatMessage(
          message,
          connecteamUserIdRef.current,
          appUserIdRef.current
        );

        if (activeId === message.conversationId) {
          setActiveConversation(conversation);
          setMessages((prev) => {
            if (activeConversationIdRef.current !== message.conversationId) return prev;
            return mergeChatMessages(prev, [message]);
          });
        }

        if (!isOwn && activeId === message.conversationId) {
          if (threadAtBottomRef.current) {
            void markReadRef.current(message.conversationId, message);
          } else {
            setThreadPendingNew((n) => n + 1);
          }
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
        if (activeConversationIdRef.current !== conversationId) return;
        setMessages((prev) => removeDeletedChatMessage(prev, messageId, externalMessageId));
      },
      onConversationUpdated: ({ conversation }: { conversation: ChatConversation }) => {
        setConversations((prev) => upsertConversationInInbox(prev, conversation));
        if (activeConversationIdRef.current === conversation.conversationId) {
          setActiveConversation(conversation);
        }
      },
      onUnreadUpdated: (payload: ChatUnreadUpdatedSocketPayload) => {
        applyUnreadUpdate(payload);
      },
    }),
    [bumpInboxFromMessage, applyUnreadUpdate]
  );

  const socketStatus = useConnecteamChatSocket(socketHandlers);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || loadingOlder) return;
    const conversationId = activeConversationId;
    const nextPage = messagesPage + 1;
    const maxPage = Math.ceil(messagesTotal / CHAT_THREAD_PAGE_SIZE);
    if (nextPage > maxPage) return;

    setLoadingOlder(true);
    try {
      const msgRes = await connecteamApi.listConversationMessages(conversationId, {
        page: nextPage,
        pageSize: CHAT_THREAD_PAGE_SIZE,
      });
      if (activeConversationIdRef.current !== conversationId) return;
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
        if (activeConversationIdRef.current === activeConversationId) {
          setMessages((prev) => mergeChatMessages(prev, [res.message]));
        }
        bumpInboxFromMessage(res.message, activeConversation ?? undefined);
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
    [activeConversationId, activeConversation, bumpInboxFromMessage]
  );

  const createChannel = useCallback(
    async (title: string) => {
      const res = await connecteamApi.createConversation({ title, type: "team" });
      setConversations((prev) => upsertConversationInInbox(prev, res.conversation));
      return res.conversation;
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => void fetchInbox(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchInbox, search, filter]);

  useEffect(() => {
    if (!activeConversationId) {
      threadFetchGenRef.current += 1;
      threadAtBottomRef.current = true;
      setThreadPendingNew(0);
      setActiveConversation(null);
      setMessages([]);
      setMessagesPage(1);
      setMessagesTotal(0);
      setThreadError(null);
      setThreadLoading(false);
      return;
    }

    setMessages([]);
    setMessagesPage(1);
    setMessagesTotal(0);
    setThreadError(null);
    threadAtBottomRef.current = true;
    setThreadPendingNew(0);

    const cached = conversationsRef.current.find(
      (c) => c.conversationId === activeConversationId
    );
    setActiveConversation(cached ?? null);

    void fetchThread(activeConversationId);
  }, [activeConversationId, fetchThread]);

  useEffect(() => {
    if (socketStatus !== "connected") {
      wasSocketConnectedRef.current = false;
      return;
    }
    if (wasSocketConnectedRef.current) return;
    wasSocketConnectedRef.current = true;

    void fetchInbox(true);
    if (activeConversationIdRef.current) {
      void pollThread(activeConversationIdRef.current);
    }
  }, [socketStatus, fetchInbox, pollThread]);

  useEffect(() => {
    if (socketStatus !== "connected") return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void fetchInbox(true);
    };

    const timer = setInterval(tick, CHAT_INBOX_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [socketStatus, fetchInbox]);

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

  const hasOlderMessages = messagesPage * CHAT_THREAD_PAGE_SIZE < messagesTotal;
  const hasMoreInbox = inboxPage * CHAT_PAGE_SIZE < inboxTotal;

  const threadConversation =
    activeConversation?.conversationId === activeConversationId
      ? activeConversation
      : activeConversationId
        ? (conversations.find((c) => c.conversationId === activeConversationId) ?? null)
        : null;

  const threadMessages = activeConversationId
    ? messages.filter((m) => m.conversationId === activeConversationId)
    : [];

  const handleThreadAtBottom = useCallback((atBottom: boolean) => {
    threadAtBottomRef.current = atBottom;
    if (atBottom) setThreadPendingNew(0);
    if (!atBottom || !activeConversationIdRef.current) return;
    const convId = activeConversationIdRef.current;
    const convMessages = messagesRef.current.filter((m) => m.conversationId === convId);
    const last = convMessages[convMessages.length - 1];
    void markReadRef.current(convId, last ?? null);
  }, []);

  return {
    conversations,
    inboxTotal,
    totalUnread,
    inboxLoading,
    loadingMoreInbox,
    hasMoreInbox,
    inboxError,
    activeConversation: threadConversation,
    messages: threadMessages,
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
    loadMoreInbox,
    refreshInbox: () => fetchInbox(true),
    refreshThread: () =>
      activeConversationId ? fetchThread(activeConversationId) : Promise.resolve(),
    threadPendingNew,
    handleThreadAtBottom,
  };
}
