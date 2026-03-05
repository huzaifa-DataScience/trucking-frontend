"use client";

import { useState, useCallback } from "react";
import type { LateSubmissionRow } from "@/lib/types";

const ROWS_PER_PAGE = 50;

interface LateSubmissionGridProps {
  rows: LateSubmissionRow[];
  /** Row click opens ticket detail modal (GET /tickets/detail/:ticketNumber). */
  onOpenDetail?: (ticketNumber: string) => void;
}

export function LateSubmissionGrid({ rows, onOpenDetail }: LateSubmissionGridProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE) || 1;
  const start = page * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

  const exportExcel = useCallback(() => {
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Late Submission");
      XLSX.writeFile(wb, "late-submission-audit.xlsx");
    });
  }, [rows]);

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      <div className="flex flex-col gap-3 border-b border-stone-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-stone-800">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Tickets where Created At is &gt; 24 hours after Ticket Date ({rows.length} rows)
        </span>
        <button
          type="button"
          onClick={exportExcel}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 sm:w-auto"
        >
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
              <Th>Ticket Number</Th>
              <Th>Ticket Date</Th>
              <Th>System Entry Date</Th>
              <Th>Lag Time</Th>
              <Th>Signed By</Th>
              <Th>Job Name</Th>
              <Th>Hauler Name</Th>
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
                      className="font-medium text-amber-600 hover:underline dark:text-amber-400"
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
            Page {page + 1} of {totalPages} ({rows.length} total)
          </span>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-2 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 sm:px-3">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-2 py-2 text-stone-800 dark:text-stone-200 sm:px-3 ${className ?? ""}`}>
      {children}
    </td>
  );
}
