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
  /** Our internal company (Ref_OurEntities). "all" / undefined means no company filter. */
  entityId?: string;
}

export interface FilterOptions {
  jobs: { value: string; label: string }[];
  materials: { value: string; label: string }[];
  haulers: { value: string; label: string }[];
  truckTypes: { value: string; label: string }[];
  ourEntities: { value: string; label: string }[];
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
  /** Show the "Our company" filter (Ref_OurEntities). */
  showOurCompany?: boolean;
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: "Both", label: "Both" },
  { value: "Import", label: "Import" },
  { value: "Export", label: "Export" },
];

const fieldClass =
  "min-h-11 w-full min-w-0 max-w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const selectClass =
  "min-h-11 w-full min-w-0 max-w-full appearance-none rounded-xl border border-ink/10 bg-surface py-2 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "text-xs font-medium text-ink/45";

function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ReportFilters({
  filters,
  options,
  onChange,
  showJob = true,
  showMaterial = false,
  showHauler = false,
  showTruckType = false,
  showDirection = true,
  showOurCompany = false,
}: ReportFiltersProps) {
  const update = (partial: Partial<FilterConfig>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <section className="w-full rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.06)] sm:p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40 sm:mb-4">
        Filters
      </h2>
      <div className="grid grid-cols-1 items-end gap-x-4 gap-y-3 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={labelClass}>Start date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={labelClass}>End date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            className={fieldClass}
          />
        </label>
        {showJob && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Job</span>
            <div className="relative">
              <select
                value={filters.jobId}
                onChange={(e) => update({ jobId: e.target.value })}
                className={selectClass}
              >
                <option value="all">All</option>
                {options.jobs.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
        {showMaterial && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Material</span>
            <div className="relative">
              <select
                value={filters.materialId}
                onChange={(e) => update({ materialId: e.target.value })}
                className={selectClass}
              >
                <option value="all">All</option>
                {options.materials.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
        {showHauler && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Hauler</span>
            <div className="relative">
              <select
                value={filters.haulerId}
                onChange={(e) => update({ haulerId: e.target.value })}
                className={selectClass}
              >
                <option value="all">All</option>
                {options.haulers.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
        {showTruckType && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Truck type</span>
            <div className="relative">
              <select
                value={filters.truckTypeId}
                onChange={(e) => update({ truckTypeId: e.target.value })}
                className={selectClass}
              >
                <option value="all">All</option>
                {options.truckTypes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
        {showDirection && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Direction</span>
            <div className="relative">
              <select
                value={filters.direction}
                onChange={(e) => update({ direction: e.target.value as Direction })}
                className={selectClass}
              >
                {DIRECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
        {showOurCompany && (
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>Our company</span>
            <div className="relative">
              <select
                value={filters.entityId ?? "all"}
                onChange={(e) =>
                  update({ entityId: e.target.value === "all" ? undefined : e.target.value })
                }
                className={selectClass}
              >
                {options.ourEntities.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        )}
      </div>
    </section>
  );
}
