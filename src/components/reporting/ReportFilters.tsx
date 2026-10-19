"use client";

import type { ReactNode } from "react";
import type { Direction } from "@/lib/types";
import { DatePicker } from "@/components/ui/DatePicker";

import { SortedOptions } from "@/components/ui/SortedOptions";
export interface FilterConfig {
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  haulerId: string;
  truckTypeId: string;
  direction: Direction;
  /** Our office (Ref_OurEntities). "all" / undefined means no office filter. */
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
  /** Show the Office filter (Ref_OurEntities — GOEL / GOEL DC / DCB). */
  showOurCompany?: boolean;
  /** "bar": one compact row without the card (Job dashboard). Default "card". */
  layout?: "card" | "bar";
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: "Both", label: "Both" },
  { value: "Import", label: "Import" },
  { value: "Export", label: "Export" },
];

const cardSelectClass =
  "min-h-11 w-full min-w-0 max-w-full appearance-none rounded-xl border border-ink/10 bg-surface py-2 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const barSelectClass =
  "h-9 w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-lg border border-ink/10 bg-surface pl-3 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "text-xs font-medium text-ink/45";

function SelectChevron() {
  return (
    <span
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
      aria-hidden
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
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
  layout = "card",
}: ReportFiltersProps) {
  const update = (partial: Partial<FilterConfig>) => {
    onChange({ ...filters, ...partial });
  };
  const bar = layout === "bar";
  const selectClass = bar ? barSelectClass : cardSelectClass;
  const dateClass = bar
    ? "h-9 w-full min-w-0 max-w-full rounded-lg border border-ink/10 bg-surface px-2.5 text-sm"
    : "min-h-11 w-full min-w-0 max-w-full rounded-xl px-3 py-2 text-sm";

  // Bar layout gives each field a fixed width so the row reads left to right; the card keeps its 2-column grid.
  const field = (label: string, width: string, children: ReactNode) => (
    <label className={`flex min-w-0 flex-col gap-1.5 ${bar ? width : ""}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );

  const select = (
    value: string,
    onSelect: (v: string) => void,
    items: { value: string; label: string }[],
    withAll = true,
  ) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className={selectClass}
      >
        <SortedOptions>
          {withAll ? <option value="all">All</option> : null}
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SortedOptions>
      </select>
      <SelectChevron />
    </div>
  );

  const fields = (
    <>
      {field(
        "Start date",
        "w-[150px]",
        <DatePicker
          ariaLabel="Start date"
          value={filters.startDate}
          onChange={(v) => update({ startDate: v })}
          className={dateClass}
        />,
      )}
      {field(
        "End date",
        "w-[150px]",
        <DatePicker
          ariaLabel="End date"
          value={filters.endDate}
          onChange={(v) => update({ endDate: v })}
          className={dateClass}
        />,
      )}
      {showJob
        ? field(
            "Job",
            "w-[220px]",
            select(filters.jobId, (v) => update({ jobId: v }), options.jobs),
          )
        : null}
      {showMaterial
        ? field(
            "Material",
            "w-[220px]",
            select(
              filters.materialId,
              (v) => update({ materialId: v }),
              options.materials,
            ),
          )
        : null}
      {showHauler
        ? field(
            "Hauler",
            "w-[220px]",
            select(
              filters.haulerId,
              (v) => update({ haulerId: v }),
              options.haulers,
            ),
          )
        : null}
      {showTruckType
        ? field(
            "Truck type",
            "w-[180px]",
            select(
              filters.truckTypeId,
              (v) => update({ truckTypeId: v }),
              options.truckTypes,
            ),
          )
        : null}
      {showDirection ? (
        bar ? (
          // Three choices — a switch instead of a dropdown, pinned to the right end of the row.
          <div className="ml-auto flex flex-col gap-1.5">
            <span className={labelClass}>Direction</span>
            <div
              className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-ink/10 bg-white p-[3px]"
              role="group"
              aria-label="Direction"
            >
              {DIRECTION_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={filters.direction === o.value}
                  onClick={() => update({ direction: o.value })}
                  className={`h-7 cursor-pointer rounded-md px-3 text-[13px] transition-colors ${
                    filters.direction === o.value
                      ? "bg-brand-tint font-semibold text-brand-secondary"
                      : "font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          field(
            "Direction",
            "",
            select(
              filters.direction,
              (v) => update({ direction: v as Direction }),
              DIRECTION_OPTIONS,
              false,
            ),
          )
        )
      ) : null}
      {showOurCompany
        ? field(
            "Office",
            "w-[200px]",
            select(
              filters.entityId ?? "all",
              (v) => update({ entityId: v === "all" ? undefined : v }),
              options.ourEntities,
              false,
            ),
          )
        : null}
    </>
  );

  if (bar)
    return <div className="flex flex-wrap items-end gap-3">{fields}</div>;

  return (
    <section className="w-full rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.06)] sm:p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40 sm:mb-4">
        Filters
      </h2>
      <div className="grid grid-cols-1 items-end gap-x-4 gap-y-3 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4">
        {fields}
      </div>
    </section>
  );
}
