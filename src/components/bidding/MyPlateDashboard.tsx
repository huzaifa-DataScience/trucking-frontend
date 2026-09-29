"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardJumpNav, type JumpNavItem } from "@/components/dashboard/DashboardJumpNav";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCardGrid } from "@/components/ui/Skeleton";
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
  type MyPlateResponse,
  type MyPlateRow,
} from "@/lib/bidding/process-types";
import { chatHref } from "@/lib/bidding/notifications";

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

const STAGE_COLORS: Record<string, string> = {
  intake: "#ff7b11",
  assignment: "#c2410c",
  estimating_setup: "#a16207",
  drawings: "#65a30d",
  spec_sheets: "#0f766e",
  takeoff: "#2563eb",
  proposal: "#1e3a8a",
  post_bid: "#6b4ea8",
  result: "#1f6f5c",
};
const STAGE_ORDER = Object.keys(STAGE_COLORS);

type DueFilter = "all" | "mine" | "unassigned";

function localYmd(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from a YYYY-MM-DD date to today (positive = in the past). */
function daysLate(dueYmd: string, today: string): number {
  const a = Date.parse(`${dueYmd.slice(0, 10)}T00:00:00`);
  const b = Date.parse(`${today}T00:00:00`);
  return Math.round((b - a) / 86_400_000);
}

function formatDue(date: string | null | undefined, time: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return time ? `${day}, ${time.slice(0, 5)}` : day;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ProjectCell({ row }: { row: MyPlateRow }) {
  return (
    <Link href={rowHref(row)} className="block truncate text-ink hover:text-brand">
      {row.estimateNumber ? (
        <>
          <span className="font-mono text-xs text-ink/45">{row.estimateNumber}</span>
          <span className="text-ink/30"> · </span>
        </>
      ) : null}
      <span className="font-medium">{String(row.bidName || row.drawingName || `Bid #${row.id}`)}</span>
    </Link>
  );
}

const cardClass = "overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface";
const cardHeadClass = "flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5";
const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink/45 first:pl-5 last:pr-5";
const tdClass = "px-3 py-2.5 first:pl-5 last:pr-5";

export function MyPlateDashboard() {
  const { canRead, canWrite } = useBiddingAccess();
  const { user } = useAuth();
  const lookups = useBiddingLookups();
  const [plate, setPlate] = useState<MyPlateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [showAllQueue, setShowAllQueue] = useState(false);

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
      const data = await biddingApi.getDashboard();
      setPlate(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load your dashboard"));
      setPlate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = localYmd();
  const groups = useMemo(() => plate?.groups ?? [], [plate]);
  const dueGroup = groups.find((g) => g.id === "due");
  const upcomingGroup = groups.find((g) => g.id === "upcoming");
  const queueGroup = groups.find((g) => g.id !== "due" && g.id !== "upcoming");
  const messages = plate?.messages;

  const dueRows = useMemo(() => {
    const rows = [...(dueGroup?.rows ?? [])].sort((a, b) =>
      String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? ""))
    );
    if (dueFilter === "mine") return rows.filter((r) => user?.teamId != null && Number(r.teamId) === user.teamId);
    if (dueFilter === "unassigned") return rows.filter((r) => r.teamId == null);
    return rows;
  }, [dueGroup, dueFilter, user?.teamId]);

  const dueAll = dueGroup?.rows ?? [];
  const overdue = dueAll.filter((r) => r.dueDate && daysLate(String(r.dueDate), today) > 0);
  const oldestLate = overdue.reduce((m, r) => Math.max(m, daysLate(String(r.dueDate), today)), 0);
  const dueCaption =
    dueAll.length === 0
      ? "nothing due"
      : overdue.length === dueAll.length
        ? `all overdue · oldest ${oldestLate}d`
        : overdue.length > 0
          ? `${overdue.length} overdue · ${dueAll.length - overdue.length} today`
          : "due today";

  const upcomingRows = useMemo(
    () =>
      [...(upcomingGroup?.rows ?? [])].sort((a, b) =>
        String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? ""))
      ),
    [upcomingGroup]
  );

  const queueRows = useMemo(() => queueGroup?.rows ?? [], [queueGroup]);
  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of queueRows) {
      const s = String(r.processStage || "intake");
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    const rank = (s: string) => {
      const i = STAGE_ORDER.indexOf(s);
      return i < 0 ? STAGE_ORDER.length : i;
    };
    return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [queueRows]);

  const unreadChats = (messages?.items ?? []).filter((m) => (m.unreadCount ?? 0) > 0).length;

  const navItems = useMemo<JumpNavItem[]>(() => {
    const items: JumpNavItem[] = [];
    if (dueGroup)
      items.push({
        id: "dash-due",
        label: "Due now",
        count: dueAll.length,
        caption: dueCaption,
        tone: dueAll.length ? "danger" : "neutral",
        group: "Needs attention",
      });
    if (upcomingGroup)
      items.push({
        id: "dash-upcoming",
        label: "Upcoming",
        count: upcomingRows.length,
        caption: upcomingRows[0]?.dueDate ? `next ${formatDue(String(upcomingRows[0].dueDate), null)}` : "none this week",
        tone: upcomingRows.length ? "warning" : "neutral",
        group: "Needs attention",
      });
    items.push({ id: "dash-pipeline", label: "Pipeline", caption: `${queueRows.length} active`, group: "Overview" });
    items.push({
      id: "dash-messages",
      label: "Messages",
      caption: unreadChats ? `${unreadChats} unread chat${unreadChats === 1 ? "" : "s"}` : "all caught up",
      group: "Overview",
    });
    if (queueGroup)
      items.push({ id: "dash-queue", label: queueGroup.title, count: queueRows.length, group: "Overview" });
    return items;
  }, [dueGroup, upcomingGroup, queueGroup, dueAll.length, dueCaption, upcomingRows, queueRows.length, unreadChats]);

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader title="Dashboard" subtitle="Your role home — queues from GET /bids/my-plate." />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view bidding."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  const title = plate?.title || "Dashboard";
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const shortcuts = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Shortcuts</p>
      {canWrite ? (
        <Link
          href="/bidding/new"
          className="rounded-xl bg-brand px-3.5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-secondary"
        >
          New bid
        </Link>
      ) : null}
      <Link
        href="/bidding"
        className="rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-center text-sm font-medium text-ink transition hover:border-ink/20"
      >
        Estimates list
      </Link>
    </>
  );

  const loadingRows = (
    <div className="flex flex-col gap-2 p-5">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );

  return (
    <div className="grid min-h-0 flex-1 gap-7 ui-animate-in lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <DashboardJumpNav items={navItems} variant="rail" title={title} subtitle={dateLine} footer={shortcuts} />

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-4 lg:hidden">
          <PageHeader title={title} subtitle={dateLine} />
          <DashboardJumpNav items={navItems} variant="chips" />
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>{error}</p>
            <button type="button" className="mt-2 text-sm font-semibold text-brand hover:underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        {loading && !plate ? (
          <SkeletonCardGrid count={3} />
        ) : !plate || groups.length === 0 ? (
          <EmptyState message={plate?.hint || "No queues for your role yet. Ask admin to confirm your login role."} />
        ) : (
          <>
            {dueGroup ? (
              <section id="dash-due" className={`${cardClass} scroll-mt-24`}>
                <div className={`${cardHeadClass} ${dueAll.length ? "bg-red-50/40" : ""}`}>
                  <h2 className="text-base font-semibold text-ink">
                    Due now{" "}
                    {dueAll.length ? (
                      <span className="text-red-700">
                        · {overdue.length === dueAll.length ? `${dueAll.length} overdue` : dueAll.length}
                      </span>
                    ) : null}
                  </h2>
                  <div className="flex gap-1.5 text-xs" role="group" aria-label="Filter due bids">
                    {(
                      [
                        ["all", "All"],
                        ["mine", "My team"],
                        ["unassigned", "Unassigned"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDueFilter(key)}
                        aria-pressed={dueFilter === key}
                        className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                          dueFilter === key
                            ? "bg-ink text-white"
                            : "border border-ink/10 bg-surface text-ink/65 hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {dueRows.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink/45">
                    {dueAll.length === 0 ? "Nothing due right now." : "No due bids match this filter."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className={thClass}>Project</th>
                          <th className={thClass}>Due</th>
                          <th className={thClass}>Stage</th>
                          <th className={thClass}>Team</th>
                          <th className={`${thClass} text-right`}>Late by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dueRows.map((row) => {
                          const late = row.dueDate ? daysLate(String(row.dueDate), today) : 0;
                          return (
                            <tr key={String(row.id)} className="border-t border-ink/[0.05] hover:bg-ink/[0.015]">
                              <td className={`${tdClass} max-w-0 w-[45%]`}>
                                <ProjectCell row={row} />
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {formatDue(row.dueDate, row.dueTime)}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {formatProcessStage(String(row.processStage ?? "")) || "—"}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {row.teamId == null ? <span className="text-ink/40">Unassigned</span> : teamLabel(Number(row.teamId))}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-right font-bold tabular-nums`}>
                                {late > 0 ? <span className="text-red-700">{late}d</span> : <span className="text-orange-800">Today</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            {upcomingGroup ? (
              <section id="dash-upcoming" className={`${cardClass} scroll-mt-24`}>
                <div className={cardHeadClass}>
                  <h2 className="text-base font-semibold text-ink">
                    {upcomingGroup.title} <span className="text-ink/40">· {upcomingRows.length}</span>
                  </h2>
                </div>
                {upcomingRows.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink/45">Nothing coming up this week.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <tbody>
                        {upcomingRows.map((row) => {
                          const inDays = row.dueDate ? -daysLate(String(row.dueDate), today) : null;
                          return (
                            <tr key={String(row.id)} className="border-t border-ink/[0.05] first:border-t-0 hover:bg-ink/[0.015]">
                              <td className={`${tdClass} max-w-0 w-[45%]`}>
                                <ProjectCell row={row} />
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {formatDue(row.dueDate, row.dueTime)}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {formatProcessStage(String(row.processStage ?? "")) || "—"}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-ink/75`}>
                                {row.teamId == null ? <span className="text-ink/40">No team yet</span> : teamLabel(Number(row.teamId))}
                              </td>
                              <td className={`${tdClass} whitespace-nowrap text-right text-xs text-ink/55`}>
                                {inDays == null ? "" : inDays === 1 ? "tomorrow" : `in ${inDays} days`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
              <section id="dash-pipeline" className={`${cardClass} scroll-mt-24 flex flex-col gap-3.5 p-5`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">Pipeline</h2>
                  <Link href="/bidding" className="text-sm font-semibold text-orange-700 hover:underline">
                    All {queueRows.length.toLocaleString()} bids
                  </Link>
                </div>
                {queueRows.length === 0 ? (
                  <p className="text-sm text-ink/45">No active bids.</p>
                ) : (
                  <>
                    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-ink/[0.05]" aria-hidden>
                      {stageCounts.map(([stage, n]) => (
                        <div
                          key={stage}
                          style={{ width: `${(n / queueRows.length) * 100}%`, background: STAGE_COLORS[stage] ?? "#8b9098" }}
                        />
                      ))}
                    </div>
                    <ul className="flex flex-col gap-2 text-sm">
                      {stageCounts.map(([stage, n]) => (
                        <li key={stage} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-ink/80">
                            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: STAGE_COLORS[stage] ?? "#8b9098" }} />
                            {formatProcessStage(stage) || stage}
                          </span>
                          <span className="font-semibold tabular-nums text-ink">{n.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section id="dash-messages" className={`${cardClass} scroll-mt-24`}>
                <div className={cardHeadClass}>
                  <h2 className="text-base font-semibold text-ink">Messages</h2>
                  <Link href="/workforce/chat" className="text-sm font-semibold text-orange-700 hover:underline">
                    Open chat
                    {messages?.totalUnread ? ` · ${messages.totalUnread.toLocaleString()} unread` : ""}
                  </Link>
                </div>
                {(messages?.items?.length ?? 0) === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink/45">No recent messages.</p>
                ) : (
                  <ul className="flex flex-col">
                    {(messages?.items ?? []).slice(0, 4).map((m) => {
                      const unread = (m.unreadCount ?? 0) > 0;
                      return (
                        <li key={m.conversationId} className="border-t border-ink/[0.05] first:border-t-0">
                          <Link href={chatHref(m.conversationId)} className="flex gap-3 px-5 py-2.5 transition hover:bg-ink/[0.02]">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-brand" : "bg-ink/15"}`}
                              aria-label={unread ? "Unread" : undefined}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className={`truncate text-sm ${unread ? "font-semibold text-ink" : "font-medium text-ink/75"}`}>
                                  {m.title || m.lastMessageSenderName || "Chat"}
                                </span>
                                <span className="shrink-0 text-xs text-ink/40">{relativeTime(m.lastMessageAt)}</span>
                              </span>
                              <span className="truncate text-xs text-ink/50">{m.lastMessagePreview || "—"}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {queueGroup ? (
              <QueueSection
                group={queueGroup}
                rows={queueRows}
                showAll={showAllQueue}
                onToggle={() => setShowAllQueue((v) => !v)}
                teamLabel={teamLabel}
                loading={loading && !plate}
                loadingRows={loadingRows}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

const QUEUE_PREVIEW = 10;

type SortDir = "asc" | "desc";

/** Columns that make no sense to sort (links/actions). */
const UNSORTABLE = new Set(["canEdit"]);

/** A comparable value for a row/column, or null when blank (blanks always sort last). */
function sortValue(
  row: MyPlateRow,
  key: string,
  teamLabel: (id: number | null | undefined) => string
): string | number | null {
  if (key === "teamId" || key === "team") return row.teamId == null ? null : teamLabel(Number(row.teamId)).toLowerCase();
  if (key === "processStage") {
    const i = STAGE_ORDER.indexOf(String(row.processStage || "intake"));
    return i < 0 ? STAGE_ORDER.length : i;
  }
  if (key === "bidName" || key === "project" || key === "drawingName") {
    const v = row.bidName || row.drawingName;
    return v ? String(v).toLowerCase() : null;
  }
  const v = row[key];
  if (v == null || v === "") return null;
  // Yes/no columns (isNew, takeoffAssigned…): "yes" first when ascending.
  if (typeof v === "boolean") return v ? 0 : 1;
  if (typeof v === "number") return v;
  return String(v).toLowerCase();
}

function compareRows(
  a: MyPlateRow,
  b: MyPlateRow,
  key: string,
  dir: SortDir,
  teamLabel: (id: number | null | undefined) => string
): number {
  const va = sortValue(a, key, teamLabel);
  const vb = sortValue(b, key, teamLabel);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  const cmp =
    typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

/** The role's full queue (All bids for admins, the team's bids for captains) with its server-chosen columns. */
function QueueSection({
  group,
  rows,
  showAll,
  onToggle,
  teamLabel,
  loading,
  loadingRows,
}: {
  group: MyPlateGroup;
  rows: MyPlateRow[];
  showAll: boolean;
  onToggle: () => void;
  teamLabel: (id: number | null | undefined) => string;
  loading: boolean;
  loadingRows: ReactNode;
}) {
  const columns = normalizeColumns(group.columns);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [team, setTeam] = useState("");
  const [newOnly, setNewOnly] = useState(false);

  // Options come from the rows themselves, so nothing is offered that would match zero bids.
  const stageOptions = useMemo(() => {
    const seen = new Set(rows.map((r) => String(r.processStage || "intake")));
    return STAGE_ORDER.filter((st) => seen.has(st)).concat([...seen].filter((st) => !STAGE_ORDER.includes(st)));
  }, [rows]);
  const teamOptions = useMemo(() => {
    const ids = [...new Set(rows.map((r) => (r.teamId == null ? null : Number(r.teamId))))];
    const named = ids
      .filter((id): id is number => id != null)
      .map((id) => ({ value: String(id), label: teamLabel(id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return ids.includes(null) ? [...named, { value: "none", label: "Unassigned" }] : named;
  }, [rows, teamLabel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (stage && String(r.processStage || "intake") !== stage) return false;
      if (team === "none" && r.teamId != null) return false;
      if (team && team !== "none" && String(r.teamId ?? "") !== team) return false;
      if (newOnly && !r.isNew) return false;
      if (q) {
        const hay = `${r.estimateNumber ?? ""} ${r.bidName ?? ""} ${r.drawingName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, stage, team, newOnly]);

  const filtering = Boolean(search.trim() || stage || team || newOnly);
  const clearFilters = () => {
    setSearch("");
    setStage("");
    setTeam("");
    setNewOnly(false);
  };
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  /** asc → desc → back to the server's order. */
  const cycleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  };
  const sorted = useMemo(
    () => (sortKey ? [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir, teamLabel)) : filtered),
    [filtered, sortKey, sortDir, teamLabel]
  );

  const shown = showAll ? sorted : sorted.slice(0, QUEUE_PREVIEW);
  const selectClass =
    "h-9 rounded-lg border border-ink/10 bg-surface px-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <section id="dash-queue" className={`${cardClass} scroll-mt-24`}>
      <div className={cardHeadClass}>
        <h2 className="text-base font-semibold text-ink">
          {group.title}{" "}
          <span className="text-ink/40">
            · {filtering ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}` : rows.length.toLocaleString()}
          </span>
        </h2>
        <Link href="/bidding" className="text-sm font-semibold text-orange-700 hover:underline">
          Open estimates list
        </Link>
      </div>
      {!loading && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-ink/[0.06] px-5 py-3">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search bids</span>
            <input
              id="dash-queue-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search estimate # or project"
              className="h-9 w-full rounded-lg border border-ink/10 bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label>
            <span className="sr-only">Stage</span>
            <select id="dash-queue-stage" value={stage} onChange={(e) => setStage(e.target.value)} className={selectClass}>
              <option value="">All stages</option>
              {stageOptions.map((st) => (
                <option key={st} value={st}>
                  {formatProcessStage(st) || st}
                </option>
              ))}
            </select>
          </label>
          {teamOptions.length > 1 ? (
            <label>
              <span className="sr-only">Team</span>
              <select id="dash-queue-team" value={team} onChange={(e) => setTeam(e.target.value)} className={selectClass}>
                <option value="">All teams</option>
                {teamOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3 text-sm text-ink/75">
            <input
              id="dash-queue-new"
              type="checkbox"
              checked={newOnly}
              onChange={(e) => setNewOnly(e.target.checked)}
              className="accent-brand"
            />
            New only
          </label>
          {filtering ? (
            <button type="button" onClick={clearFilters} className="h-9 px-2 text-sm font-semibold text-orange-700 hover:underline">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        loadingRows
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink/45">Empty queue.</p>
      ) : filtered.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink/45">
          No bids match these filters.{" "}
          <button type="button" onClick={clearFilters} className="font-semibold text-orange-700 hover:underline">
            Clear filters
          </button>
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${thClass} whitespace-nowrap`}
                      aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {UNSORTABLE.has(col.key) ? (
                        col.label
                      ) : (
                        <button
                          type="button"
                          onClick={() => cycleSort(col.key)}
                          title={`Sort by ${col.label}`}
                          className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-ink ${
                            sortKey === col.key ? "text-ink" : ""
                          }`}
                        >
                          {col.label}
                          <svg
                            className={`h-3 w-3 transition ${sortKey === col.key ? "" : "opacity-25"} ${
                              sortKey === col.key && sortDir === "desc" ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            aria-hidden
                          >
                            <path d="M12 19V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const canEdit = row.canEdit !== false;
                  return (
                    <tr key={String(row.id)} className="border-t border-ink/[0.05] hover:bg-ink/[0.015]">
                      {columns.map((col, colIdx) => {
                        const text = cellText(row, col.key, teamLabel);
                        return (
                          <td key={col.key} className={`${tdClass} whitespace-nowrap text-ink/80`}>
                            {colIdx === 0 ? (
                              <Link href={rowHref(row)} className="font-semibold text-orange-700 hover:underline">
                                {text === "—" ? `#${row.id}` : text}
                              </Link>
                            ) : col.key === "isNew" && row.isNew ? (
                              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">New</span>
                            ) : col.key === "canEdit" ? (
                              <Link
                                href={rowHref(row)}
                                className={canEdit ? "text-xs font-semibold text-orange-700 hover:underline" : "text-xs font-medium text-ink/45 hover:underline"}
                              >
                                {canEdit ? "Edit" : "View"}
                              </Link>
                            ) : col.key === "takeoffAssigned" && row.takeoffAssigned ? (
                              <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">Sent</span>
                            ) : col.key === "takeoffReceived" && row.takeoffReceived ? (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">Back</span>
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
          {filtered.length > QUEUE_PREVIEW ? (
            <button
              type="button"
              onClick={onToggle}
              className="block w-full border-t border-ink/[0.06] px-5 py-3 text-left text-sm font-semibold text-orange-700 transition hover:bg-ink/[0.02]"
            >
              {showAll ? "Show fewer" : `Show all ${filtered.length.toLocaleString()}`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
