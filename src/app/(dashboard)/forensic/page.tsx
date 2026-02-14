"use client";

import { useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { LateSubmissionGrid } from "@/components/reporting/LateSubmissionGrid";
import { EfficiencyOutlierGrid } from "@/components/reporting/EfficiencyOutlierGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useForensic } from "@/hooks/useForensic";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

type TabId = "late" | "efficiency";

export default function ForensicAuditPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);
  const [tab, setTab] = useState<TabId>("late");

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId);

  const { lateRows, efficiencyRows, loading: dataLoading, error: dataError } = useForensic({
    companyId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    haulerId: filters.haulerId,
    truckTypeId: filters.truckTypeId,
    direction: filters.direction,
  });

  const loading = lookupsLoading || dataLoading;
  const error = lookupsError ?? dataError;

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {!loading && (
        <>
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
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Late Tickets Found</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                    {lateRows.length}
                  </p>
                </div>
              </div>
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
        </>
      )}
    </div>
  );
}
