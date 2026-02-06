"use client";

import { useState, useCallback } from "react";
import type { EfficiencyOutlierRow } from "@/lib/types";

const ROWS_PER_PAGE = 50;

interface EfficiencyOutlierGridProps {
  rows: EfficiencyOutlierRow[];
}

export function EfficiencyOutlierGrid({ rows }: EfficiencyOutlierGridProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE) || 1;
  const start = page * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

  const exportExcel = useCallback(() => {
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Date: r.date,
          "Job Name": r.jobName,
          Route: r.route,
          "Truck Number": r.truckNumber,
          "Fleet Avg Loads": r.fleetAvgLoads,
          "This Truck Loads": r.thisTruckLoads,
          "First Ticket Time": r.firstTicketTime,
          "Last Ticket Time": r.lastTicketTime,
          "Implied Hours": r.impliedHours,
          "Loads Per Hour": r.loadsPerHour,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Efficiency Outlier");
      XLSX.writeFile(wb, "efficiency-outlier-report.xlsx");
    });
  }, [rows]);

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          By Date + Job + Destination (Route); compare truck vs fleet average ({rows.length} rows)
        </span>
        <button
          type="button"
          onClick={exportExcel}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
        >
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
              <Th>Date</Th>
              <Th>Job Name / Route</Th>
              <Th>Truck Number</Th>
              <Th>Fleet Avg Loads</Th>
              <Th>This Truck&apos;s Loads</Th>
              <Th>First Ticket Time</Th>
              <Th>Last Ticket Time</Th>
              <Th>Implied Hours</Th>
              <Th>Loads Per Hour</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={`${row.date}-${row.truckNumber}-${row.route}-${i}`}
                className="border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50"
              >
                <Td>{row.date}</Td>
                <Td>{row.route}</Td>
                <Td>{row.truckNumber}</Td>
                <Td>{row.fleetAvgLoads}</Td>
                <Td>{row.thisTruckLoads}</Td>
                <Td>{row.firstTicketTime}</Td>
                <Td>{row.lastTicketTime}</Td>
                <Td>{row.impliedHours} Hrs</Td>
                <Td>{row.loadsPerHour}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-stone-200/80 px-4 py-3 dark:border-stone-800">
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
    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-stone-600 dark:text-stone-400">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-stone-800 dark:text-stone-200">
      {children}
    </td>
  );
}
