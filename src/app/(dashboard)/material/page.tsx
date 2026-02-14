"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { KPICards } from "@/components/reporting/KPICards";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useMaterialDashboard } from "@/hooks/useMaterialDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import * as materialApi from "@/lib/api/endpoints/material-dashboard";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

export default function MaterialDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId);

  const {
    kpis,
    sitesTable,
    jobsTable,
    tickets,
    totalTickets,
    page,
    pageSize,
    setPage,
    loading: dataLoading,
    error: dataError,
  } = useMaterialDashboard({
    companyId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    direction: filters.direction,
  });

  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const handleOpenDetail = useCallback(
    (ticketNumber: string) => fetchDetail(ticketNumber, companyId),
    [fetchDetail, companyId]
  );

  const handleExportClick = useCallback(() => {
    const apiFilters = {
      companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
    };
    materialApi.getMaterialTicketsExportBlob(apiFilters).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "material-dashboard-tickets.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [companyId, filters.startDate, filters.endDate, filters.jobId, filters.materialId, filters.direction]);

  const loading = lookupsLoading || dataLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Material Dashboard
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Billing Reconciliation & Audit.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
        showMaterial
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
          <KPICards
            items={[
              { label: "Total Tickets", value: kpis.totalTickets },
              { label: "Top Source", value: kpis.topSource },
              { label: "Top Destination", value: kpis.topDestination },
              { label: "Active Jobs", value: kpis.activeJobs },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryTable
              title="Sites summary"
              subtitle="External site by direction"
              columns={[
                { key: "externalSiteName", label: "External Site Name" },
                { key: "direction", label: "Direction" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={sitesTable}
            />
            <SummaryTable
              title="Jobs summary"
              subtitle="Job by direction"
              columns={[
                { key: "jobName", label: "Job Name" },
                { key: "direction", label: "Direction" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={jobsTable}
            />
          </div>

          <TicketGrid
            tickets={tickets}
            total={totalTickets}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            companyId={companyId}
            onOpenDetail={handleOpenDetail}
            detailTicket={detailTicket}
            onCloseDetail={closeDetail}
            onExportClick={handleExportClick}
          />
        </>
      )}
    </div>
  );
}
