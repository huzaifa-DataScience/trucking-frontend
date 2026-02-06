"use client";

import { useMemo, useState } from "react";
import {
  filterTickets,
  getMaterialDashboardKpis,
  getSitesSummary,
  getJobsSummary,
  JOBS,
  MATERIALS,
  HAULERS,
  TRUCK_TYPES,
} from "@/lib/mock-data";
import { useCompany } from "@/contexts/CompanyContext";
import { ReportFilters, type FilterConfig, type FilterOptions } from "@/components/reporting/ReportFilters";
import { KPICards } from "@/components/reporting/KPICards";
import { SummaryTable } from "@/components/reporting/SummaryTable";
import { TicketGrid } from "@/components/reporting/TicketGrid";

const defaultFilters: FilterConfig = {
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  jobId: "all",
  materialId: "all",
  haulerId: "all",
  truckTypeId: "all",
  direction: "Both",
};

const filterOptions: FilterOptions = {
  jobs: [{ value: "all", label: "All" }, ...JOBS.map((j) => ({ value: j, label: j }))],
  materials: [{ value: "all", label: "All" }, ...MATERIALS.map((m) => ({ value: m, label: m }))],
  haulers: [{ value: "all", label: "All" }, ...HAULERS.map((h) => ({ value: h, label: h }))],
  truckTypes: [{ value: "all", label: "All" }, ...TRUCK_TYPES.map((t) => ({ value: t, label: t }))],
};

export default function MaterialDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);

  const tickets = useMemo(
    () =>
      filterTickets({
        companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        jobId: filters.jobId,
        materialId: filters.materialId,
        direction: filters.direction,
      }),
    [companyId, filters]
  );

  const kpis = useMemo(() => getMaterialDashboardKpis(tickets), [tickets]);
  const sitesSummary = useMemo(() => getSitesSummary(tickets), [tickets]);
  const jobsSummary = useMemo(() => getJobsSummary(tickets), [tickets]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Material Dashboard
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Billing Reconciliation & Audit.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        showJob
        showMaterial
        showDirection
      />

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
          rows={sitesSummary}
        />
        <SummaryTable
          title="Jobs summary"
          subtitle="Job by direction"
          columns={[
            { key: "jobName", label: "Job Name" },
            { key: "direction", label: "Direction" },
            { key: "totalTickets", label: "Total Tickets" },
          ]}
          rows={jobsSummary}
        />
      </div>

      <TicketGrid tickets={tickets} companyId={companyId} />
    </div>
  );
}
