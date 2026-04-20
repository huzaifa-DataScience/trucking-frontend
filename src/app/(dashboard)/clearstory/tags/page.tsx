"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ClearstorySwaggerTable } from "@/components/clearstory/ClearstorySwaggerTable";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";

export default function ClearstoryTagsTablePage() {
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const { rows, total, page, pageSize, setPage, setPageSize, totalPages, isLoading, error } = useClearstoryTable(
    "tags",
    { projectId }
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="T&M tags (table)"
        subtitle="Time & materials tags used across projects. Browse and inspect details."
      />

      <ClearstorySwaggerTable
        title="Tags"
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setProjectId(projectIdInput.trim() || undefined);
              }}
            >
              <div>
                <label htmlFor="tags-project-filter" className="mb-1 block text-[10px] font-semibold uppercase text-ink/40">
                  Optional projectId
                </label>
                <input
                  id="tags-project-filter"
                  value={projectIdInput}
                  onChange={(e) => setProjectIdInput(e.target.value)}
                  placeholder="Filter by project"
                  className="w-full min-w-[12rem] rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm sm:w-64"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-ink/90 px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
              >
                Apply
              </button>
              {projectId ? (
                <button
                  type="button"
                  className="text-sm font-medium text-brand hover:text-brand-secondary"
                  onClick={() => {
                    setProjectIdInput("");
                    setProjectId(undefined);
                  }}
                >
                  Clear filter
                </button>
              ) : null}
            </form>
            <Link href="/clearstory/directory" className="text-sm text-ink/45 hover:text-ink">
              Single-tag api-payload lookup → Directory
            </Link>
          </div>
        }
      />
    </div>
  );
}
