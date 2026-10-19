"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { LateSubmissionRow } from "@/lib/types";
import type { ForensicPage } from "@/lib/api/endpoints/forensic";
import type { TableSortState } from "@/hooks/useForensic";
import { SortHeader } from "@/hooks/useTableSort";
import { LoadingBar } from "@/components/ui/LoadingBar";

interface LateSubmissionGridProps {
  /** One page from the server; sorting and paging happen there. */
  data: ForensicPage<LateSubmissionRow>;
  loading?: boolean;
  sort: TableSortState;
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  /** Every row (not just this page) for the Excel file. */
  loadAll: () => Promise<LateSubmissionRow[]>;
  /** Row click opens ticket detail modal (GET /tickets/detail/:ticketNumber). */
  onOpenDetail?: (ticketNumber: string) => void;
}

export function LateSubmissionGrid({ data, loading, sort, onSort, onPage, loadAll, onOpenDetail }: LateSubmissionGridProps) {
  const total = data.total;
  const page = data.page - 1;
  const totalPages = Math.ceil(total / data.pageSize) || 1;
  const pageRows = data.items;
  const [exporting, setExporting] = useState(false);
  const header = (key: string, label: ReactNode) => (
    <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => onSort(key)} />
  );

  const exportExcel = useCallback(() => {
    setExporting(true);
    Promise.all([loadAll(), import("xlsx")])
      .then(([rows, XLSX]) => {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Late Submission");
        XLSX.writeFile(wb, "late-submission-audit.xlsx");
      })
      .finally(() => setExporting(false));
  }, [loadAll]);

  return (
    <div className="relative min-w-0 rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      {loading ? <LoadingBar label="Loading late submissions" /> : null}
      <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-stone-800">
        <span className="block min-w-0 flex-1 truncate text-sm font-medium text-stone-700 dark:text-stone-300">
          Late submissions ({total} rows)
        </span>
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting}
          className="w-full shrink-0 rounded-lg bg-brand/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-60 sm:w-auto"
        >
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0 table-scroll">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
              <Th>{header("ticket", "Ticket Number")}</Th>
              <Th>{header("ticketDate", "Ticket Date")}</Th>
              <Th>{header("entryDate", "System Entry Date")}</Th>
              <Th>{header("lag", "Lag Time")}</Th>
              <Th>{header("signedBy", "Signed By")}</Th>
              <Th>{header("jobName", "Job Name")}</Th>
              <Th>{header("hauler", "Hauler Name")}</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={`${row.ticketNumber}-${i}`}
                className={`border-b border-stone-100 dark:border-stone-800 ${
                  onOpenDetail ? "cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50" : ""
                }`}
                onClick={onOpenDetail ? () => onOpenDetail(row.ticketNumber) : undefined}
                role={onOpenDetail ? "button" : undefined}
              >
                <Td>
                  {onOpenDetail ? (
                    <button
                      type="button"
                      className="font-medium text-brand hover:underline dark:text-brand"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(row.ticketNumber);
                      }}
                    >
                      {row.ticketNumber}
                    </button>
                  ) : (
                    row.ticketNumber
                  )}
                </Td>
                <Td>{row.ticketDate}</Td>
                <Td>{row.systemEntryDate}</Td>
                <Td className="text-red-600 dark:text-red-400">{row.lagTime}</Td>
                <Td>{row.signedBy}</Td>
                <Td>{row.jobName}</Td>
                <Td>{row.haulerCompanyName}</Td>
              </tr>
            ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-stone-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-stone-800">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Page {page + 1} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPage(Math.max(1, page))}
            disabled={page === 0 || loading}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPage(Math.min(totalPages, page + 2))}
            disabled={page >= totalPages - 1 || loading}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-2 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 sm:px-3">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-2 py-2 text-stone-800 dark:text-stone-200 sm:px-3 ${className ?? ""}`}>
      {children}
    </td>
  );
}
