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
import { Skeleton, SkeletonStatRow, SkeletonTableRows } from "@/components/ui/Skeleton";
import * as jobApi from "@/lib/api/endpoints/job-dashboard";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { JobBidFile } from "@/lib/api/endpoints/bidding";

async function openJobFile(file: JobBidFile, asDownload: boolean) {
  const raw = await biddingApi.fetchBidAttachmentBlob(file.downloadPath);
  const name = file.fileName.toLowerCase();
  let type = file.mimeType?.trim() || raw.type || "";
  if (!type || type === "application/octet-stream") {
    if (name.endsWith(".pdf")) type = "application/pdf";
    else if (name.endsWith(".png")) type = "image/png";
    else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) type = "image/jpeg";
    else if (name.endsWith(".webp")) type = "image/webp";
  }
  const blob = type && type !== raw.type ? new Blob([raw], { type }) : raw;
  const url = URL.createObjectURL(blob);
  if (asDownload) {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function JobBidFiles({ jobId }: { jobId: string }) {
  const [files, setFiles] = useState<JobBidFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFiles(null);
    setError(null);
    void biddingApi.listJobBidFiles(jobId).then(
      (rows) => {
        if (!cancelled) setFiles(rows);
      },
      () => {
        if (!cancelled) setError("Couldn't load bid files for this job.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.06)] sm:p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Bid files</h2>
      <p className="mt-1 text-[13px] text-ink/50">Files on bids linked to this job. View or download them here.</p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {files == null && !error ? <p className="mt-3 text-sm text-ink/40">Loading files…</p> : null}
      {files && files.length === 0 ? (
        <p className="mt-3 text-sm text-ink/40">No bid files linked to this job.</p>
      ) : null}
      {files && files.length > 0 ? (
        <ul className="mt-3 divide-y divide-ink/[0.06]">
          {files.map((file) => (
            <li key={`${file.bidId}-${file.id}`} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.fileName}</p>
                <p className="truncate text-[12px] text-ink/40">
                  {[file.estimateNumber, file.bidName, file.label].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="cursor-pointer text-[12px] font-semibold text-brand hover:underline"
                onClick={() => void openJobFile(file, false)}
              >
                View
              </button>
              <button
                type="button"
                className="cursor-pointer text-[12px] font-semibold text-ink/60 hover:underline"
                onClick={() => void openJobFile(file, true)}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 sm:gap-8">
      <PageHeader
        title="Job Dashboard"
        subtitle="Supply chain visibility, disposal limits, and compliance in one place."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportFilters
          filters={filters}
          options={filterOptions}
          onChange={setFilters}
          showJob
          showDirection
        />
        <div className="flex h-full flex-col rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.06)] sm:p-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40 sm:mb-4">
            Overview
          </h2>
          {loading ? (
            <SkeletonStatRow count={3} />
          ) : (
            <KPICards
              maxCols={2}
              items={[
                { label: "Total Tickets", value: kpis.totalTickets },
                { label: "Flow Balance", value: kpis.flowBalance },
                { label: "Last Active", value: kpis.lastActive },
              ]}
            />
          )}
        </div>
      </div>

      {filters.jobId !== "all" ? <JobBidFiles jobId={filters.jobId} /> : null}

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
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
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
