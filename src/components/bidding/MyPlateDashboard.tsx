"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PageHeader } from "@/components/dashboard/PageHeader";
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
import { formatDate } from "@/lib/bidding/format";
import { useTableSort } from "@/hooks/useTableSort";

/** Columns we never show as table cells — surfaced as tags instead. */
const META_COLUMN_KEYS = new Set(["isNew", "thisWeek", "canEdit", "takeoffAssigned", "takeoffReceived"]);
/** Shown by the fixed Project / Due / Stage / Team columns. */
const BUILT_IN_KEYS = new Set([
  "estimateNumber",
  "bidName",
  "project",
  "drawingName",
  "name",
  "dueDate",
  "bidDate",
  "processStage",
  "teamId",
  "team",
]);

function extraColumns(columns: MyPlateGroup["columns"] | undefined): MyPlateColumn[] {
  if (!columns) return [];
  return columns
    .map((c) =>
      typeof c === "string"
        ? { key: c, label: c.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim() }
        : { key: c.key, label: c.label || c.key }
    )
    .filter((c) => !META_COLUMN_KEYS.has(c.key) && !BUILT_IN_KEYS.has(c.key));
}

function rowHref(row: MyPlateRow): string {
  const stage = String(row.processStage ?? "intake").trim() || "intake";
  return `/bidding/${row.id}?stage=${encodeURIComponent(stage)}`;
}

function primaryLabel(row: MyPlateRow): string {
  return String(row.bidName || row.drawingName || row.estimateNumber || "").trim() || `Bid #${row.id}`;
}

/** Same date the backend buckets on: client bid date first, then due date. */
function calendarDate(row: MyPlateRow): string | null {
  const raw = String(row.bidDate || row.dueDate || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const [a, b] = [fromYmd, toYmd].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

type DueTone = "bad" | "warn" | "plain";

/** "Overdue 2d" / "Due today" / "Due tomorrow" / "In 3 days" with an urgency tone. */
function dueInfo(row: MyPlateRow, today: string): { label: string; tone: DueTone; date: string } | null {
  const d = calendarDate(row);
  if (!d) return null;
  const n = daysBetween(today, d);
  const date = formatDate(d);
  if (n < 0) return { label: `Overdue ${-n}d`, tone: "bad", date };
  if (n === 0) return { label: "Due today", tone: "bad", date };
  if (n === 1) return { label: "Due tomorrow", tone: "warn", date };
  if (n <= 3) return { label: `In ${n} days`, tone: "warn", date };
  return { label: `In ${n} days`, tone: "plain", date };
}

const STAGE_PILL: Record<string, string> = {
  intake: "bg-[#f1f2f4] text-[#4b5563]",
  estimating_setup: "bg-[#f3e8ff] text-[#7c3aed]",
  takeoff: "bg-brand-tint text-brand-secondary",
  proposal: "bg-[#effaf3] text-success",
};

function StagePill({ stage }: { stage: string }) {
  const label = formatProcessStage(stage);
  if (!label) return <span className="text-ink-soft">—</span>;
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-[9px] text-[12px] font-medium ${
        STAGE_PILL[stage] ?? "bg-[#f1f2f4] text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function RowTags({ row }: { row: MyPlateRow }) {
  const tags: [string, string][] = [];
  if (row.isNew) tags.push(["New", "bg-brand-tint text-brand-secondary"]);
  if (row.takeoffReceived) tags.push(["Takeoff back", "bg-[#effaf3] text-success"]);
  else if (row.takeoffAssigned) tags.push(["Takeoff sent", "bg-[#f1f2f4] text-ink-muted"]);
  return (
    <>
      {tags.map(([label, cls]) => (
        <span key={label} className={`ml-1.5 inline-flex rounded-[5px] px-1.5 py-px align-[1px] text-[11px] font-semibold ${cls}`}>
          {label}
        </span>
      ))}
    </>
  );
}

type Tab = { id: string; title: string; rows: MyPlateRow[]; tone?: "bad" };

function QueueTable({
  tab,
  teamLabel,
  extras,
  today,
}: {
  tab: Tab;
  teamLabel: (id: number | null | undefined) => string;
  extras: MyPlateColumn[];
  today: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q
    ? tab.rows.filter((r) =>
        [primaryLabel(r), r.estimateNumber, r.drawingName].some((v) => String(v ?? "").toLowerCase().includes(q))
      )
    : tab.rows;

  const teamOf = (r: MyPlateRow) => teamLabel(typeof r.teamId === "number" ? r.teamId : Number(r.teamId) || null);
  const sort = useTableSort<MyPlateRow, string>(
    rows,
    {
      project: (r: MyPlateRow) => primaryLabel(r).toLowerCase(),
      due: (r: MyPlateRow) => calendarDate(r),
      stage: (r: MyPlateRow) => formatProcessStage(String(r.processStage ?? "")) || null,
      team: (r: MyPlateRow) => (teamOf(r) === "—" ? null : teamOf(r)),
      ...Object.fromEntries(
        extras.map((c) => [c.key, (r: MyPlateRow) => (r[c.key] == null || r[c.key] === "" ? null : String(r[c.key]))])
      ),
    } as Record<string, (r: MyPlateRow) => string | number | null>,
    { key: "due", dir: "asc" }
  );

  const th = "whitespace-nowrap border-y border-[var(--border-subtle)] bg-[#fafbfc] px-4 py-[9px] text-left text-[11.5px] font-semibold text-ink-muted";

  return (
    <>
      <div className="flex items-center gap-2.5 px-[18px] py-3">
        <div className="relative w-full max-w-[280px]">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Search project # or name"
            placeholder="Search project # or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-8 pr-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand"
          />
        </div>
      </div>

      {tab.rows.length === 0 ? (
        <p className="border-t border-[var(--border-subtle)] px-[18px] py-10 text-center text-[13px] text-ink-muted">
          Nothing in {tab.title.toLowerCase()} right now.
        </p>
      ) : rows.length === 0 ? (
        <p className="border-t border-[var(--border-subtle)] px-[18px] py-10 text-center text-[13px] text-ink-muted">
          No bids match “{query}”.
        </p>
      ) : (
        <div className="table-scroll overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-[13.5px]">
            <thead>
              <tr>
                <th className={th}>{sort.header("project", "Project")}</th>
                <th className={th}>{sort.header("due", "Due")}</th>
                <th className={th}>{sort.header("stage", "Stage")}</th>
                <th className={th}>{sort.header("team", "Team")}</th>
                {extras.map((c) => (
                  <th key={c.key} className={th}>
                    {sort.header(c.key, c.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((row) => {
                const href = rowHref(row);
                const due = dueInfo(row, today);
                const cell = "h-[52px] whitespace-nowrap border-b border-[#f0f1f3] px-4 align-middle group-hover:bg-[#fafbfd]";
                return (
                  <tr
                    key={String(row.id)}
                    className="group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a")) return;
                      router.push(href);
                    }}
                  >
                    <td className={cell}>
                      <Link href={href} className="font-semibold text-ink hover:text-brand">
                        {primaryLabel(row)}
                      </Link>
                      <RowTags row={row} />
                      {row.estimateNumber ? <div className="text-[12px] text-ink-muted">#{row.estimateNumber}</div> : null}
                    </td>
                    <td className={cell}>
                      {due ? (
                        <>
                          <span
                            className={`inline-flex items-center gap-1.5 ${
                              due.tone === "bad" ? "font-medium text-danger" : due.tone === "warn" ? "font-medium text-warning" : "text-ink-muted"
                            }`}
                          >
                            {due.tone !== "plain" ? (
                              <span className={`h-2 w-2 rounded-full ${due.tone === "bad" ? "bg-danger" : "bg-[#e3a008]"}`} aria-hidden />
                            ) : null}
                            {due.label}
                          </span>
                          <div className="text-[12px] text-ink-muted">{due.date}</div>
                        </>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className={cell}>
                      <StagePill stage={String(row.processStage ?? "")} />
                    </td>
                    <td className={`${cell} text-ink-muted`}>{teamOf(row)}</td>
                    {extras.map((c) => (
                      <td key={c.key} className={`${cell} text-ink-muted`}>
                        <span className="block max-w-[12rem] truncate">
                          {row[c.key] == null || row[c.key] === "" ? "—" : typeof row[c.key] === "boolean" ? (row[c.key] ? "Yes" : "") : String(row[c.key])}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between border-t border-[var(--border-subtle)] px-[18px] py-2.5 text-[12.5px] text-ink-muted">
        <span>
          {rows.length} {rows.length === 1 ? "bid" : "bids"}
        </span>
        <span>Click a row to open the bid</span>
      </div>
    </>
  );
}

export function MyPlateDashboard() {
  const { canRead } = useBiddingAccess();
  const lookups = useBiddingLookups();
  const [plate, setPlate] = useState<MyPlateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const today = todayYmd();

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
      setPlate(await biddingApi.getDashboard());
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn’t load your dashboard"));
      setPlate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => plate?.groups ?? [], [plate]);

  /** API "Due" = overdue + due today; split it so overdue gets its own red tab. */
  const tabs: Tab[] = useMemo(() => {
    const out: Tab[] = [];
    for (const g of groups) {
      const rows = g.rows ?? [];
      if (g.id === "due") {
        const overdue = rows.filter((r) => {
          const d = calendarDate(r);
          return d != null && d < today;
        });
        const dueToday = rows.filter((r) => !overdue.includes(r));
        if (overdue.length) out.push({ id: "overdue", title: "Overdue", rows: overdue, tone: "bad" });
        out.push({ id: "due", title: "Due today", rows: dueToday });
      } else {
        out.push({ id: g.id, title: g.title, rows });
      }
    }
    return out;
  }, [groups, today]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;
  const activeGroup = groups.find((g) => g.id === (activeTab?.id === "overdue" ? "due" : activeTab?.id)) ?? null;

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader title="Dashboard" subtitle="Bids that need your attention." />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view bidding."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  // "1 overdue · 1 due today · 2 upcoming · 7 in Team queue"
  const summary = tabs.map((t) => {
    const n = t.rows.length;
    const text =
      t.id === "overdue" ? `${n} overdue` : t.id === "due" ? `${n} due today` : t.id === "upcoming" ? `${n} upcoming` : `${n} in ${t.title}`;
    const cls = t.id === "overdue" ? "font-semibold text-danger" : t.id === "due" && n > 0 ? "font-semibold text-warning" : "";
    return { id: t.id, text, cls };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 ui-animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[21px] font-semibold tracking-[-0.01em] text-ink">{plate?.title || "Dashboard"}</h1>
          {loading && !plate ? (
            <Skeleton className="mt-1.5 h-4 w-72" />
          ) : summary.length ? (
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {summary.map((s, i) => (
                <span key={s.id}>
                  {i ? " · " : ""}
                  <span className={s.cls}>{s.text}</span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <Link
          href="/bidding"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-brand/40 hover:bg-[#f7fafe] hover:text-brand-secondary"
        >
          All estimates →
        </Link>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-warning-border bg-warning-tint px-4 py-3 text-[13px] text-warning">
          <span>{error}</span>
          <button type="button" className="cursor-pointer font-semibold hover:underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading && !plate ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
      ) : tabs.length === 0 ? (
        !error ? (
          <EmptyState
            message={plate?.hint || "No queues for your role yet. Ask an admin to confirm your login role."}
            action={
              <Link href="/bidding" className="text-sm font-semibold text-brand hover:underline">
                Browse estimates
              </Link>
            }
          />
        ) : null
      ) : activeTab ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div role="tablist" aria-label="Your queues" className="flex flex-wrap gap-x-[22px] border-b border-[var(--border-subtle)] px-[18px]">
            {tabs.map((t) => {
              const on = t.id === activeTab.id;
              const bad = t.tone === "bad";
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActiveTabId(t.id)}
                  className={`relative inline-flex shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap py-3 text-[13.5px] transition-colors ${
                    bad ? "text-danger" : on ? "text-ink" : "text-ink-muted hover:text-ink"
                  } ${on ? "font-semibold" : "font-medium"}`}
                >
                  {t.title}
                  <span
                    className={`rounded-full px-[7px] py-px text-[11.5px] font-semibold tabular-nums ${
                      bad ? "bg-danger-tint text-danger" : on ? "bg-brand-tint text-brand-secondary" : "bg-[#f1f2f4] text-ink-muted"
                    }`}
                  >
                    {t.rows.length}
                  </span>
                  {on ? <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${bad ? "bg-danger" : "bg-brand"}`} aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          <QueueTable
            key={activeTab.id}
            tab={activeTab}
            teamLabel={teamLabel}
            extras={extraColumns(activeGroup?.columns)}
            today={today}
          />
        </div>
      ) : null}
    </div>
  );
}
