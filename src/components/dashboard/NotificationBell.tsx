"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { MyPlateNotification } from "@/lib/bidding/process-types";
import {
  notificationHref,
  notificationKey,
  notificationKindLabel,
} from "@/lib/bidding/notifications";
import { NavIconBell } from "@/components/dashboard/DashboardNavIcons";

function formatWhen(at: string | null | undefined): string {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Header bell: badge = notification count, click opens the full list from GET /dashboard. */
export function NotificationBell() {
  const { canRead } = useBiddingAccess();
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MyPlateNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await biddingApi.getDashboard();
      setItems(data.notifications ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, []);

  // One fetch per page load; opening the panel refreshes it. No polling — the
  // dashboard call walks the bid list and competes for DB connections.
  useEffect(() => {
    if (canRead) void load();
  }, [canRead, load]);

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

  if (!canRead) return null;

  const count = items?.length ?? 0;

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
        aria-label={count > 0 ? `Notifications (${count})` : "Notifications"}
        title="Notifications"
      >
        <NavIconBell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-[4.25rem] z-40 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-96"
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-ink/[0.06] px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <span className="text-xs text-ink/40">
              {loading ? "Refreshing…" : `${count} item${count === 1 ? "" : "s"}`}
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
              <p className="px-2.5 py-3 text-sm text-ink/45">You&apos;re all caught up.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((n, i) => {
                  const href = notificationHref(n);
                  const when = formatWhen(n.at);
                  const body = (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                          {notificationKindLabel(n.kind)}
                        </p>
                        {when ? <p className="shrink-0 text-[11px] text-ink/35">{when}</p> : null}
                      </div>
                      <p className="truncate text-sm font-semibold text-ink">{n.title || "Update"}</p>
                      {n.body ? <p className="line-clamp-2 text-xs text-ink/50">{n.body}</p> : null}
                    </>
                  );
                  return (
                    <li key={notificationKey(n, i)}>
                      {href ? (
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl px-2.5 py-2 transition hover:bg-ink/[0.04]"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="rounded-xl px-2.5 py-2">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-ink/[0.06] p-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-center text-sm font-medium text-brand transition hover:bg-ink/[0.04]"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
