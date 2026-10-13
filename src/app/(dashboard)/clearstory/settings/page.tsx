"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineSpinner } from "@/components/ui/LoadingBar";
import { LinkPending } from "@/components/ui/LinkPending";
import { useAuth } from "@/contexts/AuthContext";
import { COR_STATUSES, CorOverviewSummary } from "@/components/clearstory/CorOverviewSummary";
import { useClearstoryStatus } from "@/hooks/useClearstory";
import {
  getClearstoryApiPayload,
  getClearstoryProjects,
  getClearstoryTablePage,
  postClearstorySync,
} from "@/lib/api/endpoints/clearstory";
import * as adminApi from "@/lib/api/endpoints/admin";
import type { SitelineClearstoryGapAlertSettings } from "@/lib/admin/types";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatSyncAge } from "@/lib/workforce/format";

type Tab = "sync" | "data" | "alerts" | "advanced";

const ICONS: Record<Tab, ReactNode> = {
  sync: (
    <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  data: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </>
  ),
  alerts: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
    </>
  ),
  advanced: <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" strokeLinecap="round" strokeLinejoin="round" />,
};

const TABS: { value: Tab; label: string }[] = [
  { value: "sync", label: "Sync" },
  { value: "data", label: "Data" },
  { value: "alerts", label: "Alerts" },
  { value: "advanced", label: "Advanced" },
];

function Icon({ tab, className = "h-[15px] w-[15px]" }: { tab: Tab; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      {ICONS[tab]}
    </svg>
  );
}

function PanelHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-[var(--border-subtle)] px-4 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className="text-[15px] font-semibold text-ink">{children}</span>
    </div>
  );
}

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" }
  )}`;
}

/* ------------------------------------------------------------------ Sync */

function SyncPanel({ status }: { status: ReturnType<typeof useClearstoryStatus> }) {
  const { data, error, loading, refetch } = status;
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const running = data?.syncRunning === true;
  const ready = typeof data?.ready === "boolean" ? data.ready : typeof data?.ok === "boolean" ? data.ok : undefined;
  const last = data?.lastSuccessfulRunAt ?? null;

  // While a sync runs on the server, check back every 10s so the page updates when it finishes.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => void refetch(), 10_000);
    return () => clearTimeout(t);
  }, [running, data, refetch]);

  const runSync = async () => {
    setStarting(true);
    setMessage(null);
    try {
      const res = await postClearstorySync();
      setMessage(
        res.ok === false
          ? { text: res.message ?? "A sync is already running. It will finish on its own.", tone: "ok" }
          : { text: "Sync started. This takes a few minutes; you can keep working.", tone: "ok" }
      );
      await refetch();
    } catch (e) {
      setMessage({ text: getApiErrorMessage(e, "Couldn't start the sync"), tone: "error" });
    } finally {
      setStarting(false);
    }
  };

  const busy = starting || running;

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        title="Sync"
        description="Clearstory data is copied here on a schedule. Run it now if you need the latest changes."
        action={
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={busy}
            aria-busy={busy}
            className={buttonClasses("primary")}
          >
            {busy ? <InlineSpinner /> : <Icon tab="sync" />}
            {running ? "Syncing…" : starting ? "Starting…" : "Sync now"}
          </button>
        }
      />

      <div className="grid overflow-hidden rounded-[var(--radius)] border border-[var(--border-subtle)] sm:grid-cols-3">
        <Stat label="Connection">
          {loading && !data ? (
            <Skeleton className="h-4 w-24" />
          ) : error || ready === false ? (
            <span className="inline-flex items-center gap-2 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.15)]" aria-hidden />
              Not connected
            </span>
          ) : running ? (
            <span className="inline-flex items-center gap-2 text-brand-secondary">
              <InlineSpinner />
              Syncing now
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.15)]" aria-hidden />
              Connected
            </span>
          )}
        </Stat>
        <Stat label="Last successful sync">
          {loading && !data ? (
            <Skeleton className="h-4 w-36" />
          ) : last ? (
            <span title={new Date(last).toLocaleString()}>
              {formatDateTime(last)}
              <span className="ml-1.5 text-[12px] font-normal text-ink-muted">({formatSyncAge(last).toLowerCase()})</span>
            </span>
          ) : (
            "Never"
          )}
        </Stat>
        <Stat label="Schedule">Every 6 hours</Stat>
      </div>

      {message ? (
        <p
          role="status"
          className={`rounded-[var(--radius-md)] border px-3 py-2 text-[13px] ${
            message.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[var(--border-subtle)] bg-[#fafafa] text-ink-muted"
          }`}
        >
          {message.text}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-[12.5px] text-ink-muted">
        The schedule is set on the server. A full sync takes a few minutes; pages show the new data once it finishes.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Data */

const DATA_ICONS: Record<string, ReactNode> = {
  projects: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />,
  cors: (
    <>
      <path d="M14 3H6v18h12V7z" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 13h6M9 17h4" strokeLinecap="round" />
    </>
  ),
  tags: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  contracts: (
    <>
      <path d="M7 3h8l4 4v14H7z" strokeLinejoin="round" />
      <path d="M10 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  customers: <path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6" strokeLinejoin="round" />,
};

const DATA_TILES: { key: string; label: string; href: string }[] = [
  { key: "projects", label: "Projects", href: "/clearstory/projects" },
  { key: "cors", label: "Change orders", href: "/clearstory/cor" },
  { key: "tags", label: "T&M tags", href: "/clearstory/tags" },
  { key: "contracts", label: "Contracts", href: "/clearstory/directory" },
  { key: "customers", label: "Customers", href: "/clearstory/directory" },
];

/** Status segments: colour (validated status palette) + label; every segment is also labelled with its count. */
const COR_STATUS_COLORS: Record<string, string> = {
  in_review: "#eda100",
  approved_to_proceed: "#2a78d6",
  approved_co_issued: "#1baf7a",
  rejected: "#e34948",
  placeholder: "#9ca3af",
};
const TAG_STATUSES: { key: string; label: string; color: string; pill: string }[] = [
  { key: "awaiting_signature", label: "Awaiting signature", color: "#eda100", pill: "bg-amber-50 text-amber-800" },
  { key: "signed", label: "Signed", color: "#1baf7a", pill: "bg-green-50 text-green-700" },
  { key: "draft", label: "Draft", color: "#9ca3af", pill: "bg-[#f3f4f6] text-ink-muted" },
  { key: "rejected", label: "Rejected", color: "#e34948", pill: "bg-red-50 text-red-700" },
];

type Segment = { key: string; label: string; count: number; color: string };
type RecentItem = { key: string; title: string; job: string | null; status: string | null; updatedAt: string | null };

const shortDay = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const mirrorText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** One stacked bar with labelled chips under it; each segment has a hover/focus title with its share. */
function StatusBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.count, 0);
  const shown = segments.filter((s) => s.count > 0);
  return (
    <>
      <div className="flex h-3 gap-[2px]" role="img" aria-label={segments.map((s) => `${s.label} ${s.count}`).join(", ")}>
        {shown.map((s) => (
          <span
            key={s.key}
            className="block h-full first:rounded-l-full last:rounded-r-full"
            style={{ flex: s.count, background: s.color }}
            title={`${s.label}: ${s.count.toLocaleString()} (${total ? Math.round((s.count / total) * 100) : 0}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] text-ink-muted">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
            {s.label} <b className="font-semibold tabular-nums text-ink">{s.count.toLocaleString()}</b>
          </span>
        ))}
      </div>
    </>
  );
}

function DataCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[12px] border border-[var(--border-subtle)] bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

function RecentList({ items, pill }: { items: RecentItem[]; pill: (status: string | null) => ReactNode }) {
  if (!items.length) return <p className="py-2 text-[13px] text-ink-muted">Nothing synced yet.</p>;
  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li
          key={it.key}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 border-b border-[var(--border-subtle)] py-2 last:border-b-0"
        >
          <span className="truncate text-[13px] font-medium text-ink" title={it.title}>
            {it.title}
          </span>
          <span className="justify-self-end">{pill(it.status)}</span>
          <span className="text-[12px] text-ink-muted">{it.job ? `Job ${it.job}` : " "}</span>
          <span className="text-right text-[12px] text-ink-muted">{shortDay(it.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Synced data (option C): five count tiles across the full width, change orders and T&M tags by status,
 * and the three most recently updated of each. Uses requests the COR / Tags lists already make.
 */
function DataPanel({ status }: { status: ReturnType<typeof useClearstoryStatus> }) {
  const [counts, setCounts] = useState<Record<string, number | "error" | undefined>>({});
  const [corSegments, setCorSegments] = useState<Segment[] | "error" | null>(null);
  const [tagSegments, setTagSegments] = useState<Segment[] | "error" | null>(null);
  const [recentCors, setRecentCors] = useState<RecentItem[] | "error" | null>(null);
  const [recentTags, setRecentTags] = useState<RecentItem[] | "error" | null>(null);
  const last = status.data?.lastSuccessfulRunAt ?? null;

  // Everything fills in as its request returns (state only changes in the promise callbacks).
  const fetchAll = useCallback(() => {
    const setCount = (key: string) => (n: number) => setCounts((c) => ({ ...c, [key]: n }));
    const failCount = (key: string) => () => setCounts((c) => ({ ...c, [key]: "error" }));

    getClearstoryProjects({ page: 1, pageSize: 1 })
      .then((res) => setCount("projects")("total" in res ? res.total : res.projects.length))
      .catch(failCount("projects"));
    for (const key of ["contracts", "customers"] as const) {
      getClearstoryTablePage(key, { page: 1, pageSize: 1 })
        .then((res) => setCount(key)(res.total))
        .catch(failCount(key));
    }

    // CORs and tags: one request each gives the count and the 3 most recently updated.
    getClearstoryTablePage("cors", { page: 1, pageSize: 3 })
      .then((res) => {
        setCount("cors")(res.total);
        setRecentCors(
          res.rows.map((r) => {
            const m = r.typedMirror;
            const no = mirrorText(m.corNumber);
            const title = mirrorText(m.title) ?? "Untitled";
            return {
              key: r.resourceKey,
              title: no ? `COR ${no} · ${title}` : title,
              job: mirrorText(m.jobNumber),
              status: mirrorText(m.status),
              updatedAt: mirrorText(m.updatedAt),
            };
          })
        );
      })
      .catch(() => {
        failCount("cors")();
        setRecentCors("error");
      });
    getClearstoryTablePage("tags", { page: 1, pageSize: 3 })
      .then((res) => {
        setCount("tags")(res.total);
        const sc = res.statusCounts ?? {};
        setTagSegments(TAG_STATUSES.map((s) => ({ key: s.key, label: s.label, count: sc[s.key] ?? 0, color: s.color })));
        setRecentTags(
          res.rows.map((r) => {
            const m = r.typedMirror;
            const no = mirrorText(m.paddedTagNumber) ?? mirrorText(m.number);
            const title = mirrorText(m.title) ?? "Untitled";
            return {
              key: r.resourceKey,
              title: no ? `${no} · ${title}` : title,
              job: mirrorText(m.jobNumber),
              status: mirrorText(m.status),
              updatedAt: mirrorText(m.updatedAt),
            };
          })
        );
      })
      .catch(() => {
        failCount("tags")();
        setTagSegments("error");
        setRecentTags("error");
      });

    // CORs by status: the same stored overview the Advanced tab shows (CORs your company sent).
    getClearstoryApiPayload({ type: "cors_overview", key: "inbox=sent" })
      .then((res) => {
        const p = (res.payload ?? {}) as Record<string, unknown>;
        setCorSegments(
          COR_STATUSES.map((s) => {
            const bucket = (p[s.key] ?? {}) as Record<string, unknown>;
            const n = typeof bucket.totalCount === "number" ? bucket.totalCount : 0;
            return { key: s.key, label: s.label, count: n, color: COR_STATUS_COLORS[s.key] ?? "#9ca3af" };
          })
        );
      })
      .catch(() => setCorSegments("error"));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loadingAny = DATA_TILES.some((t) => counts[t.key] === undefined);
  const refresh = () => {
    setCounts({});
    setCorSegments(null);
    setTagSegments(null);
    setRecentCors(null);
    setRecentTags(null);
    fetchAll();
  };

  const corTotal = Array.isArray(corSegments) ? corSegments.reduce((a, s) => a + s.count, 0) : null;
  const tagTotal = Array.isArray(tagSegments) ? tagSegments.reduce((a, s) => a + s.count, 0) : null;
  const corPill = (s: string | null) => {
    const meta = COR_STATUSES.find((x) => x.key === s);
    return s ? (
      <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium ${meta?.pill ?? "bg-[#f3f4f6] text-ink-muted"}`}>
        {meta?.label ?? s.replace(/_/g, " ")}
      </span>
    ) : null;
  };
  const tagPill = (s: string | null) => {
    const meta = TAG_STATUSES.find((x) => x.key === s);
    return s ? (
      <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium ${meta?.pill ?? "bg-[#f3f4f6] text-ink-muted"}`}>
        {meta?.label ?? s.replace(/_/g, " ")}
      </span>
    ) : null;
  };
  const failed = <p className="py-1 text-[13px] text-ink-muted">Couldn&apos;t load this. Try Refresh counts.</p>;
  const viewAll = (href: string) => (
    <Link href={href} className="text-[12.5px] font-medium text-brand-secondary hover:underline">
      <LinkPending>View all</LinkPending>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Synced data</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
            {status.loading && !status.data ? (
              <Skeleton className="h-3.5 w-40" />
            ) : last ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[7px] w-[7px] rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.15)]" aria-hidden />
                Last synced {formatDateTime(last)}
              </span>
            ) : (
              <span>Not synced yet</span>
            )}
            <span aria-hidden>·</span>
            <span>what&apos;s been copied from Clearstory</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loadingAny}
          aria-busy={loadingAny}
          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-[#b9d8f6] hover:bg-brand-tint hover:text-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAny ? <InlineSpinner /> : <Icon tab="sync" className="h-3.5 w-3.5" />}
          Refresh counts
        </button>
      </div>

      {/* Five equal tiles across the full width; the whole tile opens the list. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {DATA_TILES.map((tile) => {
          const n = counts[tile.key];
          return (
            <Link
              key={tile.key}
              href={tile.href}
              aria-label={`${tile.label}: open list`}
              className="group relative flex flex-col gap-3.5 rounded-[12px] border border-[var(--border-subtle)] bg-white p-4 transition-[border-color,box-shadow] hover:border-[#c7d7ee] hover:shadow-[0_2px_10px_rgba(30,136,229,0.08)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-tint text-brand-secondary">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  {DATA_ICONS[tile.key]}
                </svg>
              </span>
              <span className="absolute right-3.5 top-4 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <LinkPending
                  icon={
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  {null}
                </LinkPending>
              </span>
              <span>
                {n === undefined ? (
                  <Skeleton className="h-[26px] w-20" />
                ) : n === "error" ? (
                  <span className="block text-[13px] font-medium text-ink-muted">Couldn&apos;t load</span>
                ) : (
                  <span className="block text-[26px] font-bold leading-none tabular-nums tracking-[-0.01em] text-ink">
                    {n.toLocaleString()}
                  </span>
                )}
                <span className="mt-1 block text-[13px] text-ink-muted">{tile.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* By status */}
      <div className="grid gap-3 md:grid-cols-2">
        <DataCard
          title="Change orders by status"
          aside={corTotal != null ? <span className="text-[12px] text-ink-muted">{corTotal.toLocaleString()} sent</span> : null}
        >
          {corSegments === null ? (
            <>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-3/4" />
            </>
          ) : corSegments === "error" ? (
            failed
          ) : (
            <StatusBar segments={corSegments} />
          )}
        </DataCard>
        <DataCard
          title="T&M tags by status"
          aside={tagTotal != null ? <span className="text-[12px] text-ink-muted">{tagTotal.toLocaleString()} tags</span> : null}
        >
          {tagSegments === null ? (
            <>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-3/4" />
            </>
          ) : tagSegments === "error" ? (
            failed
          ) : (
            <StatusBar segments={tagSegments} />
          )}
        </DataCard>
      </div>

      {/* Recently updated */}
      <div className="grid gap-3 md:grid-cols-2">
        <DataCard title="Recently updated change orders" aside={viewAll("/clearstory/cor")}>
          {recentCors === null ? (
            <div className="flex flex-col gap-2.5 py-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentCors === "error" ? (
            failed
          ) : (
            <RecentList items={recentCors} pill={corPill} />
          )}
        </DataCard>
        <DataCard title="Recently updated T&M tags" aside={viewAll("/clearstory/tags")}>
          {recentTags === null ? (
            <div className="flex flex-col gap-2.5 py-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentTags === "error" ? (
            failed
          ) : (
            <RecentList items={recentTags} pill={tagPill} />
          )}
        </DataCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Alerts */

function AlertsPanel() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<SitelineClearstoryGapAlertSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    adminApi
      .getSitelineClearstoryGapAlertSettings()
      .then((s) => !cancelled && setSettings(s))
      .catch((e) => !cancelled && setError(getApiErrorMessage(e, "Couldn't load alert settings")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const toggle = async () => {
    if (!settings) return;
    const next = !settings.adminToggleEnabled;
    setSaving(true);
    setError(null);
    try {
      await adminApi.patchSitelineClearstoryGapAlertSettings(next);
      setSettings(await adminApi.getSitelineClearstoryGapAlertSettings());
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't save the setting"));
    } finally {
      setSaving(false);
    }
  };

  const on = settings?.adminToggleEnabled ?? false;

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Alerts" description="Emails sent when something needs attention." />

      <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border-subtle)] px-4 py-3.5">
        <div className="min-w-0">
          <p id="gap-alert-label" className="text-[13.5px] font-semibold text-ink">
            Siteline projects missing in Clearstory
          </p>
          <p className="mt-0.5 max-w-[64ch] text-[13px] text-ink-muted">
            Email operations when Siteline has billing or overdue data for a project that has no matching project in
            Clearstory. Checked every weekday morning.
          </p>
          {settings ? (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              Sends to <span className="font-medium text-ink">{settings.recipientTo}</span>
              {!settings.envMasterEnabled ? (
                <span className="ml-1 text-amber-800">· Turned off on the server, so no emails go out right now.</span>
              ) : null}
            </p>
          ) : null}
        </div>
        {isAdmin ? (
          loading && !settings ? (
            <Skeleton className="h-[22px] w-10 rounded-full" />
          ) : settings ? (
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-labelledby="gap-alert-label"
              disabled={saving}
              onClick={() => void toggle()}
              className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-60 ${
                on ? "bg-brand" : "bg-[#d1d5db]"
              }`}
            >
              <span
                className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${
                  on ? "translate-x-[18px]" : ""
                }`}
                aria-hidden
              />
            </button>
          ) : null
        ) : null}
      </div>

      {!isAdmin ? <p className="text-[12.5px] text-ink-muted">Only admins can change alert settings.</p> : null}
      {error ? (
        <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Advanced */

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-[13px] font-medium text-ink sm:text-right">{children}</dd>
    </div>
  );
}

function AdvancedPanel({ statusData }: { statusData: unknown }) {
  const s = (statusData ?? {}) as Record<string, unknown>;
  const tags = (s.tags ?? {}) as Record<string, unknown>;
  const lastPhase = (tags.lastPhase ?? null) as { ranAt?: string; saved?: number } | null;
  const ready = typeof s.ready === "boolean" ? s.ready : typeof s.ok === "boolean" ? s.ok : undefined;
  const n = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US") : "—");

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Advanced" description="Connection details and the change order summary from Clearstory." />

      <dl className="overflow-hidden rounded-[var(--radius)] border border-[var(--border-subtle)]">
        <Detail label="Connection">{ready === undefined ? "—" : ready ? "Ready" : "Not ready"}</Detail>
        <Detail label="Sync running now">{s.syncRunning === true ? "Yes" : "No"}</Detail>
        <Detail label="Last full sync">{formatDateTime(typeof s.lastSuccessfulRunAt === "string" ? s.lastSuccessfulRunAt : null) ?? "Never"}</Detail>
        <Detail label="T&M tags stored">
          {n(tags.typedRowCount)} tags
          {typeof tags.payloadRowCount === "number" ? (
            <span className="font-normal text-ink-muted"> · {n(tags.payloadRowCount)} raw records</span>
          ) : null}
        </Detail>
        <Detail label="Last T&M tag sync">
          {lastPhase?.ranAt ? (
            <>
              {formatDateTime(lastPhase.ranAt)}
              {typeof lastPhase.saved === "number" ? (
                <span className="font-normal text-ink-muted"> · {n(lastPhase.saved)} saved</span>
              ) : null}
            </>
          ) : (
            "—"
          )}
        </Detail>
      </dl>

      <div className="border-t border-[var(--border-subtle)] pt-4">
        <CorOverviewSummary bare />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

export default function ClearstorySettingsPage() {
  const [tab, setTab] = useState<Tab>("sync");
  const status = useClearstoryStatus();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col ui-animate-in [--radius:10px] [--radius-md:8px]">
      <section className="cs-content-panel flex flex-col gap-4 rounded-lg p-5">
        <div>
          <h1 className="cs-page-title">Clearstory Settings</h1>
          <p className="cs-helper mt-1">Sync, data and alerts for the Clearstory connection</p>
        </div>

        {/* Same tab strip as T&M Tags / bid detail stages. */}
        <div className="box-border flex h-[52px] w-full items-center overflow-hidden rounded-[14px] border border-[#E5E7EB] px-1.5 shadow-[0_1px_2px_rgba(33,33,33,0.04)]">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`cs-settings-tab-${t.value}`}
                  aria-selected={active}
                  aria-controls="cs-settings-panel"
                  onClick={() => setTab(t.value)}
                  className={`inline-flex h-10 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-lg px-3.5 text-[13px] leading-none transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/30 ${
                    active
                      ? "bg-[#DBEAFE] font-semibold text-[#1D4ED8]"
                      : "font-medium text-[#616161] hover:bg-[rgba(33,33,33,0.05)] hover:text-[#212121]"
                  }`}
                >
                  <Icon tab={t.value} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div id="cs-settings-panel" role="tabpanel" aria-labelledby={`cs-settings-tab-${tab}`}>
          {tab === "sync" ? <SyncPanel status={status} /> : null}
          {tab === "data" ? <DataPanel status={status} /> : null}
          {tab === "alerts" ? <AlertsPanel /> : null}
          {tab === "advanced" ? <AdvancedPanel statusData={status.data} /> : null}
        </div>
      </section>
    </div>
  );
}
