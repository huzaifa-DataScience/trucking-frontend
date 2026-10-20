"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { LateSubmissionGrid } from "@/components/reporting/LateSubmissionGrid";
import { EfficiencyOutlierGrid } from "@/components/reporting/EfficiencyOutlierGrid";
import { TicketDetailModal } from "@/components/reporting/TicketDetailModal";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useForensic } from "@/hooks/useForensic";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatTiles } from "@/components/reporting/StatTiles";
import { TableSkeleton } from "@/components/ui/Skeleton";

// Default to last 7 days for Efficiency Outlier Report (per spec)
function getDefaultFilters(): FilterConfig {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  return {
    startDate: sevenDaysAgo.toISOString().split("T")[0]!,
    endDate: today.toISOString().split("T")[0]!,
    jobId: "all",
    materialId: "all",
    haulerId: "all",
    truckTypeId: "all",
    direction: "Both",
  };
}

const defaultFilters: FilterConfig = getDefaultFilters();

type TabId = "late" | "efficiency";

const TABS: { id: TabId; label: string }[] = [
  { id: "late", label: "Late submission audit" },
  { id: "efficiency", label: "Efficiency outlier report" },
];

export default function ForensicAuditPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);
  const [tab, setTab] = useState<TabId>("late");

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId ?? undefined);
  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const openTicketDetail = useCallback(
    (ticketNumber: string) => {
      fetchDetail(ticketNumber, companyId ?? undefined);
    },
    [fetchDetail, companyId]
  );

  const {
    lateTicketsFound,
    late,
    lateLoading,
    lateCtl,
    outliers,
    outlierLoading,
    outlierCtl,
    exportLate,
    exportOutliers,
    loading: dataLoading,
    error: dataError,
  } = useForensic({
    companyId: companyId ?? undefined,
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
    <div className="report-dashboard flex min-h-0 min-w-0 flex-1 flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-4">
        {/* Same header as the Job / Material / Hauler dashboards: stat tile beside the title, filters in one row. */}
        <PageHeader
          title="Forensic & audit"
          subtitle="Late submission audit and efficiency outlier analysis for compliance reviews."
          action={
            <StatTiles loading={loading} items={[{ label: "Late tickets found", value: lateTicketsFound.toLocaleString() }]} />
          }
        />
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <ReportFilters
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            showJob
            showMaterial
            showHauler
            showTruckType
            showDirection
            layout="bar"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      )}

      {loading && <TableSkeleton rows={8} toolbar={false} />}

      {!loading && (
        <>
          <div>
            {/* Underline tabs, same as Project financials. */}
            <nav className="flex gap-[22px] border-b border-[var(--border-subtle)]" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative -mb-px cursor-pointer border-b-2 pb-[11px] pt-2 text-sm transition-colors ${
                    tab === t.id
                      ? "border-brand font-semibold text-ink"
                      : "border-transparent font-medium text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <p className="cs-helper mt-3">
              {tab === "late" ? (
                <>
                  Tickets where <strong>Created At</strong> (system time) is more than 24 hours after{" "}
                  <strong>Ticket Date</strong>. Use to identify backdating.
                </>
              ) : (
                <>
                  Grouped by Date + Job + Destination (route). Fleet average loads per truck vs each truck&apos;s actual
                  loads; implied hours and loads per hour.
                </>
              )}
            </p>
          </div>

          {tab === "late" && (
            <>
              {late ? (
                <LateSubmissionGrid
                  data={late}
                  loading={lateLoading}
                  sort={lateCtl.sort}
                  onSort={lateCtl.toggle}
                  onPage={lateCtl.setPage}
                  loadAll={exportLate}
                  onOpenDetail={openTicketDetail}
                />
              ) : null}
              <TicketDetailModal ticket={detailTicket ?? null} onClose={closeDetail} />
            </>
          )}

          {tab === "efficiency" && outliers ? (
            <EfficiencyOutlierGrid
              data={outliers}
              loading={outlierLoading}
              sort={outlierCtl.sort}
              onSort={outlierCtl.toggle}
              onPage={outlierCtl.setPage}
              loadAll={exportOutliers}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
