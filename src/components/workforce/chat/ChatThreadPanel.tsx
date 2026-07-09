"use client";

import { useCallback, useEffect, useRef } from "react";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatTypeIcon } from "./ChatTypeIcon";
import type { ChatConversation, ChatMessage } from "@/lib/workforce/chat-types";
import { conversationDisplayLabel } from "@/lib/workforce/chat-utils";
import { ChatBubbleIcon } from "./ChatTypeIcon";

export function ChatThreadPanel({
  conversation,
  messages,
  loading,
  loadingOlder,
  hasOlderMessages,
  error,
  sending,
  canSend,
  sendDisabledReason,
  connecteamUserId,
  appUserId,
  onSend,
  onLoadOlder,
  onBack,
  showOnMobile,
}: {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasOlderMessages: boolean;
  error: string | null;
  sending: boolean;
  canSend: boolean;
  sendDisabledReason?: string;
  connecteamUserId?: number | null;
  appUserId?: number | null;
  onSend: (text: string) => Promise<void>;
  onLoadOlder: () => void;
  onBack: () => void;
  showOnMobile: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const wasAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      wasAtBottomRef.current = dist < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = messages.length;
    prevCountRef.current = next;
    if (loading || next === 0) return;
    if (prev === 0 || wasAtBottomRef.current) {
      scrollToBottom(prev === 0 ? "auto" : "smooth");
    }
  }, [messages.length, loading, scrollToBottom]);

  if (!conversation) {
    return (
      <section
        className={`h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-canvas/50 ${
          showOnMobile ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="max-w-sm px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand/60">
            <ChatBubbleIcon />
          </div>
          <h2 className="text-lg font-semibold text-ink">Select a conversation</h2>
          <p className="mt-2 text-sm text-ink/50">
            Pick a team, channel, or DM from the inbox. Messages update every few seconds while
            this screen is open.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`h-full min-h-0 flex-1 flex-col overflow-hidden bg-canvas/30 ${showOnMobile ? "flex" : "hidden lg:flex"}`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-ink/[0.06] bg-surface px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-ink/50 transition hover:bg-ink/[0.05] lg:hidden"
          aria-label="Back to inbox"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <ChatTypeIcon type={conversation.type} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-ink">
            {conversationDisplayLabel(conversation)}
          </h2>
          <p className="truncate text-xs capitalize text-ink/45">
            {conversation.typeLabel ?? conversation.type}
            {conversation.messageCount != null ? ` · ${conversation.messageCount} messages` : ""}
          </p>
        </div>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-danger-border bg-danger-tint px-4 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div ref={listRef} className="ui-scroll-light relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-16">
            <LogoLoader />
          </div>
        ) : (
          <>
            {loading && messages.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-4 top-2 z-10 flex justify-center">
                <span className="rounded-full bg-surface/90 px-3 py-1 text-[10px] font-medium text-ink/45 shadow-sm ring-1 ring-ink/10">
                  Updating…
                </span>
              </div>
            ) : null}
            {hasOlderMessages ? (
              <div className="mb-4 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                  className="rounded-full border border-ink/10 bg-surface px-4 py-1.5 text-xs font-semibold text-ink/55 transition hover:bg-ink/[0.04] disabled:opacity-50"
                >
                  {loadingOlder ? "Loading…" : "Load older messages"}
                </button>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">
                No messages yet. Say hello — only messages after chat mirroring was enabled will
                appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <ChatMessageBubble
                    key={m.messageId}
                    message={m}
                    conversationType={conversation.type}
                    connecteamUserId={connecteamUserId}
                    appUserId={appUserId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ChatComposer
        disabled={!canSend}
        disabledReason={sendDisabledReason}
        sending={sending}
        onSend={onSend}
        className="shrink-0"
      />
    </section>
  );
}
