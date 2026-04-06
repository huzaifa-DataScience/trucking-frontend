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
  "rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "text-xs font-medium text-ink/45";

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
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
        Filters
      </h2>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Start date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>End date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            className={fieldClass}
          />
        </label>
        {showJob && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Job</span>
            <select
              value={filters.jobId}
              onChange={(e) => update({ jobId: e.target.value })}
              className={fieldClass}
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Material</span>
            <select
              value={filters.materialId}
              onChange={(e) => update({ materialId: e.target.value })}
              className={fieldClass}
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Hauler</span>
            <select
              value={filters.haulerId}
              onChange={(e) => update({ haulerId: e.target.value })}
              className={fieldClass}
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Truck type</span>
            <select
              value={filters.truckTypeId}
              onChange={(e) => update({ truckTypeId: e.target.value })}
              className={fieldClass}
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Direction</span>
            <select
              value={filters.direction}
              onChange={(e) => update({ direction: e.target.value as Direction })}
              className={fieldClass}
            >
              {DIRECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {showOurCompany && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Our company</span>
            <select
              value={filters.entityId ?? "all"}
              onChange={(e) =>
                update({ entityId: e.target.value === "all" ? undefined : e.target.value })
              }
              className={fieldClass}
            >
              {options.ourEntities.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}
