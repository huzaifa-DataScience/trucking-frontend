"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth/store";
import { getBaseUrl } from "@/lib/api/config";
import type {
  ChatConversationUpdatedSocketPayload,
  ChatMessageDeletedSocketPayload,
  ChatMessageSocketPayload,
  ChatSocketStatus,
} from "@/lib/workforce/chat-types";

export interface ConnecteamChatSocketHandlers {
  onMessage: (payload: ChatMessageSocketPayload) => void;
  onMessageDeleted: (payload: ChatMessageDeletedSocketPayload) => void;
  onConversationUpdated: (payload: ChatConversationUpdatedSocketPayload) => void;
}

/**
 * Socket.IO live chat — docs/FRONTEND_CONNECTEAM_CHAT.md §2.1
 * Namespace: `/connecteam-chat` on the API host (same origin as REST).
 */
export function useConnecteamChatSocket(
  handlers: ConnecteamChatSocketHandlers,
  enabled = true
): ChatSocketStatus {
  const [status, setStatus] = useState<ChatSocketStatus>("disconnected");
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    const origin = getBaseUrl().replace(/\/$/, "");
    const socket: Socket = io(`${origin}/connecteam-chat`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("chat.message", (payload: ChatMessageSocketPayload) => {
      handlersRef.current.onMessage(payload);
    });
    socket.on("chat.message_deleted", (payload: ChatMessageDeletedSocketPayload) => {
      handlersRef.current.onMessageDeleted(payload);
    });
    socket.on("chat.conversation_updated", (payload: ChatConversationUpdatedSocketPayload) => {
      handlersRef.current.onConversationUpdated(payload);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.removeAllListeners();
      socket.disconnect();
      setStatus("disconnected");
    };
  }, [enabled]);

  return status;
}
