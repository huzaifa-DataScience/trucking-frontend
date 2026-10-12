"use client";

import { useEffect, useState } from "react";

import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";
import { InlineSpinner, LoadingBar } from "@/components/ui/LoadingBar";
import { JsonPayloadModal } from "@/components/clearstory/JsonPayloadModal";
import { ClearstoryTablePagination } from "@/components/clearstory/ClearstoryTablePagination";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";
import type { ClearstoryTableRow } from "@/lib/api/endpoints/clearstory";

type StatusFilter = "" | "awaiting_signature" | "signed" | "draft" | "rejected";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "awaiting_signature", label: "Awaiting signature" },
  { value: "signed", label: "Signed" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_PILL: Record<string, { label: string; className: string }> = {
  awaiting_signature: { label: "Awaiting signature", className: "bg-amber-50 text-amber-800" },
  signed: { label: "Signed", className: "bg-green-50 text-green-700" },
  draft: { label: "Draft", className: "bg-[#f3f4f6] text-ink-muted" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

type SortKey = "tagNumber" | "jobNumber" | "title" | "workDate" | "status" | "waiting";

/** First click direction: dates and waiting start newest/longest first, text columns A→Z. */
const FIRST_DIR: Record<SortKey, SortDir> = {
  tagNumber: "asc",
  jobNumber: "asc",
  title: "asc",
  workDate: "desc",
  status: "asc",
  waiting: "desc",
};

/** Map a header sort to the API. "Waiting" is days since created, so longest wait = oldest createdAt. */
function apiSort(sort: { key: SortKey; dir: SortDir } | null): { sort?: string; sortDir?: SortDir } {
  if (!sort) return {};
  if (sort.key === "waiting") return { sort: "createdAt", sortDir: sort.dir === "desc" ? "asc" : "desc" };
  return { sort: sort.key, sortDir: sort.dir };
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null;
}

/** Work dates are stored as a calendar day; format the date part only so time zones can't shift it. */
function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
}

function StatusPill({ status }: { status: string | null }) {
  const meta = status ? STATUS_PILL[status] : undefined;
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${
        meta?.className ?? "bg-[#f3f4f6] text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {meta?.label ?? status ?? "Unknown"}
    </span>
  );
}

function rowFields(row: ClearstoryTableRow) {
  const m = row.typedMirror;
  const s = row.swagger ?? {};
  const status = str(m.status) ?? str(s.status);
  const hours = typeof s.totalHours === "number" ? s.totalHours : null;
  // Waiting = days since it went out for signature (submitted date, else created).
  const sentAt = str(s.dateSubmitted) ?? str(m.createdAt);
  const waitingDays =
    status === "awaiting_signature" && sentAt ? Math.max(0, Math.floor((Date.now() - Date.parse(sentAt)) / DAY_MS)) : null;
  return {
    tagNo: str(m.paddedTagNumber) ?? str(m.number) ?? row.resourceKey,
    jobNumber: str(m.jobNumber),
    projectName: str(m.projectName),
    customerName: str(m.customerName),
    title: str(m.title)?.trim() ?? null,
    workDate: str(m.dateOfWorkPerformed),
    hours,
    status,
    waitingDays,
  };
}

/** Project names come as "21437 - HQ Annex (…)"; drop the leading job number we already show. */
function shortProjectName(name: string | null, job: string | null): string | null {
  if (!name) return null;
  const trimmed = job ? name.replace(new RegExp(`^0*${job}\\s*-\\s*`), "") : name;
  return trimmed || name;
}

/**
 * Clearstory T&M tags list: status tabs (Estimates-style), search + project filter, table, pager.
 * No title row of its own: the page heading names it and the "All" tab shows the total.
 * `embedded` drops the outer panel border so it can sit inside another box (Directory).
 */
export function ClearstoryTagsList({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState<StatusFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [inspect, setInspect] = useState<{ tagNo: string; value: unknown } | null>(null);
  // null = API default (most recently updated first).
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const onSort = (key: SortKey) =>
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DIR[key] }));
  const sortProps = (key: SortKey) => ({
    column: key,
    active: sort?.key === key,
    dir: sort?.key === key ? sort.dir : FIRST_DIR[key],
    onSort,
  });

  // Filter once typing pauses so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setProjectId(projectIdInput.trim() || undefined);
    }, 320);
    return () => clearTimeout(t);
  }, [searchInput, projectIdInput]);

  const { rows, total, statusCounts, page, pageSize, setPage, setPageSize, isLoading, error } = useClearstoryTable(
    "tags",
    { projectId, status: status || undefined, search: search || undefined, ...apiSort(sort) }
  );

  const allCount = statusCounts ? Object.values(statusCounts).reduce((a, b) => a + b, 0) : null;
  const tabCount = (v: StatusFilter): number | null => (v === "" ? allCount : statusCounts ? statusCounts[v] ?? 0 : null);
  const showSkeleton = isLoading && rows.length === 0;
  // Old rows stay on screen while a tab/search/page request runs; make that visible.
  const refreshing = isLoading && rows.length > 0;

  return (
    <section
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${embedded ? "" : "cs-content-panel rounded-lg"}`}
      aria-label="T&M tags"
    >
      {/* Status tabs: same chrome as the bid detail stage strip (BidStageStrip): soft 52px shell, 40px tabs,
          blue-tint active tab, scrolls sideways on small screens. */}
      <div className="px-5 pt-4">
        <div className="box-border flex h-[52px] w-full items-center overflow-hidden rounded-[14px] border border-[#E5E7EB] px-1.5 shadow-[0_1px_2px_rgba(33,33,33,0.04)]">
          <div
            role="tablist"
            aria-label="Tag status"
            className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {STATUS_TABS.map((t) => {
              const active = status === t.value;
              const count = tabCount(t.value);
              return (
                <button
                  key={t.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatus(t.value)}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] leading-none transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/30 ${
                    active
                      ? "bg-[#DBEAFE] font-semibold text-[#1D4ED8]"
                      : "font-medium text-[#616161] hover:bg-[rgba(33,33,33,0.05)] hover:text-[#212121]"
                  }`}
                >
                  {t.label}
                  {active && isLoading ? (
                    <InlineSpinner className="opacity-70" />
                  ) : count == null ? (
                    // Counts not loaded yet: a small shimmer instead of a dash.
                    <Skeleton className="h-3 w-6 rounded-full" />
                  ) : (
                    <span
                      className={`tabular-nums ${count === 0 ? "opacity-40" : active ? "opacity-70" : "opacity-60"}`}
                    >
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        <div className="relative w-full min-w-0 sm:w-80">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <label htmlFor="tags-search" className="sr-only">
            Search tags
          </label>
          <input
            id="tags-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tag #, title, job #…"
            autoComplete="off"
            className="cs-field w-full pl-9 pr-3"
          />
        </div>
        <label htmlFor="tags-project-filter" className="sr-only">
          Filter by Clearstory project ID
        </label>
        <input
          id="tags-project-filter"
          type="search"
          value={projectIdInput}
          onChange={(e) => setProjectIdInput(e.target.value)}
          placeholder="Project ID"
          inputMode="numeric"
          autoComplete="off"
          className="cs-field w-full px-3 sm:w-36"
        />
        {refreshing ? (
          <span className="cs-helper inline-flex items-center gap-1.5 text-brand" role="status">
            <InlineSpinner />
            Updating…
          </span>
        ) : null}
      </div>

      <JsonPayloadModal
        open={!!inspect}
        title={inspect ? `Tag ${inspect.tagNo}` : ""}
        subtitle="Full Clearstory record"
        loading={false}
        error={null}
        payload={inspect?.value}
        onClose={() => setInspect(null)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3" aria-busy={isLoading}>
        {refreshing ? <LoadingBar label="Loading tags" /> : null}
        {showSkeleton ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <p className="cs-helper py-6 text-red-600" role="alert">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="cs-helper py-6">No tags match this status and search.</p>
        ) : (
          <div
            className={`cs-data-table cs-table-shell min-h-0 overflow-y-auto max-h-[min(70dvh,calc(100dvh-16rem))] transition-opacity duration-150 ${
              refreshing ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <table className="w-full min-w-[860px] border-collapse text-left">
              <caption className="sr-only">T&amp;M tags</caption>
              <thead className="sticky top-0 z-20 bg-[#f3f4f6]">
                <tr>
                  <SortableTh<SortKey> label="Tag #" {...sortProps("tagNumber")} />
                  <SortableTh<SortKey> label="Job · customer" {...sortProps("jobNumber")} />
                  <SortableTh<SortKey> label="Title" {...sortProps("title")} />
                  <SortableTh<SortKey> label="Work date" {...sortProps("workDate")} />
                  {/* Hours live in the Clearstory payload, not a database column, so the server can't sort on them. */}
                  <th className="whitespace-nowrap px-3 py-2 text-right">Hours</th>
                  <SortableTh<SortKey> label="Status" {...sortProps("status")} />
                  <SortableTh<SortKey> label="Waiting" {...sortProps("waiting")} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const f = rowFields(row);
                  const project = shortProjectName(f.projectName, f.jobNumber);
                  return (
                    <tr
                      key={row.resourceKey}
                      className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${
                        idx % 2 === 1 ? "bg-canvas/50" : "bg-white"
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px]">
                        <button
                          type="button"
                          onClick={() => setInspect({ tagNo: f.tagNo, value: row.swagger ?? row.typedMirror })}
                          className="font-mono text-[12.5px] font-medium text-ink underline-offset-2 hover:underline"
                          title="Open full tag record"
                        >
                          {f.tagNo}
                        </button>
                      </td>
                      <td className="px-3 py-2 align-middle text-[13px]">
                        <div className="flex max-w-[18rem] flex-col">
                          <span className="truncate" title={f.projectName ?? undefined}>
                            {f.jobNumber ?? "—"}
                            {project ? ` · ${project}` : ""}
                          </span>
                          {f.customerName ? <span className="cs-helper truncate">{f.customerName}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[13px]">
                        <span className="block max-w-[16rem] truncate" title={f.title ?? undefined}>
                          {f.title || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] tabular-nums">
                        {formatDay(f.workDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[13px] tabular-nums">
                        {f.hours == null ? <span className="text-ink/30">—</span> : f.hours.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px]">
                        <StatusPill status={f.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] tabular-nums">
                        {f.waitingDays == null ? (
                          <span className="text-ink/30">—</span>
                        ) : (
                          <span className={f.waitingDays >= 30 ? "font-medium text-amber-800" : "text-ink-muted"}>
                            {f.waitingDays === 1 ? "1 day" : `${f.waitingDays.toLocaleString()} days`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!showSkeleton && !error && total > 0 ? (
        <div className="border-t border-[var(--border-subtle)] px-5 py-3 [&>div]:mt-0 [&>div]:border-t-0 [&>div]:pt-0">
          <ClearstoryTablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            ariaLabel="Tag pages"
            idPrefix={embedded ? "cs-tags-embedded" : "cs-tags"}
          />
        </div>
      ) : null}
    </section>
  );
}
