"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LinkPending } from "@/components/ui/LinkPending";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { ClearstorySwaggerTable, type SortState } from "@/components/clearstory/ClearstorySwaggerTable";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";

export default function ClearstoryCorTablePage() {
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  // Filter once typing pauses (same debounce as the Projects search) so partial IDs don't each hit the API.
  useEffect(() => {
    const t = setTimeout(() => setProjectId(projectIdInput.trim() || undefined), 320);
    return () => clearTimeout(t);
  }, [projectIdInput]);

  // Column sort runs on the server across every COR (a new sort goes back to page 1).
  const [sort, setSort] = useState<SortState>(null);
  const { rows, total, page, pageSize, setPage, setPageSize, isLoading, error, refetch, sortedOnServer, sortableKeys } =
    useClearstoryTable("cors", { projectId, sort: sort?.key, sortDir: sort?.dir });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 ui-animate-in [--radius:10px] [--radius-md:8px]">
      {/* Slight indent for the page heading. */}
      <div className="pl-2">
      <PageHeader
        title="Change Orders"
        subtitle="Browse change orders from Clearstory"
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            aria-busy={isLoading}
            title="Reload change orders"
            className={buttonClasses("secondary")}
          >
            {isLoading ? (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />
      </div>

      <ClearstorySwaggerTable
        variant="panel"
        title="All change orders"
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
        serverSort={{ sort, onSortChange: setSort, sortableKeys, applied: sortedOnServer }}
        headerAside={
          <Link
            href="/clearstory/projects"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-white pl-2.5 pr-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-[#b9d8f6] hover:bg-brand-tint hover:text-brand-secondary"
          >
            <svg className="h-3.5 w-3.5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />
            </svg>
            <LinkPending
              icon={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              View projects
            </LinkPending>
          </Link>
        }
        footer={
          <form
            className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setProjectId(projectIdInput.trim() || undefined);
            }}
          >
            <div className="relative w-full min-w-0 sm:w-80">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <label htmlFor="cor-project-filter" className="sr-only">
                Filter by Clearstory project id
              </label>
              <input
                id="cor-project-filter"
                type="search"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="Filter by project ID…"
                autoComplete="off"
                className="cs-field w-full pl-9 pr-3"
              />
            </div>
            {projectId ? (
              <button
                type="button"
                className="text-[13px] font-medium text-brand hover:underline"
                onClick={() => {
                  setProjectIdInput("");
                  setProjectId(undefined);
                }}
              >
                Clear
              </button>
            ) : null}
          </form>
        }
      />
    </div>
  );
}
