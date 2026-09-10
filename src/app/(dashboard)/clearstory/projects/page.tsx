"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useClearstoryProjects, useClearstoryStatus } from "@/hooks/useClearstory";
import {
  formatUsdWhole,
  normalizeMoney,
  postClearstorySync,
  type ClearstoryProjectRowAllColumns,
} from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  expandCellForModal,
  formatSwaggerCell,
  humanizeColumnKey,
} from "@/lib/clearstory/swaggerTableColumns";
import { JsonPayloadModal } from "@/components/clearstory/JsonPayloadModal";
import { ClearstoryTablePagination } from "@/components/clearstory/ClearstoryTablePagination";
import {
  ColumnPickerButton,
  STICKY_HEADER_CLASS,
  loadHiddenColumns,
  stickyBodyClass,
} from "@/components/clearstory/ClearstorySwaggerTable";

// Match COR tables: the table scrolls (X+Y) inside a bounded region.
const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir } | null;

function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const aStr = typeof a === "string" ? a : String(a);
  const bStr = typeof b === "string" ? b : String(b);

  const aNum = Number(aStr);
  const bNum = Number(bStr);
  if (aStr !== "" && bStr !== "" && !Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return aStr.localeCompare(bStr);
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) {
    return (
      <svg className="h-3 w-3 shrink-0 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      {dir === "desc" ? (
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function formatDataAsOf(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function newestUpdatedAt(projects: ClearstoryProjectRowAllColumns[]): string | undefined {
  let best: number | undefined;
  let bestIso: string | undefined;
  for (const p of projects) {
    if (!p.updatedAt) continue;
    const t = new Date(p.updatedAt).getTime();
    if (!Number.isNaN(t) && (best === undefined || t > best)) {
      best = t;
      bestIso = p.updatedAt;
    }
  }
  return bestIso;
}

function collectProjectColumnKeys(rows: ClearstoryProjectRowAllColumns[]): string[] {
  // Contract-defined order (frontend-clearstory-projects-module.md).
  const PREFERRED: string[] = [
    "id",
    "jobNumber",
    "name",
    "customerName",
    "customerId",
    "customerJobNumber",
    "officeId",
    "officeName",
    "companyId",
    "originType",
    "archived",
    "siteProjectAddress",
    "siteStreetAddress",
    "siteCity",
    "siteState",
    "siteZipCode",
    "siteCountry",
    "baseContractValue",
    "updatedAt",
    "createdAt",
  ];

  const s = new Set<string>();
  for (const r of rows.slice(0, 15)) {
    for (const k of Object.keys(r)) s.add(k);
  }

  // Build final key list: preferred order first, then any extra keys (alphabetical by label).
  const preferred = PREFERRED.filter((k) => s.has(k));
  for (const k of preferred) s.delete(k);

  const extras = [...s].sort((a, b) => humanizeColumnKey(a).localeCompare(humanizeColumnKey(b)));
  return [...preferred, ...extras];
}

export default function ClearstoryProjectsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: statusData, error: statusError, loading: statusLoading, refetch: refetchStatus } =
    useClearstoryStatus();
  const { data, error, loading, refetch: refetchProjects } = useClearstoryProjects({
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const [inspect, setInspect] = useState<{
    columnKey: string;
    resourceKey: string;
    value: unknown;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const s = searchInput.trim();
      setDebouncedSearch(s.length >= 2 ? s : "");
      setPage(1);
    }, 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const projects = useMemo(
    () => ((data && "projects" in data ? data.projects : []) ?? []) as ClearstoryProjectRowAllColumns[],
    [data]
  );
  const total = data && "total" in data ? data.total : projects.length;
  const dataAsOf = useMemo(() => formatDataAsOf(newestUpdatedAt(projects)), [projects]);
  const columnKeys = useMemo(() => collectProjectColumnKeys(projects), [projects]);

  const [sort, setSort] = useState<SortState>(null);
  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };
  const sortedProjects = useMemo(() => {
    if (!sort) return projects;
    const withValues = projects.map((row) => ({
      row,
      value: sort.key === "baseContractValue" ? normalizeMoney(row.baseContractValue) : (row as Record<string, unknown>)[sort.key],
    }));
    withValues.sort((a, b) => (sort.dir === "asc" ? compareValues(a.value, b.value) : compareValues(b.value, a.value)));
    return withValues.map((w) => w.row);
  }, [projects, sort]);

  const columnsStorageKey = "cs-table-cols-cs-projects";
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => loadHiddenColumns(columnsStorageKey));
  const toggleColumn = (key: string) => {
    if (key === "id") return;
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(columnsStorageKey, JSON.stringify([...next]));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };
  const visibleColumnKeys = useMemo(
    () => columnKeys.filter((k) => k === "id" || !hiddenColumns.has(k)),
    [columnKeys, hiddenColumns]
  );

  // If backend clamps/normalizes pagination values, mirror them in UI state.
  // Only reconcile once a fetch has settled (`!loading`) — reconciling against `data`
  // while a new page/pageSize request is in flight compares the *stale* previous
  // response to the *new* local state and snaps the page back before the fetch resolves.
  useEffect(() => {
    if (!data || loading) return;
    if (!("page" in data) || !("pageSize" in data) || !("total" in data)) return;
    const dPage = data.page;
    const dPageSize = data.pageSize;
    if (typeof dPage === "number") setPage((prev) => (dPage !== prev ? dPage : prev));
    if (typeof dPageSize === "number") setPageSize((prev) => (dPageSize !== prev ? dPageSize : prev));
    if (typeof dPage === "number" && typeof dPageSize === "number") {
      const pages = Math.max(1, Math.ceil(data.total / (dPageSize || 50)));
      if (dPage > pages) setPage(pages);
    }
  }, [data, loading]);

  const statusReady =
    statusData &&
    (typeof statusData.ready === "boolean"
      ? statusData.ready
      : typeof statusData.ok === "boolean"
        ? statusData.ok
        : undefined);

  const statusHint = useMemo(() => {
    if (statusError) return statusError;
    if (!statusData) return null;
    if (statusReady === true) return "Module ready.";
    if (statusReady === false) return "Clearstory reported not ready.";
    return "Module status loaded.";
  }, [statusData, statusError, statusReady]);

  const serverSyncRunning = statusData?.syncRunning === true;
  const lastFullSync =
    typeof statusData?.lastSuccessfulRunAt === "string" && statusData.lastSuccessfulRunAt
      ? formatDataAsOf(statusData.lastSuccessfulRunAt)
      : null;

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await postClearstorySync();
      setSyncMessage(res.message ?? (res.ok ? "Sync requested." : "Sync did not start (may already be running)."));
      await refetchProjects();
      await refetchStatus();
    } catch (e) {
      setSyncMessage(getApiErrorMessage(e, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  }, [refetchProjects, refetchStatus]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Projects"
        subtitle="Browse Clearstory projects. Search by name, job number, or customer, then open a project to see the summary."
        action={
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing || serverSyncRunning}
            aria-busy={syncing || serverSyncRunning}
            title={serverSyncRunning ? "A sync is already running on the server." : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:pointer-events-none disabled:opacity-60"
          >
            {syncing || serverSyncRunning ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                {serverSyncRunning && !syncing ? "Sync running…" : "Syncing…"}
              </>
            ) : (
              "Refresh from Clearstory"
            )}
          </button>
        }
      />

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-4">
        <Card className="flex flex-col">
          <CardHeader
            title="Project list"
            subtitle={
              dataAsOf
                ? `Updated as of ${dataAsOf} (newest row on this page).`
                : "Search by name, job number, or customer."
            }
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label htmlFor="clearstory-project-search" className="sr-only">
                Search projects
              </label>
              <input
                id="clearstory-project-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, job #, customer…"
                autoComplete="off"
                className="w-full max-w-md rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <p className="text-xs text-ink/45" role="status" aria-live="polite">
              {statusLoading ? (
                "Checking module status…"
              ) : (
                <>
                  {statusHint}
                  {lastFullSync ? (
                    <span className="mt-1 block text-[10px] text-ink/35">
                      Last full sync: {lastFullSync}
                    </span>
                  ) : null}
                </>
              )}
            </p>
          </div>
          {syncMessage ? (
            <p className="mt-3 text-sm text-ink/70" role="status">
              {syncMessage}
            </p>
          ) : null}
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <JsonPayloadModal
            open={!!inspect}
            title={inspect ? `“${inspect.columnKey}”` : ""}
            subtitle={inspect ? `Project id: ${inspect.resourceKey}` : undefined}
            loading={false}
            error={null}
            payload={inspect?.value}
            onClose={() => setInspect(null)}
          />

          {loading ? (
            <TableSkeleton rows={8} />
          ) : error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-ink/55">
              No projects match this search, or Clearstory has no project rows yet. Try clearing the search or run a
              sync if you expected data.
            </p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-3 flex justify-end">
                <ColumnPickerButton
                  columns={columnKeys.map((k) => ({ key: k, label: humanizeColumnKey(k) }))}
                  hidden={hiddenColumns}
                  lockedKey="id"
                  onToggle={toggleColumn}
                />
              </div>
              <div className={`${TABLE_SCROLL} rounded-xl border border-ink/[0.1] bg-[#fafbfc] shadow-inner`}>
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
                  <caption className="sr-only">Clearstory projects</caption>
                  <thead>
                    <tr className="sticky top-0 z-20 bg-[#f0f2f5]">
                      {visibleColumnKeys.map((k) => {
                        const dir = sort?.key === k ? sort.dir : null;
                        const isSticky = k === "id";
                        return (
                          <th
                            key={k}
                            scope="col"
                            className={`whitespace-nowrap border-b border-ink/[0.1] px-0 py-0 text-xs font-semibold tracking-wide text-ink/60 ${
                              isSticky ? STICKY_HEADER_CLASS : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort(k)}
                              aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                              className="flex w-full items-center gap-1 px-3 py-3 text-left transition hover:text-ink"
                            >
                              {humanizeColumnKey(k)}
                              <SortIcon dir={dir} />
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((p, rowIdx) => {
                      const base = normalizeMoney(p.baseContractValue);
                      const zebra = rowIdx % 2 === 1;
                      return (
                        <tr
                          key={p.id}
                          className={`align-top transition hover:bg-brand/[0.03] ${zebra ? "bg-ink/[0.015]" : "bg-white"}`}
                        >
                          {visibleColumnKeys.map((k) => {
                            const raw = (p as Record<string, unknown>)[k];
                            const isSticky = k === "id";
                            // Special-case baseContractValue to use USD formatting when possible.
                            if (k === "baseContractValue") {
                              return (
                                <td key={k} className={`max-w-[16rem] border-b border-ink/[0.06] px-3 py-2.5 text-sm text-ink/90 tabular-nums ${isSticky ? stickyBodyClass(zebra) : ""}`}>
                                  {formatUsdWhole(base)}
                                </td>
                              );
                            }

                            const exp = expandCellForModal(raw);
                            return (
                              <td key={k} className={`max-w-[18rem] border-b border-ink/[0.06] px-3 py-2.5 text-sm text-ink/90 ${isSticky ? stickyBodyClass(zebra) : ""}`}>
                                {"empty" in exp ? (
                                  <span className="text-ink/30">—</span>
                                ) : "modal" in exp ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInspect({
                                        columnKey: humanizeColumnKey(k),
                                        resourceKey: String(p.id),
                                        value: exp.modal,
                                      })
                                    }
                                    className="block w-full truncate text-left font-semibold text-brand underline-offset-2 hover:underline"
                                    title="Open details"
                                  >
                                    {formatSwaggerCell(raw) || "View"}
                                  </button>
                                ) : (
                                  k === "id" ? (
                                    <Link
                                      href={`/clearstory/projects/${encodeURIComponent(String(p.id))}`}
                                      className="block truncate font-semibold text-brand hover:text-brand-secondary"
                                      title="Open project summary"
                                    >
                                      {exp.text || "—"}
                                    </Link>
                                  ) : (
                                    <span className="block truncate" title={exp.text.length > 80 ? exp.text : undefined}>
                                      {exp.text || "—"}
                                    </span>
                                  )
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

              <ClearstoryTablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                ariaLabel="Project pages"
                idPrefix="cs-projects"
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
