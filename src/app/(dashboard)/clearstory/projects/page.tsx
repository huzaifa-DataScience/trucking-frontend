"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";
import { useClearstoryProjects, useClearstoryStatus } from "@/hooks/useClearstory";
import { getClearstoryProjects } from "@/lib/api/endpoints/clearstory";
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
import {
  ColumnPickerButton,
  loadHiddenColumns,
  pinnedBodyClass,
  pinnedHeaderClass,
  useColumnPinning,
  useStickyOffsets,
} from "@/components/clearstory/ClearstorySwaggerTable";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { SavedViewTabs, conditionKey } from "@/components/filters/SavedViewTabs";
import {
  rowMatchesGroups,
  loadSavedViews,
  saveSavedViews,
  type FilterCondition,
  type FilterGroup,
  type SavedView,
} from "@/lib/filters/types";
import { PROJECTS_SAVED_VIEWS_KEY, PROJECT_FILTER_FIELDS } from "@/lib/clearstory/projectFilters";
import { newId } from "@/lib/bidding/newId";
import { useAuth } from "@/contexts/AuthContext";
import { formatSyncAge } from "@/lib/workforce/format";

// Match COR tables: the table scrolls (X+Y) inside a bounded region.
/** First-visit columns (the rest stay one click away in the column picker). */
const DEFAULT_VISIBLE_COLUMNS = new Set(["id", "jobNumber", "name", "customerName"]);
const PAGE_SIZE = 50;

const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

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

// `?search=` (e.g. from the Billing "no Clearstory match" list) pre-fills the search box.
export default function ClearstoryProjectsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ClearstoryProjectsView />
    </Suspense>
  );
}

function ClearstoryProjectsView() {
  const initialSearch = (useSearchParams().get("search") ?? "").trim();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.length >= 2 ? initialSearch : "");
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
      setExtraRows([]);
    }, 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [extraRows, setExtraRows] = useState<ClearstoryProjectRowAllColumns[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [atTableBottom, setAtTableBottom] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeConditionKeys, setActiveConditionKeys] = useState<string[]>([]);

  /** Scoped per-user so switching accounts on the same browser doesn't leak someone else's saved views. */
  const savedViewsKey = user ? `${PROJECTS_SAVED_VIEWS_KEY}:${user.id}` : null;

  useEffect(() => {
    setSavedViews(savedViewsKey ? loadSavedViews(savedViewsKey) : []);
  }, [savedViewsKey]);

  const applyFilterGroups = (groups: FilterGroup[]) => {
    setActiveConditionKeys([]);
    setFilterGroups(groups);
    setFilterOpen(false);
  };

  const saveAsView = (name: string, groups: FilterGroup[]) => {
    const view: SavedView = { id: newId(), name, groups };
    const next = [...savedViews, view];
    setSavedViews(next);
    if (savedViewsKey) saveSavedViews(savedViewsKey, next);
    setFilterOpen(false);
    // Saving only creates the chips — it does not apply the filter to the table.
  };

  const findCondition = (views: SavedView[], key: string): FilterCondition | undefined => {
    const [viewId, conditionId] = key.split("::");
    const view = views.find((v) => v.id === viewId);
    return view?.groups.flatMap((g) => g.conditions).find((c) => c.id === conditionId);
  };

  const groupsForActiveKeys = (keys: string[], views: SavedView[]): FilterGroup[] =>
    keys
      .map((k) => findCondition(views, k))
      .filter((c): c is FilterCondition => Boolean(c))
      .map((c) => ({ id: newId(), conditions: [c] }));

  const toggleCondition = (viewId: string, condition: FilterCondition) => {
    const key = conditionKey(viewId, condition.id);
    setActiveConditionKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setFilterGroups(groupsForActiveKeys(next, savedViews));
      return next;
    });
  };

  const removeSavedView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    if (savedViewsKey) saveSavedViews(savedViewsKey, next);
    setActiveConditionKeys((prev) => {
      const nextKeys = prev.filter((k) => !k.startsWith(`${id}::`));
      if (nextKeys.length !== prev.length) setFilterGroups(groupsForActiveKeys(nextKeys, next));
      return nextKeys;
    });
  };

  const clearView = () => {
    setActiveConditionKeys([]);
    setFilterGroups([]);
  };

  const activeFilterCount = useMemo(() => filterGroups.reduce((n, g) => n + g.conditions.length, 0), [filterGroups]);

  const allProjects = useMemo(() => {
    const first = ((data && "projects" in data ? data.projects : []) ?? []) as ClearstoryProjectRowAllColumns[];
    const seen = new Set(first.map((r) => String(r.id)));
    return [...first, ...extraRows.filter((r) => !seen.has(String(r.id)))];
  }, [data, extraRows]);
  const projects = useMemo(
    () => allProjects.filter((p) => rowMatchesGroups(p as unknown as Record<string, unknown>, filterGroups)),
    [allProjects, filterGroups]
  );
  const total = data && "total" in data ? data.total : projects.length;
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
  const [storedHidden, setHiddenColumns] = useState<Set<string> | null>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(columnsStorageKey) == null) return null;
    } catch {
      return null;
    }
    return loadHiddenColumns(columnsStorageKey);
  });
  const hiddenColumns = useMemo(
    () => storedHidden ?? new Set(columnKeys.filter((k) => !DEFAULT_VISIBLE_COLUMNS.has(k))),
    [storedHidden, columnKeys]
  );
  const toggleColumn = (key: string) => {
    if (key === "id") return;
    setHiddenColumns((prevStored) => {
      const prev = prevStored ?? new Set(columnKeys.filter((k) => !DEFAULT_VISIBLE_COLUMNS.has(k)));
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

  const { togglePin, effectivePinnedOrder } = useColumnPinning({
    storageKey: "cs-table-pins-cs-projects",
    lockedKey: "id",
  });
  const visibleKeySet = useMemo(() => new Set(visibleColumnKeys), [visibleColumnKeys]);
  const activePinnedOrder = useMemo(
    () => effectivePinnedOrder.filter((k) => visibleKeySet.has(k)),
    [effectivePinnedOrder, visibleKeySet]
  );
  const pinnedSet = useMemo(() => new Set(activePinnedOrder), [activePinnedOrder]);
  const orderedColumnKeys = useMemo(() => {
    const unpinned = visibleColumnKeys.filter((k) => !pinnedSet.has(k));
    return [...activePinnedOrder, ...unpinned];
  }, [visibleColumnKeys, activePinnedOrder, pinnedSet]);

  const pinnedCellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const pinnedOffsets = useStickyOffsets(activePinnedOrder, pinnedCellRefs, [orderedColumnKeys.length]);

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

  const serverSyncRunning = statusData?.syncRunning === true;
  const lastSyncIso =
    typeof statusData?.lastSuccessfulRunAt === "string" && statusData.lastSuccessfulRunAt
      ? statusData.lastSuccessfulRunAt
      : null;
  // One plain line for users: how fresh the data is, or that Clearstory is down.
  const syncProblem = Boolean(statusError) || statusReady === false;
  const syncAge = lastSyncIso ? formatSyncAge(lastSyncIso) : null;
  const syncLine = statusLoading
    ? "Checking sync…"
    : serverSyncRunning
      ? "Syncing with Clearstory…"
      : syncProblem
        ? "Clearstory not connected, data may be out of date"
        : syncAge
          ? `Synced ${syncAge === "Just now" ? "just now" : syncAge}`
          : null;

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await postClearstorySync();
      setSyncMessage(res.message ?? (res.ok ? "Sync requested." : "Sync did not start (may already be running)."));
      setExtraRows([]);
      await refetchProjects();
      await refetchStatus();
    } catch (e) {
      setSyncMessage(getApiErrorMessage(e, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  }, [refetchProjects, refetchStatus]);

  const loadedCount = allProjects.length;
  const hasMore = loadedCount < total;
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const nextPage = Math.floor(loadedCount / PAGE_SIZE) + 1;
      const res = await getClearstoryProjects({
        search: debouncedSearch || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
        allColumns: true,
        full: true,
      });
      const rows = ((res && "projects" in res ? res.projects : []) ?? []) as ClearstoryProjectRowAllColumns[];
      setExtraRows((prev) => [...prev, ...rows]);
      setAtTableBottom(false);
    } catch (e) {
      setMoreError(getApiErrorMessage(e, "Couldn't load more projects"));
    } finally {
      setLoadingMore(false);
    }
  }, [loadedCount, debouncedSearch]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 ui-animate-in [--radius:10px] [--radius-md:8px]">
      <PageHeader
        title="Projects"
        subtitle="Browse projects from Clearstory"
        action={
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing || serverSyncRunning}
            aria-busy={syncing || serverSyncRunning}
            title={serverSyncRunning ? "A sync is already running on the server." : "Pull the latest projects from Clearstory"}
            className={buttonClasses("secondary")}
          >
            {syncing || serverSyncRunning ? (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {syncing || serverSyncRunning ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      <section className="cs-content-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="cs-section-title">All projects</h2>
            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-medium text-ink-muted">
              {total.toLocaleString()}
            </span>
          </div>
          <p
            className={`cs-helper ${syncProblem && !statusLoading ? "text-danger" : ""}`}
            role="status"
            aria-live="polite"
            title={
              lastSyncIso ? `Last full sync ${new Date(lastSyncIso).toLocaleString()}` : statusError ?? undefined
            }
          >
            {syncLine}
          </p>
        </div>

        <div className="flex flex-col gap-3 px-5 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-0 sm:mr-auto sm:w-80">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <label htmlFor="clearstory-project-search" className="sr-only">
                Search projects
              </label>
              <input
                id="clearstory-project-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search…"
                autoComplete="off"
                className="cs-field w-full pl-9 pr-3"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5z" strokeLinejoin="round" />
              </svg>
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            {columnKeys.length > 0 ? (
              <ColumnPickerButton
                outline
                columns={columnKeys.map((k) => ({ key: k, label: humanizeColumnKey(k) }))}
                hidden={hiddenColumns}
                lockedKey="id"
                onToggle={toggleColumn}
                pinned={pinnedSet}
                onTogglePin={togglePin}
              />
            ) : null}
          </div>

          {syncMessage ? (
            <p className="cs-helper" role="status">
              {syncMessage}
            </p>
          ) : null}

          <SavedViewTabs
            views={savedViews}
            fields={PROJECT_FILTER_FIELDS}
            activeKeys={activeConditionKeys}
            showClear={activeConditionKeys.length > 0 || activeFilterCount > 0}
            onToggleCondition={toggleCondition}
            onRemoveView={removeSavedView}
            onClear={clearView}
          />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col px-5 pt-2">
          <JsonPayloadModal
            open={!!inspect}
            title={inspect ? `“${inspect.columnKey}”` : ""}
            subtitle={inspect ? `Project id: ${inspect.resourceKey}` : undefined}
            loading={false}
            error={null}
            payload={inspect?.value}
            onClose={() => setInspect(null)}
          />

          {loading && projects.length > 0 ? (
            <div className="absolute left-0 right-0 top-0 z-30 h-0.5 overflow-hidden bg-brand/15" aria-hidden>
              <div className="h-full w-1/3 animate-[ticket-grid-loading_1s_ease-in-out_infinite] bg-brand" />
            </div>
          ) : null}

          {loading && projects.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : error ? (
            <p className="cs-helper py-6 text-red-600" role="alert">
              {error}
            </p>
          ) : projects.length === 0 ? (
            <p className="cs-helper py-6">
              No projects match this search, or Clearstory has no project rows yet. Try clearing the search or refresh
              if you expected data.
            </p>
          ) : (
              <div
                ref={tableScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setAtTableBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
                }}
                className={`cs-data-table cs-table-shell ${TABLE_SCROLL}`}
              >
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Clearstory projects</caption>
                  {/* Header stays put while rows scroll; z-20 keeps it above pinned body cells (z-10). */}
                  <thead className="sticky top-0 z-20 bg-[#f3f4f6]">
                    <tr>
                      {orderedColumnKeys.map((k) => {
                        const dir = sort?.key === k ? sort.dir : null;
                        const isPinned = pinnedSet.has(k);
                        const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === k;
                        return (
                          <SortableTh
                            key={k}
                            label={humanizeColumnKey(k)}
                            column={k}
                            active={dir != null}
                            dir={dir ?? "asc"}
                            onSort={toggleSort}
                            style={isPinned ? { left: pinnedOffsets[k] ?? 0 } : undefined}
                            className={isPinned ? pinnedHeaderClass(isLastPinned) : ""}
                            thRef={(el) => {
                              if (isPinned && el) pinnedCellRefs.current.set(k, el);
                              else pinnedCellRefs.current.delete(k);
                            }}
                          />
                        );
                      })}
                      <th aria-hidden className="w-full" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((p, rowIdx) => {
                      const base = normalizeMoney(p.baseContractValue);
                      const zebra = rowIdx % 2 === 1;
                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${zebra ? "bg-canvas/50" : "bg-white"}`}
                        >
                          {orderedColumnKeys.map((k) => {
                            const raw = (p as Record<string, unknown>)[k];
                            const isPinned = pinnedSet.has(k);
                            const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === k;
                            const cellStyle = isPinned ? { left: pinnedOffsets[k] ?? 0 } : undefined;
                                            const cellClass = `max-w-[18rem] whitespace-nowrap px-3 py-2.5 align-middle text-[13px] ${
                              isPinned ? pinnedBodyClass(zebra, isLastPinned) : ""
                            }`;
                            if (k === "baseContractValue") {
                              return (
                                <td key={k} style={cellStyle} className={`${cellClass} ui-num`}>
                                  {formatUsdWhole(base)}
                                </td>
                              );
                            }

                            const exp = expandCellForModal(raw);
                            return (
                              <td key={k} style={cellStyle} className={cellClass}>
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
                                    className="block w-full truncate text-left font-medium text-ink underline-offset-2 hover:underline"
                                    title="Open details"
                                  >
                                    {formatSwaggerCell(raw) || "View"}
                                  </button>
                                ) : k === "id" ? (
                                  <Link
                                    href={`/clearstory/projects/${encodeURIComponent(String(p.id))}`}
                                    className="block max-w-[16rem] truncate font-medium text-ink hover:underline"
                                    title="Open project summary"
                                  >
                                    {exp.text || "—"}
                                  </Link>
                                ) : (
                                  <span className="block truncate" title={exp.text.length > 80 ? exp.text : undefined}>
                                    {exp.text || "—"}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td aria-hidden />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          )}

          {projects.length > 0 && !atTableBottom && sortedProjects.length > 8 ? (
            <button
              type="button"
              aria-label="Scroll down"
              onClick={() => tableScrollRef.current?.scrollBy({ top: 320, behavior: "smooth" })}
              className="absolute bottom-3 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-white text-ink shadow-sm transition-colors hover:bg-canvas"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>

        {projects.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-3">
            <span className="cs-helper">
              Showing {projects.length.toLocaleString()} of {total.toLocaleString()}
              {moreError ? <span className="ml-2 text-danger">{moreError}</span> : null}
            </span>
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "View more"}
                <span aria-hidden>→</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <FilterSidebar
        open={filterOpen}
        fields={PROJECT_FILTER_FIELDS}
        title="Filter projects"
        initialGroups={filterGroups}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilterGroups}
        onSaveAsView={saveAsView}
      />
    </div>
  );
}
