"use client";

import { useMemo, useState } from "react";
import type { Direction } from "@/lib/types";
import {
  filterTickets,
  getJobDashboardKpis,
  getVendorSummary,
  getMaterialSummary,
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

export default function JobDashboardPage() {
  const { companyId } = useCompany();
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);

  const tickets = useMemo(
    () =>
      filterTickets({
        companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        jobId: filters.jobId,
        direction: filters.direction,
      }),
    [companyId, filters]
  );

  const kpis = useMemo(() => getJobDashboardKpis(tickets), [tickets]);
  const vendorSummary = useMemo(() => getVendorSummary(tickets), [tickets]);
  const materialSummary = useMemo(() => getMaterialSummary(tickets), [tickets]);

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
          rows={vendorSummary}
        />
        <SummaryTable
          title="Material summary"
          subtitle="By material"
          columns={[
            { key: "materialName", label: "Material Name" },
            { key: "totalTickets", label: "Total Tickets" },
          ]}
          rows={materialSummary}
        />
      </div>

      <TicketGrid tickets={tickets} companyId={companyId} />
    </div>
  );
}
