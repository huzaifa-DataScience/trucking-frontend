"use client";

/** "Page X of Y · N rows" with Previous / Next under a Billing table. */
export function BillingTablePager({
  page,
  pageSize,
  total,
  noun,
  busy,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Singular; an "s" is added when total ≠ 1. */
  noun: string;
  /** A page is loading: buttons wait so a double click doesn't skip a page. */
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const btn =
    "h-[30px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5">
      <span className="text-[12.5px] text-ink-muted">
        {`Page ${page} of ${totalPages} · ${total.toLocaleString()} ${noun}${total === 1 ? "" : "s"}`}
      </span>
      {totalPages > 1 ? (
        <span className="flex gap-2">
          <button type="button" className={btn} disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          <button type="button" className={btn} disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </span>
      ) : null}
    </div>
  );
}
