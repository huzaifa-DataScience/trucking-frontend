"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ClearstorySwaggerTable } from "@/components/clearstory/ClearstorySwaggerTable";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";

export default function ClearstoryCorTablePage() {
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const { rows, total, page, pageSize, setPage, setPageSize, isLoading, error } = useClearstoryTable(
    "cors",
    { projectId }
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="COR (table)"
        subtitle="Change Order Requests (COR). Browse the register and open details as needed."
      />

      <ClearstorySwaggerTable
        title="Change orders"
        subtitle="Meta columns first; remaining columns from swagger keys on this page (alphabetical, capped)."
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
        footer={
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setProjectId(projectIdInput.trim() || undefined);
            }}
          >
            <div>
              <label htmlFor="cor-project-filter" className="mb-1 block text-[10px] font-semibold uppercase text-ink/40">
                Optional projectId
              </label>
              <input
                id="cor-project-filter"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="Filter by Clearstory project id"
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
            <Link href="/clearstory/projects" className="text-sm text-ink/45 hover:text-ink">
              Open project hub →
            </Link>
          </form>
        }
      />
    </div>
  );
}
