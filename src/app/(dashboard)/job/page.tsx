"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { KPICards } from "@/components/reporting/KPICards";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useJobDashboard } from "@/hooks/useJobDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DashboardSkeleton } from "@/components/reporting/DashboardSkeleton";
import * as jobApi from "@/lib/api/endpoints/job-dashboard";

function createDefaultFilters(initialJobId?: string | null): FilterConfig {
  // Use local machine date for default end date
  const today = new Date().toISOString().split("T")[0]!;
  return {
    startDate: "2025-01-01",
    endDate: today,
    jobId: initialJobId || "all",
    materialId: "all",
    haulerId: "all",
    truckTypeId: "all",
    direction: "Both",
    entityId: undefined,
  };
}

export default function JobDashboardPage() {
  const { companyId } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearchQ = searchParams.get("q") ?? undefined;
  const initialTicket = searchParams.get("ticket");
  const initialJobId = searchParams.get("jobId");
  const [filters, setFilters] = useState<FilterConfig>(() => createDefaultFilters(initialJobId));

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId ?? undefined);

  const {
    kpis,
    vendorTable,
    materialTable,
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
  } = useJobDashboard(
    {
      companyId: companyId ?? undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId,
      direction: filters.direction,
      // Use the top-level Company selector as Our company (entityId) filter for the job dashboard.
      entityId: companyId ?? undefined,
    },
    { initialSearch: initialSearchQ }
  );

  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const handleOpenDetail = useCallback(
    (ticketNumber: string) => {
      fetchDetail(ticketNumber, companyId ?? undefined);
    },
    [fetchDetail, companyId]
  );

  // Header global search deep-links here with ?ticket=/?jobId=/?q=. Track the last-consumed
  // value per field (not just "used once") so a second search while already on this page
  // still applies — useState's lazy initializer only runs on mount, not on re-render.
  const consumedRef = useRef<{ ticket?: string; jobId?: string; q?: string }>({});
  useEffect(() => {
    if (initialTicket && consumedRef.current.ticket !== initialTicket) {
      consumedRef.current.ticket = initialTicket;
      handleOpenDetail(initialTicket);
      router.replace("/job");
    } else if (initialJobId && consumedRef.current.jobId !== initialJobId) {
      consumedRef.current.jobId = initialJobId;
      setFilters((f) => ({ ...f, jobId: initialJobId }));
      router.replace("/job");
    } else if (initialSearchQ && consumedRef.current.q !== initialSearchQ) {
      consumedRef.current.q = initialSearchQ;
      onSearchChange(initialSearchQ);
      router.replace("/job");
    }
  }, [initialTicket, initialJobId, initialSearchQ, handleOpenDetail, onSearchChange, router]);

  const handleExportClick = useCallback(() => {
    const apiFilters = {
      companyId: companyId ?? undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      jobId: filters.jobId === "all" ? undefined : filters.jobId,
      direction: filters.direction === "Both" ? undefined : filters.direction,
      // Match the main dashboards: use the selected Company as entityId filter.
      entityId: companyId ?? undefined,
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

  const loading = lookupsLoading || dataInitialLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <PageHeader
        title="Job Dashboard"
        subtitle="Supply chain visibility, disposal limits, and compliance in one place."
      />

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
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
