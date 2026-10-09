"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { MyPlateNotification } from "@/lib/bidding/process-types";
import {
  formatNotificationWhen,
  notificationHref,
  notificationKey,
  notificationKindLabel,
  withoutChatNotifications,
} from "@/lib/bidding/notifications";
import { markNotificationsSeen } from "@/lib/bidding/notification-seen";

type KindFilter = "all" | string;

/** Full notifications inbox — GET /dashboard → notifications. */
export function NotificationsPage() {
  const { canRead } = useBiddingAccess();
  const [items, setItems] = useState<MyPlateNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<KindFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await biddingApi.getDashboard();
      const list = withoutChatNotifications(data.notifications ?? []);
      setItems(list);
      // Visiting this page = seen — clears the header bell badge.
      markNotificationsSeen(list);
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn’t load notifications"));
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) void load();
  }, [canRead, load]);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const n of items ?? []) {
      if (n.kind) set.add(n.kind);
    }
    return [...set].sort();
  }, [items]);

  const visible = useMemo(() => {
    const list = items ?? [];
    if (kind === "all") return list;
    return list.filter((n) => n.kind === kind);
  }, [items, kind]);

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader title="Notifications" subtitle="Updates across your bids." />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view notifications."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 ui-animate-in">
      <PageHeader
        title="Notifications"
        subtitle="Your assignments, due dates, notes, and mentions."
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={buttonClasses("outline", "sm")}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error ? (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-brand hover:underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {kinds.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by type">
          <button
            type="button"
            role="tab"
            aria-selected={kind === "all"}
            onClick={() => setKind("all")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              kind === "all"
                ? "bg-ink text-white"
                : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md hover:border-brand/30 hover:text-brand"
            }`}
          >
            All
            <span className={`ml-1.5 tabular-nums ${kind === "all" ? "text-white/70" : "text-ink/40"}`}>
              {items?.length ?? 0}
            </span>
          </button>
          {kinds.map((k) => {
            const selected = kind === k;
            const n = (items ?? []).filter((x) => x.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setKind(k)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-ink text-white"
                    : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md hover:border-brand/30 hover:text-brand"
                }`}
              >
                {notificationKindLabel(k)}
                <span
                  className={`ml-1.5 tabular-nums ${selected ? "text-white/70" : "text-ink/40"}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading && items == null ? (
        <div className="flex flex-col gap-0 border-y border-[var(--border-subtle)] bg-surface">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border-b border-[var(--border-subtle)] px-4 py-3 last:border-0">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          message={
            kind === "all"
              ? "You’re all caught up — no notifications right now."
              : `No ${notificationKindLabel(kind).toLowerCase()} notifications.`
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] bg-surface sm:rounded-[var(--radius)] sm:border">
          {visible.map((n, i) => {
            const href = notificationHref(n);
            const when = formatNotificationWhen(n.at);
            const body = (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                    {notificationKindLabel(n.kind)}
                  </p>
                  {when ? <p className="shrink-0 text-[12px] text-ink/40">{when}</p> : null}
                </div>
                <p className="text-[15px] font-semibold text-ink">{n.title || "Update"}</p>
                {n.body ? (
                  <p className="text-sm leading-relaxed text-ink/55">{n.body}</p>
                ) : null}
              </div>
            );
            return (
              <li key={notificationKey(n, i)}>
                {href ? (
                  <Link
                    href={href}
                    className="flex gap-3 px-4 py-3.5 transition hover:bg-canvas"
                  >
                    {body}
                    <span className="shrink-0 self-center text-xs font-semibold text-brand">
                      Open
                    </span>
                  </Link>
                ) : (
                  <div className="px-4 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
