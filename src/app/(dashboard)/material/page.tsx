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
import { useMaterialDashboard } from "@/hooks/useMaterialDashboard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton, SkeletonStatRow, SkeletonTableRows } from "@/components/ui/Skeleton";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import * as materialApi from "@/lib/api/endpoints/material-dashboard";

function createDefaultFilters(initialMaterialId?: string | null): FilterConfig {
  // Use local machine date for default end date
  const today = new Date().toISOString().split("T")[0]!;
  return {
    startDate: "2025-01-01",
    endDate: today,
    jobId: "all",
    materialId: initialMaterialId || "all",
    haulerId: "all",

    truckTypeId: "all",
    direction: "Both",
  };
}

export default function MaterialDashboardPage() {
  const { companyId } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMaterialId = searchParams.get("materialId");
  const [filters, setFilters] = useState<FilterConfig>(() => createDefaultFilters(initialMaterialId));

  // Header global search deep-links here with ?materialId=. Track the last-consumed value
  // (not just "used once") so a second search while already on this page still applies —
  // useState's lazy initializer only runs on mount, not on re-render.
  const consumedMaterialIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (initialMaterialId && consumedMaterialIdRef.current !== initialMaterialId) {
      consumedMaterialIdRef.current = initialMaterialId;
      setFilters((f) => ({ ...f, materialId: initialMaterialId }));
      router.replace("/material");
    }
  }, [initialMaterialId, router]);

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
    sortBy,
    sortDir,
    onSortChange,
    search,
    onSearchChange,
    loading: dataLoading,
    initialLoading: dataInitialLoading,
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

  const loading = lookupsLoading || dataInitialLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 sm:gap-8">
      <PageHeader
        title="Material Dashboard"
        subtitle="Billing reconciliation, sources and destinations, and ticket-level audit."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportFilters
          filters={filters}
          options={filterOptions}
          onChange={setFilters}
          showJob
          showMaterial
          showDirection
        />
        <div className="flex h-full flex-col rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.06)] sm:p-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40 sm:mb-4">
            Overview
          </h2>
          {loading ? (
            <SkeletonStatRow count={4} />
          ) : (
            <KPICards
              maxCols={2}
              items={[
                { label: "Total Tickets", value: kpis.totalTickets },
                { label: "Top Source", value: kpis.topSource },
                { label: "Top Destination", value: kpis.topDestination },
                { label: "Active Jobs", value: kpis.activeJobs },
              ]}
            />
          )}
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
