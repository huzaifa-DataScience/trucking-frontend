"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { isAdminPanelRole } from "@/lib/auth/roles";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ChatConversation } from "@/lib/workforce/chat-types";
import {
  chatConversationIdFromPath,
  chatHref,
  conversationDisplayLabel,
  formatChatRelativeTime,
  inboxPreview,
} from "@/lib/workforce/chat-utils";
import {
  CHAT_UNREAD_EVENT,
  dispatchChatUnreadTotal,
} from "@/lib/workforce/chat-unread";
import { NavIconChat } from "@/components/dashboard/DashboardNavIcons";
import { ChatUnreadBadge } from "@/components/workforce/chat/ChatUnreadBadge";
import { usePathname } from "next/navigation";

function canSeeMessages(user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user) return false;
  if (isAdminPanelRole(user.role)) return true;
  if (!user.permissions?.length) return true;
  return can(user, PERMISSIONS.connecteamRead);
}

/** Header messages icon — badge = unread total; clears as threads are marked read. */
export function MessagesBell() {
  const { user } = useAuth();
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatConversation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = canSeeMessages(user);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await connecteamApi.listConversations({ page: 1, pageSize: 8 });
      setItems(res.conversations ?? []);
      if (typeof res.totalUnread === "number") setUnreadTotal(res.totalUnread);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load messages"));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearConversationUnread = useCallback((conversationId: string, unread: number) => {
    if (unread <= 0) return;
    setItems((prev) =>
      prev
        ? prev.map((c) =>
            c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
          )
        : prev
    );
    setUnreadTotal((prev) => {
      const next = Math.max(0, prev - unread);
      dispatchChatUnreadTotal(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void load();
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ totalUnread?: number }>).detail;
      if (typeof detail?.totalUnread === "number") setUnreadTotal(detail.totalUnread);
    };
    window.addEventListener(CHAT_UNREAD_EVENT, onEvent);
    return () => window.removeEventListener(CHAT_UNREAD_EVENT, onEvent);
  }, [allowed, load]);

  // Opening a thread elsewhere (or via this panel) — refresh badge after mark-read settles.
  useEffect(() => {
    const id = chatConversationIdFromPath(pathname);
    if (!id || !allowed) return;
    const t = window.setTimeout(() => void load(), 800);
    return () => window.clearTimeout(t);
  }, [pathname, allowed, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!allowed) return null;

  return (
    <div className="relative flex items-center" ref={boxRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/55 transition hover:bg-ink/[0.05] hover:text-ink"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadTotal > 0 ? `Messages (${unreadTotal} unread)` : "Messages"
        }
        title="Messages"
      >
        <NavIconChat className="h-5 w-5" />
        {unreadTotal > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Messages"
          className="fixed inset-x-3 top-[4.25rem] z-40 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-96"
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-ink/[0.06] px-4 py-3">
            <p className="text-sm font-semibold text-ink">Messages</p>
            <span className="text-xs text-ink/40">
              {loading
                ? "Refreshing…"
                : unreadTotal > 0
                  ? `${unreadTotal} unread`
                  : "Up to date"}
            </span>
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-2">
            {error && !items?.length ? (
              <div className="px-2.5 py-3 text-sm text-ink/55">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-2 text-sm font-medium text-brand hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : items == null ? (
              <p className="px-2.5 py-3 text-sm text-ink/45">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-ink/45">No conversations yet.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((c) => {
                  const when = formatChatRelativeTime(
                    c.lastMessageAtIso ?? c.lastMessageAt
                  );
                  const unread = c.unreadCount ?? 0;
                  return (
                    <li key={c.conversationId}>
                      <Link
                        href={chatHref(c.conversationId)}
                        onClick={() => {
                          clearConversationUnread(c.conversationId, unread);
                          setOpen(false);
                        }}
                        className="flex items-start gap-2 rounded-xl px-2.5 py-2 transition hover:bg-ink/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-ink">
                              {conversationDisplayLabel(c)}
                            </p>
                            {when ? (
                              <p className="shrink-0 text-[11px] text-ink/35">{when}</p>
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">
                            {inboxPreview(c)}
                          </p>
                        </div>
                        {unread > 0 ? <ChatUnreadBadge count={unread} /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-ink/[0.06] p-2">
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-center text-sm font-medium text-brand transition hover:bg-ink/[0.04]"
            >
              Open messages
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
