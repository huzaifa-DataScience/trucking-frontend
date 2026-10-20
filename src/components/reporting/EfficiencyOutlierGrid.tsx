"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { EfficiencyOutlierRow } from "@/lib/types";
import type { ForensicPage } from "@/lib/api/endpoints/forensic";
import type { TableSortState } from "@/hooks/useForensic";
import { SortHeader } from "@/hooks/useTableSort";
import { LoadingBar } from "@/components/ui/LoadingBar";

interface EfficiencyOutlierGridProps {
  /** One page from the server; sorting and paging happen there. */
  data: ForensicPage<EfficiencyOutlierRow>;
  loading?: boolean;
  sort: TableSortState;
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  /** Every row (not just this page) for the Excel file. */
  loadAll: () => Promise<EfficiencyOutlierRow[]>;
}

export function EfficiencyOutlierGrid({ data, loading, sort, onSort, onPage, loadAll }: EfficiencyOutlierGridProps) {
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
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Date: r.date,
          "Job Name": r.jobName,
          Route: r.route,
          "Truck Number": r.truckNumber,
          "Hauler Name": r.haulerName,
          "Total Tickets": r.totalTickets,
          "Work Duration": r.workDuration,
          "My Avg Cycle (min)": r.myAvgCycle,
          "Fleet Benchmark (min)": r.fleetBenchmark,
          Status: r.statusLabel,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Efficiency Outlier");
      XLSX.writeFile(wb, "efficiency-outlier-report.xlsx");
      })
      .finally(() => setExporting(false));
  }, [loadAll]);

  return (
    <div className="relative min-w-0 rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      {loading ? <LoadingBar label="Loading efficiency outliers" /> : null}
      <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-stone-800">
        <span className="block min-w-0 flex-1 truncate text-sm font-medium text-stone-700 dark:text-stone-300">
          By Date + Job + Destination (Route); compare truck vs fleet average ({total} rows)
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
              <Th>{header("date", "Date")}</Th>
              <Th>{header("jobName", "Job Name")}</Th>
              <Th>{header("route", "Route")}</Th>
              <Th>{header("truck", "Truck Number")}</Th>
              <Th>{header("hauler", "Hauler Name")}</Th>
              <Th>{header("tickets", "Total Tickets")}</Th>
              <Th>{header("duration", "Work Duration")}</Th>
              <Th>{header("avgCycle", "My Avg Cycle")}</Th>
              <Th>{header("benchmark", "Fleet Benchmark")}</Th>
              <Th>{header("status", "Status")}</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const statusClass =
                row.status === "RED"
                  ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                  : row.status === "Single Load"
                    ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                    : "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-200";

              return (
                <tr
                  key={`${row.date}-${row.truckNumber}-${row.route}-${i}`}
                  className={`border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50 ${
                    row.status === "RED" ? "bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                >
                  <Td>{row.date}</Td>
                  <Td>{row.jobName}</Td>
                  <Td>{row.route}</Td>
                  <Td>{row.truckNumber}</Td>
                  <Td>{row.haulerName || "—"}</Td>
                  <Td>{row.totalTickets}</Td>
                  <Td>{row.workDuration}</Td>
                  <Td>{row.myAvgCycle} min</Td>
                  <Td>{row.fleetBenchmark} min</Td>
                  <Td>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass}`}>
                      {row.statusLabel}
                    </span>
                  </Td>
                </tr>
              );
            })}
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

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="whitespace-nowrap px-2 py-2 text-stone-800 dark:text-stone-200 sm:px-3">
      {children}
    </td>
  );
}
