"use client";

import { paginationRange } from "@/lib/workforce/display";

export function WorkforcePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className = "",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.06] pt-3 ${className}`}
    >
      <p className="text-xs text-ink/45">{paginationRange(page, pageSize, total)}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04] disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-ink/45">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
