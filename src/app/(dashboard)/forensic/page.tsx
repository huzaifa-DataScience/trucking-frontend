"use client";

import { useCallback, useState } from "react";
import type { FilterConfig } from "@/components/reporting/ReportFilters";
import { ReportFilters } from "@/components/reporting/ReportFilters";
import { LateSubmissionGrid } from "@/components/reporting/LateSubmissionGrid";
import { EfficiencyOutlierGrid } from "@/components/reporting/EfficiencyOutlierGrid";
import { TicketDetailModal } from "@/components/reporting/TicketDetailModal";
import { useCompany } from "@/contexts/CompanyContext";
import { useLookups } from "@/hooks/useLookups";
import { useForensic } from "@/hooks/useForensic";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";

// Default to last 7 days for Efficiency Outlier Report (per spec)
function getDefaultFilters(): FilterConfig {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  return {
    startDate: sevenDaysAgo.toISOString().split("T")[0]!,
    endDate: today.toISOString().split("T")[0]!,
    jobId: "all",
    materialId: "all",
    haulerId: "all",
    truckTypeId: "all",
    direction: "Both",
  };
}

const defaultFilters: FilterConfig = getDefaultFilters();

type TabId = "late" | "efficiency";

export default function ForensicAuditPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);
  const [tab, setTab] = useState<TabId>("late");

  const { filterOptions, loading: lookupsLoading, error: lookupsError } = useLookups(companyId ?? undefined);
  const { ticket: detailTicket, fetchDetail, clear: closeDetail } = useTicketDetail();

  const openTicketDetail = useCallback(
    (ticketNumber: string) => {
      fetchDetail(ticketNumber, companyId ?? undefined);
    },
    [fetchDetail, companyId]
  );

  const { lateTicketsFound, lateRows, efficiencyRows, loading: dataLoading, error: dataError } = useForensic({
    companyId: companyId ?? undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    jobId: filters.jobId,
    materialId: filters.materialId,
    haulerId: filters.haulerId,
    truckTypeId: filters.truckTypeId,
    direction: filters.direction,
  });

  const loading = lookupsLoading || dataLoading;
  const error = lookupsError ?? dataError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <PageHeader
        title="Forensic & audit"
        subtitle="Late submission audit and efficiency outlier analysis for compliance reviews."
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
          <div className="rounded-2xl border border-ink/[0.08] bg-surface px-2 shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
            <nav className="flex gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setTab("late")}
                className={`rounded-xl border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === "late"
                    ? "border-brand text-ink"
                    : "border-transparent text-ink/45 hover:text-ink"
                }`}
              >
                Late submission audit
              </button>
              <button
                type="button"
                onClick={() => setTab("efficiency")}
                className={`rounded-xl border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === "efficiency"
                    ? "border-brand text-ink"
                    : "border-transparent text-ink/45 hover:text-ink"
                }`}
              >
                Efficiency outlier report
              </button>
            </nav>
          </div>

          {tab === "late" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                <div className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                    Late tickets found
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {lateTicketsFound}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink/55">
                Tickets where <strong>Created At</strong> (system time) is more than 24 hours after{" "}
                <strong>Ticket Date</strong>. Use to identify backdating.
              </p>
              <LateSubmissionGrid rows={lateRows} onOpenDetail={openTicketDetail} />
              <TicketDetailModal ticket={detailTicket ?? null} onClose={closeDetail} />
            </div>
          )}

          {tab === "efficiency" && (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-ink/55">
                Grouped by Date + Job + Destination (route). Fleet average loads per truck vs each
                truck&apos;s actual loads; implied hours and loads per hour.
              </p>
              <EfficiencyOutlierGrid rows={efficiencyRows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
