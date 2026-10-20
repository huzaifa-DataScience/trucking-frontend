"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { StatTiles } from "@/components/reporting/StatTiles";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useHaulerDashboard } from "@/hooks/useHaulerDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton, SkeletonTableRows } from "@/components/ui/Skeleton";
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
    sortBy,
    sortDir,
    onSortChange,
    search,
    onSearchChange,
    loading: dataLoading,
    initialLoading: dataInitialLoading,
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

  const loading = lookupsLoading || dataInitialLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="report-dashboard flex min-h-0 min-w-0 flex-1 flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-4">
        {/* Overview numbers sit beside the title; filters are one row under it (same as the Job and Material dashboards). */}
        <PageHeader
          title="Hauler (vendor) dashboard"
          subtitle="Fraud detection and efficiency analysis. The Created At timestamp helps surface late or backdated entries."
          action={
            <StatTiles
              loading={loading}
              items={[
                { label: "Total tickets", value: kpis.totalTickets.toLocaleString() },
                { label: "Unique trucks", value: kpis.uniqueTrucks.toLocaleString() },
                { label: "Active jobs", value: kpis.activeJobs.toLocaleString() },
              ]}
            />
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
        <div className="rounded-2xl border border-danger-border bg-danger-tint px-4 py-3 text-sm text-danger">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.06)]"
              aria-hidden
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-1.5 h-3 w-52" />
              <div className="mt-5">
                <SkeletonTableRows rows={6} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
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
            refreshing={dataLoading}
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
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
            search={search}
            onSearchChange={onSearchChange}
          />
        </>
      )}
    </div>
  );
}
