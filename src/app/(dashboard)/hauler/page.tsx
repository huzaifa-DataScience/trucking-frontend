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
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DashboardSkeleton } from "@/components/reporting/DashboardSkeleton";
import * as haulerApi from "@/lib/api/endpoints/hauler-dashboard";

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

export default function HaulerDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(() => createDefaultFilters());

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId ?? undefined);

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
    companyId: companyId ?? undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    haulerId: filters.haulerId,
    truckTypeId: filters.truckTypeId,
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
      haulerId: filters.haulerId === "all" ? undefined : filters.haulerId,
      truckTypeId: filters.truckTypeId === "all" ? undefined : filters.truckTypeId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
      entityId: companyId ?? undefined,
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
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <PageHeader
        title="Hauler (vendor) dashboard"
        subtitle="Fraud detection and efficiency analysis — Created At helps surface late or backdated entries."
      />

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
        <div className="rounded-2xl border border-danger-border bg-danger-tint px-4 py-3 text-sm text-danger">
          {error.message}
        </div>
      )}

      {loading && <DashboardSkeleton kpiCount={3} />}

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
