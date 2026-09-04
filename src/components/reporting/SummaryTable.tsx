"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

const thClass =
  "sticky top-0 z-10 whitespace-nowrap bg-[#f8f9fb] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink/45";
const tdClass = "whitespace-nowrap px-3 py-2.5 text-sm text-ink/85";

const PAGE_SIZE = 20;

export interface SummaryColumn<T> {
  key: keyof T | string;
  label: string;
}

interface SummaryTableProps<T extends Record<string, string | number>> {
  title: string;
  subtitle?: string;
  columns: SummaryColumn<T>[];
  rows: T[];
  className?: string;
}

export function SummaryTable<T extends Record<string, string | number>>({
  title,
  subtitle,
  columns,
  rows,
  className = "",
}: SummaryTableProps<T>) {
  const [page, setPage] = useState(0);

  const total = rows.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  const rangeEnd = Math.min(start + PAGE_SIZE, total);

  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.08]">
                {columns.map((col) => (
                  <th key={String(col.key)} className={thClass}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr
                  key={start + i}
                  className="border-b border-ink/[0.05] transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={tdClass}
                    >
                      {row[col.key as keyof T] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-ink/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-ink/45">
            Showing {start + 1}–{rangeEnd} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage <= 0}
              className="rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
