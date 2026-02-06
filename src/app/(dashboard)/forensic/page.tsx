"use client";

import { useMemo, useState } from "react";
import { filterTickets, getLateSubmissionRows, getEfficiencyOutlierRows } from "@/lib/mock-data";
import { useCompany } from "@/contexts/CompanyContext";
import { ReportFilters, type FilterConfig, type FilterOptions } from "@/components/reporting/ReportFilters";
import { LateSubmissionGrid } from "@/components/reporting/LateSubmissionGrid";
import { EfficiencyOutlierGrid } from "@/components/reporting/EfficiencyOutlierGrid";
import { JOBS, MATERIALS, HAULERS, TRUCK_TYPES } from "@/lib/mock-data";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

const filterOptions: FilterOptions = {
  jobs: [{ value: "all", label: "All" }, ...JOBS.map((j) => ({ value: j, label: j }))],
  materials: [{ value: "all", label: "All" }, ...MATERIALS.map((m) => ({ value: m, label: m }))],
  haulers: [{ value: "all", label: "All" }, ...HAULERS.map((h) => ({ value: h, label: h }))],
  truckTypes: [{ value: "all", label: "All" }, ...TRUCK_TYPES.map((t) => ({ value: t, label: t }))],
};

type TabId = "late" | "efficiency";

export default function ForensicAuditPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);
  const [tab, setTab] = useState<TabId>("late");

  const tickets = useMemo(
    () =>
      filterTickets({
        companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        jobId: filters.jobId,
        materialId: filters.materialId,
        haulerId: filters.haulerId,
        truckTypeId: filters.truckTypeId,
        direction: filters.direction,
      }),
    [companyId, filters]
  );

  const lateRows = useMemo(() => getLateSubmissionRows(tickets), [tickets]);
  const efficiencyRows = useMemo(() => getEfficiencyOutlierRows(tickets), [tickets]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Forensic & Audit Tools
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Late submission audit and efficiency outlier analysis.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
        showMaterial
        showHauler
        showTruckType
        showDirection
      />

      <div className="border-b border-stone-200 dark:border-stone-800">
        <nav className="flex gap-4">
          <button
            type="button"
            onClick={() => setTab("late")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "late"
                ? "border-amber-500 text-amber-700 dark:text-amber-400"
                : "border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
            }`}
          >
            Tab 1: Late Submission Audit
          </button>
          <button
            type="button"
            onClick={() => setTab("efficiency")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "efficiency"
                ? "border-amber-500 text-amber-700 dark:text-amber-400"
                : "border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
            }`}
          >
            Tab 2: Efficiency Outlier Report
          </button>
        </nav>
      </div>

      {tab === "late" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Tickets where <strong>Created At</strong> (system time) is more than 24 hours after{" "}
            <strong>Ticket Date</strong>. Use to identify backdating.
          </p>
          <LateSubmissionGrid rows={lateRows} />
        </div>
      )}

      {tab === "efficiency" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Grouped by Date + Job + Destination (route). Fleet average loads per truck vs each
            truck&apos;s actual loads; implied hours and loads per hour.
          </p>
          <EfficiencyOutlierGrid rows={efficiencyRows} />
        </div>
      )}
    </div>
  );
}
