"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useJobDashboard } from "@/hooks/useJobDashboard";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatTiles } from "@/components/reporting/StatTiles";
import { Skeleton, SkeletonTableRows } from "@/components/ui/Skeleton";
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

/** Shown when one job is picked: the job and its bid files. Its numbers are in the header tiles (they follow the Job filter). */
function JobCard({ jobId, jobName }: { jobId: string; jobName: string }) {
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
    <section className="cs-content-panel min-w-0 p-5">
      <h2 className="text-[16px] font-semibold text-ink">{jobName}</h2>
      <p className="cs-helper mt-0.5">Bid files on this job</p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {files == null && !error ? <p className="mt-3 text-sm text-ink/40">Loading files…</p> : null}
      {files && files.length === 0 ? (
        <p className="mt-3 text-sm text-ink/40">No bid files linked to this job.</p>
      ) : null}
      {files && files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <li
              key={`${file.bidId}-${file.id}`}
              className="flex max-w-full items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-ink">{file.fileName}</span>
                {/* Same detail line the old Bid files list showed under each file. */}
                <span className="block truncate text-[11.5px] text-ink/45">
                  {[file.estimateNumber, file.bidName, file.label].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-[12px] font-semibold text-brand hover:underline"
                onClick={() => void openJobFile(file, false)}
              >
                View
              </button>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-[12px] font-semibold text-ink/60 hover:underline"
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

/** "3 Imports / 2 Exports" from the API → bold numbers, muted words. Falls back to the raw text. */
function FlowBalance({ text }: { text: string }) {
  const m = /^([\d,]+)\s+Imports\s*\/\s*([\d,]+)\s+Exports$/i.exec(text.trim());
  if (!m) return <>{text}</>;
  const word = "text-[12.5px] font-normal text-ink-muted";
  return (
    <>
      {m[1]} <span className={word}>imports</span> <span className="font-normal text-ink-soft">/</span> {m[2]}{" "}
      <span className={word}>exports</span>
    </>
  );
}

/** API sends YYYY-MM-DD; show it like the rest of the page (Mar 18, 2026). */
function formatLastActive(value: string | null | undefined): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) return value || "—";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    <div className="report-dashboard flex min-h-0 min-w-0 flex-1 flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-4">
        {/* Overview numbers sit beside the title; filters are one row under it. */}
        <PageHeader
          title="Job Dashboard"
          subtitle="Supply chain visibility, disposal limits, and compliance in one place."
          action={
            <StatTiles
              loading={loading}
              items={[
                { label: "Total tickets", value: kpis.totalTickets.toLocaleString() },
                { label: "Flow balance", value: <FlowBalance text={kpis.flowBalance} /> },
                { label: "Last active", value: formatLastActive(kpis.lastActive) },
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
            showDirection
            layout="bar"
          />
        </div>
      </div>

      {filters.jobId !== "all" ? (
        <JobCard
          jobId={filters.jobId}
          jobName={filterOptions.jobs.find((j) => j.value === filters.jobId)?.label ?? `Job ${filters.jobId}`}
        />
      ) : null}

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
