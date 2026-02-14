"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { KPICards } from "@/components/reporting/KPICards";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useHaulerDashboard } from "@/hooks/useHaulerDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import * as haulerApi from "@/lib/api/endpoints/hauler-dashboard";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

export default function HaulerDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId);

  const {
    kpis,
    billableUnits,
    costCenter,
    tickets,
    totalTickets,
    page,
    pageSize,
    setPage,
    loading: dataLoading,
    error: dataError,
  } = useHaulerDashboard({
    companyId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    haulerId: filters.haulerId,
    truckTypeId: filters.truckTypeId,
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
      haulerId: filters.haulerId === "all" ? undefined : filters.haulerId,
      truckTypeId: filters.truckTypeId === "all" ? undefined : filters.truckTypeId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
    };
    haulerApi.getHaulerTicketsExportBlob(apiFilters).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hauler-dashboard-tickets.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [companyId, filters]);

  const loading = lookupsLoading || dataLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Hauler (Vendor) Dashboard
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Fraud Detection & Efficiency Analysis. Created At timestamp helps detect late entries.
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
          <KPICards
            items={[
              { label: "Total Tickets", value: kpis.totalTickets },
              { label: "Unique Trucks", value: kpis.uniqueTrucks },
              { label: "Active Jobs", value: kpis.activeJobs },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryTable
              title="Billable units"
              subtitle="By truck type (verify vendor invoices)"
              columns={[
                { key: "truckType", label: "Truck Type" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={billableUnits}
            />
            <SummaryTable
              title="Cost center"
              subtitle="By job"
              columns={[
                { key: "jobName", label: "Job Name" },
                { key: "totalTickets", label: "Total Tickets" },
              ]}
              rows={costCenter}
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
