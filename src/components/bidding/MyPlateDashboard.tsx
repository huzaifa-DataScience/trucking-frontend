"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  formatProcessStage,
  type MyPlateColumn,
  type MyPlateGroup,
  type MyPlateNotification,
  type MyPlateResponse,
  type MyPlateRow,
} from "@/lib/bidding/process-types";

const DEFAULT_COLUMNS: MyPlateColumn[] = [
  { key: "estimateNumber", label: "Bid #" },
  { key: "bidName", label: "Project" },
  { key: "dueDate", label: "Due date" },
  { key: "dueTime", label: "Due time" },
  { key: "teamId", label: "Team" },
  { key: "processStage", label: "Stage" },
  { key: "isNew", label: "New" },
  { key: "canEdit", label: "Edit" },
];

function normalizeColumns(
  columns: MyPlateGroup["columns"] | undefined
): MyPlateColumn[] {
  if (!columns || columns.length === 0) return DEFAULT_COLUMNS;
  return columns.map((c) =>
    typeof c === "string"
      ? {
          key: c,
          label: c
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
        }
      : { key: c.key, label: c.label || c.key }
  );
}

function rowHref(row: MyPlateRow): string {
  const stage = String(row.processStage ?? "intake").trim() || "intake";
  return `/bidding/${row.id}?stage=${encodeURIComponent(stage)}`;
}

function chatHref(conversationId: string): string {
  return `/workforce/chat/${encodeURIComponent(conversationId)}`;
}

function notificationHref(n: MyPlateNotification): string | null {
  if (n.kind === "message" && n.conversationId) {
    return chatHref(String(n.conversationId));
  }
  if (n.bidId != null && String(n.bidId).trim()) {
    return `/bidding/${n.bidId}?stage=intake`;
  }
  return null;
}

function cellText(
  row: MyPlateRow,
  key: string,
  teamLabel: (id: number | null | undefined) => string
): string {
  if (key === "teamId" || key === "team") {
    return teamLabel(
      typeof row.teamId === "number" ? row.teamId : Number(row.teamId) || null
    );
  }
  if (key === "bidName" || key === "project" || key === "drawingName") {
    return String(row.bidName || row.drawingName || "—");
  }
  if (key === "processStage") {
    return formatProcessStage(String(row.processStage ?? "")) || "—";
  }
  if (key === "isNew") return row.isNew ? "New" : "";
  if (key === "thisWeek") return row.thisWeek ? "This week" : "";
  if (key === "canEdit") return row.canEdit === false ? "View" : "Edit";
  if (key === "takeoffAssigned") return row.takeoffAssigned ? "Sent" : "";
  if (key === "takeoffReceived") return row.takeoffReceived ? "Back" : "";
  const v = row[key];
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "";
  return String(v);
}

export function MyPlateDashboard() {
  const { canRead } = useBiddingAccess();
  const lookups = useBiddingLookups();
  const [plate, setPlate] = useState<MyPlateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamLabel = useCallback(
    (id: number | null | undefined) => {
      if (id == null || Number.isNaN(Number(id))) return "—";
      const hit = lookups.teams.find((t) => t.id === Number(id));
      return hit?.teamName || `Team #${id}`;
    },
    [lookups.teams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await biddingApi.getMyPlate();
      setPlate(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load your plate"));
      setPlate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => plate?.groups ?? [], [plate]);
  const counts = plate?.counts;
  const messages = plate?.messages;
  const notifications = plate?.notifications ?? [];

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Your role home — queues from GET /bids/my-plate."
        />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view bidding."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
      <PageHeader
        title={plate?.title || "Dashboard"}
        subtitle={
          plate?.hint ||
          "Role queues from your login role — Estimates list is separate."
        }
      />

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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

      {counts ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ["due", "Due"],
              ["upcoming", "Upcoming"],
              ["assigned", "Assigned"],
              ["unreadMessages", "Unread"],
              ["notifications", "Alerts"],
            ] as const
          ).map(([key, label]) => {
            const n = counts[key];
            if (n == null) return null;
            return (
              <div
                key={key}
                className="rounded-2xl border border-ink/[0.08] bg-surface px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {n}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Messages</h2>
            <Link
              href="/workforce/chat"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Open chat
              {messages?.totalUnread
                ? ` · ${messages.totalUnread} unread`
                : ""}
            </Link>
          </div>
          {(messages?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/45">No recent messages.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(messages?.items ?? []).slice(0, 6).map((m) => (
                <li key={m.conversationId}>
                  <Link
                    href={chatHref(m.conversationId)}
                    className="flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 transition hover:bg-ink/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {m.title || m.lastMessageSenderName || "Chat"}
                      </p>
                      <p className="truncate text-xs text-ink/50">
                        {m.lastMessagePreview || "—"}
                      </p>
                    </div>
                    {(m.unreadCount ?? 0) > 0 ? (
                      <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                        {m.unreadCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            <span className="text-xs text-ink/40">
              {notifications.length} item{notifications.length === 1 ? "" : "s"}
            </span>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-ink/45">No alerts right now.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {notifications.slice(0, 8).map((n, i) => {
                const href = notificationHref(n);
                const body = (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                      {n.kind}
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      {n.title || "Update"}
                    </p>
                    {n.body ? (
                      <p className="text-xs text-ink/50">{n.body}</p>
                    ) : null}
                  </>
                );
                return (
                  <li key={`${n.kind}-${n.bidId ?? n.conversationId ?? i}`}>
                    {href ? (
                      <Link
                        href={href}
                        className="block rounded-xl px-2.5 py-2 transition hover:bg-ink/[0.03]"
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
        </section>
      </div>

      {loading && !plate ? (
        <SkeletonCardGrid count={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          message={
            plate?.hint ||
            "No queues for your role yet. Ask admin to confirm your login role."
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const columns = normalizeColumns(group.columns);
            const rows = group.rows ?? [];
            return (
              <section key={group.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink">
                    {group.title}
                  </h2>
                  <span className="text-xs text-ink/45">
                    {rows.length} bid{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-4 py-6 text-center text-sm text-ink/45">
                    Empty queue.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-ink/[0.08] bg-surface">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="border-b border-ink/[0.06] bg-ink/[0.02] text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col.key}
                              className="whitespace-nowrap px-3 py-2.5"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const canEdit = row.canEdit !== false;
                          return (
                            <tr
                              key={String(row.id)}
                              className="border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.02]"
                            >
                              {columns.map((col, colIdx) => {
                                const text = cellText(row, col.key, teamLabel);
                                const isPrimary = colIdx === 0;
                                return (
                                  <td
                                    key={col.key}
                                    className="whitespace-nowrap px-3 py-2.5 text-ink/80"
                                  >
                                    {isPrimary ? (
                                      <Link
                                        href={rowHref(row)}
                                        className="font-semibold text-brand hover:underline"
                                      >
                                        {text === "—"
                                          ? `#${row.id}`
                                          : text}
                                      </Link>
                                    ) : col.key === "isNew" && row.isNew ? (
                                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                        New
                                      </span>
                                    ) : col.key === "canEdit" ? (
                                      canEdit ? (
                                        <Link
                                          href={rowHref(row)}
                                          className="text-xs font-semibold text-brand hover:underline"
                                        >
                                          Edit
                                        </Link>
                                      ) : (
                                        <Link
                                          href={rowHref(row)}
                                          className="text-xs font-medium text-ink/45 hover:underline"
                                        >
                                          View
                                        </Link>
                                      )
                                    ) : col.key === "takeoffAssigned" &&
                                      row.takeoffAssigned ? (
                                      <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">
                                        Sent
                                      </span>
                                    ) : col.key === "takeoffReceived" &&
                                      row.takeoffReceived ? (
                                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                        Back
                                      </span>
                                    ) : (
                                      text
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
