"use client";

import { useEffect, useState } from "react";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { useConnecteamChatSocket } from "@/hooks/useConnecteamChatSocket";
import { CHAT_UNREAD_EVENT, dispatchChatUnreadTotal } from "@/lib/workforce/chat-unread";

const LEGACY_STORAGE_KEY = "workforce-chat-unread-v1";

/** Sidebar badge — server `totalUnread` + live `chat.unread_updated` socket. */
export function useChatUnreadTotal(): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    connecteamApi
      .listConversations({ page: 1, pageSize: 1 })
      .then((res) => {
        if (cancelled || typeof res.totalUnread !== "number") return;
        setTotal(res.totalUnread);
      })
      .catch(() => {
        /* sidebar badge is non-critical */
      });

    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ totalUnread?: number }>).detail;
      if (typeof detail?.totalUnread === "number") setTotal(detail.totalUnread);
    };

    window.addEventListener(CHAT_UNREAD_EVENT, onEvent);
    return () => {
      cancelled = true;
      window.removeEventListener(CHAT_UNREAD_EVENT, onEvent);
    };
  }, []);

  useConnecteamChatSocket(
    {
      onMessage: () => {},
      onMessageDeleted: () => {},
      onConversationUpdated: () => {},
      onUnreadUpdated: (payload) => {
        setTotal(payload.totalUnread);
        dispatchChatUnreadTotal(payload.totalUnread);
      },
    },
    true
  );

  return total;
}
