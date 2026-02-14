"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { KPICards } from "@/components/reporting/KPICards";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useJobDashboard } from "@/hooks/useJobDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { ApiConnectionTest } from "@/components/reporting/ApiConnectionTest";
import * as jobApi from "@/lib/api/endpoints/job-dashboard";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

export default function JobDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId);

  const {
    kpis,
    vendorTable,
    materialTable,
    tickets,
    totalTickets,
    page,
    pageSize,
    setPage,
    loading: dataLoading,
    error: dataError,
  } = useJobDashboard({
    companyId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    direction: filters.direction,
  });

  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const handleOpenDetail = useCallback(
    (ticketNumber: string) => {
      fetchDetail(ticketNumber, companyId);
    },
    [fetchDetail, companyId]
  );

  const handleExportClick = useCallback(() => {
    const apiFilters = {
      companyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
    };
    jobApi.getJobTicketsExportBlob(apiFilters).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "job-dashboard-tickets.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [companyId, filters.startDate, filters.endDate, filters.jobId, filters.direction]);

  const loading = lookupsLoading || dataLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Job Dashboard
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Supply Chain, Disposal Limits & Compliance.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
        showDirection
      />

      <ApiConnectionTest />

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
              { label: "Flow Balance", value: kpis.flowBalance },
              { label: "Last Active", value: kpis.lastActive },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryTable
              title="Vendor summary"
              subtitle="By company and truck type"
              columns={[
                { key: "companyName", label: "Company Name" },
                { key: "truckType", label: "Truck Type" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={vendorTable}
            />
            <SummaryTable
              title="Material summary"
              subtitle="By material"
              columns={[
                { key: "materialName", label: "Material Name" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={materialTable}
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
