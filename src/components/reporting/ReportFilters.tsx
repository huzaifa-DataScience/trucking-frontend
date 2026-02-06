"use client";

import type { Direction } from "@/lib/types";

export interface FilterConfig {
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  haulerId: string;
  truckTypeId: string;
  direction: Direction;
}

export interface FilterOptions {
  jobs: { value: string; label: string }[];
  materials: { value: string; label: string }[];
  haulers: { value: string; label: string }[];
  truckTypes: { value: string; label: string }[];
}

interface ReportFiltersProps {
  filters: FilterConfig;
  options: FilterOptions;
  onChange: (f: FilterConfig) => void;
  showJob?: boolean;
  showMaterial?: boolean;
  showHauler?: boolean;
  showTruckType?: boolean;
  showDirection?: boolean;
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: "Both", label: "Both" },
  { value: "Import", label: "Import" },
  { value: "Export", label: "Export" },
];

export function ReportFilters({
  filters,
  options,
  onChange,
  showJob = true,
  showMaterial = false,
  showHauler = false,
  showTruckType = false,
  showDirection = true,
}: ReportFiltersProps) {
  const update = (partial: Partial<FilterConfig>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <div className="sticky top-14 z-20 -mx-6 -mt-6 flex flex-wrap items-end gap-4 border-b border-stone-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Start Date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">End Date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        {showJob && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Job</span>
            <select
              value={filters.jobId}
              onChange={(e) => update({ jobId: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              {options.jobs.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showMaterial && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Material</span>
            <select
              value={filters.materialId}
              onChange={(e) => update({ materialId: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              {options.materials.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showHauler && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Hauler</span>
            <select
              value={filters.haulerId}
              onChange={(e) => update({ haulerId: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              {options.haulers.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showTruckType && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Truck Type</span>
            <select
              value={filters.truckTypeId}
              onChange={(e) => update({ truckTypeId: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              {options.truckTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showDirection && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Direction</span>
            <select
              value={filters.direction}
              onChange={(e) => update({ direction: e.target.value as Direction })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              {DIRECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
