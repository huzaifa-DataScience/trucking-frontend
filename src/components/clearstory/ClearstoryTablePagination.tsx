"use client";

import { useEffect, useMemo, useState } from "react";

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

  const dedup: (number | "…")[] = [];
  for (const x of fixed) {
    if (dedup.length && dedup[dedup.length - 1] === x) continue;
    dedup.push(x);
  }
  return dedup;
}

export function ClearstoryTablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  ariaLabel = "Table pages",
  idPrefix = "cs-pagination",
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  pageSizeOptions?: number[];
  ariaLabel?: string;
  /** Prefix for stable ids when multiple paginations exist on one screen. */
  idPrefix?: string;
}) {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  return (
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
        <label htmlFor={`${idPrefix}-page-size`} className="sr-only">
          Page size
        </label>
        <select
          id={`${idPrefix}-page-size`}
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>

        <nav className="flex items-center gap-1" aria-label={ariaLabel}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            First
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
                onClick={() => onPageChange(it)}
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
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
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
            onPageChange(clampInt(Math.trunc(n), 1, totalPages));
          }}
        >
          <label htmlFor={`${idPrefix}-page-input`} className="text-sm font-semibold text-ink/55">
            Go to
          </label>
          <input
            id={`${idPrefix}-page-input`}
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
            className="w-20 rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
          />
        </form>
      </div>
    </div>
  );
}
