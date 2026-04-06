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
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import * as materialApi from "@/lib/api/endpoints/material-dashboard";

function createDefaultFilters(): FilterConfig {
  // Use local machine date for default end date
  const today = new Date().toISOString().split("T")[0]!;
  return {
    startDate: "2025-01-01",
    endDate: today,
    jobId: "all",
    materialId: "all",
    haulerId: "all",
    
    truckTypeId: "all",
    direction: "Both",
  };
}

export default function MaterialDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(() => createDefaultFilters());

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId ?? undefined);

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
    companyId: companyId ?? undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    direction: filters.direction,
    // Global Our company filter from the top Company selector.
    entityId: companyId ?? undefined,
  });

  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const handleOpenDetail = useCallback(
    (ticketNumber: string) => fetchDetail(ticketNumber, companyId ?? undefined),
    [fetchDetail, companyId]
  );

  const handleExportClick = useCallback(() => {
    const apiFilters = {
      companyId: companyId ?? undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      materialId: filters.materialId === "all" ? undefined : filters.materialId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
      entityId: companyId ?? undefined,
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
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <PageHeader
        title="Material Dashboard"
        subtitle="Billing reconciliation, sources and destinations, and ticket-level audit."
      />

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
        showMaterial
        showDirection
      />

      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LogoLoader size={32} />
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
            companyId={companyId ?? undefined}
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
