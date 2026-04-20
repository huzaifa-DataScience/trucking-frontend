"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
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

// Match COR tables: the table scrolls (X+Y) inside a bounded region.
const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pageItems(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const first = 1;
  const last = totalPages;
  const start = clampInt(current - 1, 2, totalPages - 1);
  const end = clampInt(current + 1, 2, totalPages - 1);

  const out: (number | "…")[] = [first];

  if (start > 2) out.push("…");
  else if (start === 2) out.push(2);

  for (let p = start; p <= end; p++) out.push(p);

  if (end < totalPages - 1) out.push("…");
  else if (end === totalPages - 1) out.push(totalPages - 1);

  out.push(last);

  // Avoid ellipsis for a single hidden page (Primer-style behavior).
  const fixed: (number | "…")[] = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[i];
    const b = out[i + 1];
    const c = out[i + 2];
    if (typeof a === "number" && b === "…" && typeof c === "number" && c === a + 2) {
      fixed.push(a, a + 1);
      i += 1;
      continue;
    }
    fixed.push(a);
  }

  // De-dupe neighbors.
  const dedup: (number | "…")[] = [];
  for (const x of fixed) {
    if (dedup.length && dedup[dedup.length - 1] === x) continue;
    dedup.push(x);
  }
  return dedup;
}

function formatProjectDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
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
  const [pageInput, setPageInput] = useState("1");
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

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const projects = (data && "projects" in data ? data.projects : []) ?? [];
  const total = data && "total" in data ? data.total : projects.length;
  const totalPages = data && "total" in data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const dataAsOf = useMemo(() => formatDataAsOf(newestUpdatedAt(projects)), [projects]);
  const columnKeys = useMemo(() => collectProjectColumnKeys(projects), [projects]);

  // If backend clamps/normalizes pagination values, mirror them in UI state.
  useEffect(() => {
    if (!data) return;
    if (!("page" in data) || !("pageSize" in data) || !("total" in data)) return;
    if (typeof data.page === "number" && data.page !== page) setPage(data.page);
    if (typeof data.pageSize === "number" && data.pageSize !== pageSize) setPageSize(data.pageSize);
    // If page becomes out of range after search/pageSize change, snap back.
    const pages = Math.max(1, Math.ceil(data.total / (data.pageSize || pageSize || 50)));
    if (data.page > pages) setPage(pages);
  }, [data, page, pageSize]);

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
    const m = statusData.message;
    if (typeof m === "string" && m.trim()) return m;
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
            <div className="flex flex-1 items-center justify-center py-16">
              <LogoLoader size={32} />
            </div>
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
              <div className={`${TABLE_SCROLL} rounded-xl border border-ink/[0.1] bg-[#fafbfc] shadow-inner`}>
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <caption className="sr-only">Clearstory projects</caption>
                  <thead>
                    <tr className="sticky top-0 z-[1] border-b border-ink/[0.1] bg-[#f0f2f5]">
                      {columnKeys.map((k) => (
                        <th
                          key={k}
                          scope="col"
                          className="whitespace-nowrap px-3 py-3 text-xs font-semibold tracking-wide text-ink/60"
                        >
                          {humanizeColumnKey(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const base = normalizeMoney(p.baseContractValue);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-ink/[0.06] align-top transition hover:bg-brand/[0.03] odd:bg-white even:bg-ink/[0.015]"
                        >
                          {columnKeys.map((k) => {
                            const raw = (p as Record<string, unknown>)[k];
                            // Special-case baseContractValue to use USD formatting when possible.
                            if (k === "baseContractValue") {
                              return (
                                <td key={k} className="max-w-[16rem] px-3 py-2.5 text-sm text-ink/90 tabular-nums">
                                  {formatUsdWhole(base)}
                                </td>
                              );
                            }

                            const exp = expandCellForModal(raw);
                            return (
                              <td key={k} className="max-w-[18rem] px-3 py-2.5 text-sm text-ink/90">
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

              <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-ink/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink/55">
                  <span className="text-ink/40">Total</span>{" "}
                  <strong className="font-semibold text-ink">{total.toLocaleString()}</strong>
                  <span className="mx-2 text-ink/25">·</span>
                  <span className="text-ink/40">Page</span>{" "}
                  <strong className="font-semibold text-ink">
                    {page} of {totalPages}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="cs-projects-page-size" className="sr-only">
                    Page size
                  </label>
                  <select
                    id="cs-projects-page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm"
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>

                  <nav className="flex items-center gap-1" aria-label="Project pages">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>

                    {pageItems(page, totalPages).map((it, idx) =>
                      it === "…" ? (
                        <span key={`e-${idx}`} className="px-2 text-sm font-semibold text-ink/35">
                          …
                        </span>
                      ) : (
                        <button
                          key={it}
                          type="button"
                          onClick={() => setPage(it)}
                          aria-current={it === page ? "page" : undefined}
                          className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                            it === page
                              ? "border-brand/25 bg-brand/15 text-brand"
                              : "border-ink/12 bg-white text-ink/70 hover:bg-ink/[0.03]"
                          }`}
                        >
                          {it}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(totalPages)}
                      className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Last
                    </button>
                  </nav>

                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Number(pageInput);
                      if (!Number.isFinite(n)) return;
                      setPage(clampInt(Math.trunc(n), 1, totalPages));
                    }}
                  >
                    <label htmlFor="cs-projects-page-input" className="text-sm font-semibold text-ink/55">
                      Go to
                    </label>
                    <input
                      id="cs-projects-page-input"
                      inputMode="numeric"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
                      className="w-20 rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                    />
                  </form>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
