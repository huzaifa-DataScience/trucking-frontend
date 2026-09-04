"use client";

import { useEffect, useRef } from "react";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChatConversation, ChatSocketStatus, ConversationFilter } from "@/lib/workforce/chat-types";
import {
  conversationDisplayLabel,
  formatChatRelativeTime,
  inboxPreview,
} from "@/lib/workforce/chat-utils";
import { ChatTypeIcon } from "./ChatTypeIcon";
import { ChatUnreadBadge } from "./ChatUnreadBadge";

const FILTERS: { id: ConversationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "team", label: "Teams" },
  { id: "channel", label: "Channels" },
  { id: "private", label: "DMs" },
];

export function ChatInboxPanel({
  conversations,
  total,
  loading,
  loadingMore,
  hasMore,
  error,
  activeId,
  filter,
  search,
  socketStatus,
  isFallbackPolling,
  onFilterChange,
  onSearchChange,
  onNewChannel,
  onSelectConversation,
  onLoadMore,
  showOnMobile,
}: {
  conversations: ChatConversation[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  activeId: string | null;
  filter: ConversationFilter;
  search: string;
  socketStatus: ChatSocketStatus;
  isFallbackPolling: boolean;
  onFilterChange: (f: ConversationFilter) => void;
  onSearchChange: (s: string) => void;
  onNewChannel: () => void;
  onSelectConversation: (conversationId: string) => void;
  onLoadMore: () => void;
  showOnMobile: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const el = listRef.current;
    if (!el || !hasMore || loadingMore) return;

    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist < 120) onLoadMoreRef.current();
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore]);

  const loadedLabel =
    conversations.length < total
      ? `${conversations.length} of ${total} loaded`
      : `${total} conversation${total === 1 ? "" : "s"}`;

  return (
    <aside
      className={`flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-ink/[0.06] bg-surface lg:w-[340px] lg:border-r ${
        showOnMobile ? "flex" : "hidden lg:flex"
      }`}
    >
      <div className="shrink-0 border-b border-ink/[0.06] px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-ink">Team chat</h1>
            <p className="flex items-center gap-1.5 text-xs text-ink/45">
              {loadedLabel}
              {socketStatus === "connected" ? (
                <span className="inline-flex items-center gap-1 text-brand">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  live
                </span>
              ) : socketStatus === "connecting" ? (
                <span className="inline-flex items-center gap-1 text-warning">connecting…</span>
              ) : isFallbackPolling ? (
                <span className="inline-flex items-center gap-1 text-ink/40">syncing…</span>
              ) : socketStatus === "disconnected" ? (
                <span className="text-ink/35">offline — retrying</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewChannel}
            className="rounded-xl border border-ink/10 bg-canvas p-2 text-ink/60 transition hover:border-brand/30 hover:text-brand"
            title="New channel"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations…"
          className="mt-3 w-full rounded-xl border border-ink/10 bg-canvas px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />

        <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onFilterChange(id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filter === id
                  ? "bg-ink text-white"
                  : "bg-canvas text-ink/55 hover:bg-ink/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filter !== "all" || search.trim() ? (
          <div className="mt-3 rounded-lg border border-warning-border bg-warning-tint px-3 py-2 text-xs text-warning">
            <span>
              {filter !== "all"
                ? `Inbox filtered to ${FILTERS.find((f) => f.id === filter)?.label ?? filter} only. `
                : ""}
              {search.trim() ? `Search active — other chats hidden. ` : ""}
              Some conversations or messages may not appear.
            </span>
            <button
              type="button"
              onClick={() => {
                onFilterChange("all");
                onSearchChange("");
              }}
              className="ml-1 font-semibold underline underline-offset-2"
            >
              Show all
            </button>
          </div>
        ) : null}
      </div>

      <div ref={listRef} className="ui-scroll-light min-h-0 flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <SkeletonListRows rows={7} />
        ) : error ? (
          <p className="px-4 py-8 text-sm text-danger">{error}</p>
        ) : conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              message={
                total === 0
                  ? "No conversations yet. Start a channel or wait for Connecteam chat mirroring to sync."
                  : "No conversations match your search."
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink/[0.05]">
            {conversations.map((c) => {
              const active = c.conversationId === activeId;
              const unread = c.unreadCount ?? 0;
              return (
                <li key={c.conversationId}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(c.conversationId)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-ink/[0.03] ${
                      active ? "bg-brand/[0.06]" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-brand/15 text-brand" : "bg-canvas text-ink/45"
                      }`}
                    >
                      <ChatTypeIcon type={c.type} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate text-sm font-semibold ${active ? "text-brand" : "text-ink"}`}>
                          {conversationDisplayLabel(c)}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {unread > 0 ? <ChatUnreadBadge count={unread} /> : null}
                          <span className="text-[10px] text-ink/35">
                            {formatChatRelativeTime(c.lastMessageAtIso ?? c.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink/45">{inboxPreview(c)}</p>
                      {c.recordSource === "native" ? (
                        <span className="mt-1 inline-block text-[10px] font-medium text-info">
                          Portal channel
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
            {hasMore ? (
              <li className="px-4 py-4">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-ink/10 bg-canvas px-4 py-2 text-xs font-semibold text-ink/55 transition hover:bg-ink/[0.04] disabled:opacity-50"
                >
                  {loadingMore ? "Loading more…" : "Load more conversations"}
                </button>
                <p className="mt-1.5 text-center text-[10px] text-ink/35">
                  Scroll down or tap to load older chats
                </p>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </aside>
  );
}
