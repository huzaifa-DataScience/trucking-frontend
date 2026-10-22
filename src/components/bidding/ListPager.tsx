"use client";

/** "Page X of Y · N items" with Previous / Next, under the Estimation files and Production tables. */
export function ListPager({
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
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const btn =
    "rounded-xl border border-ink/10 bg-surface px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <span className="text-xs text-ink/50">
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
