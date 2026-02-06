"use client";

import { useMemo, useState } from "react";
import {
  filterTickets,
  getHaulerDashboardKpis,
  getBillableUnitsSummary,
  getCostCenterSummary,
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

export default function HaulerDashboardPage() {
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
        haulerId: filters.haulerId,
        truckTypeId: filters.truckTypeId,
        direction: filters.direction,
      }),
    [companyId, filters]
  );

  const kpis = useMemo(() => getHaulerDashboardKpis(tickets), [tickets]);
  const billableUnits = useMemo(() => getBillableUnitsSummary(tickets), [tickets]);
  const costCenter = useMemo(() => getCostCenterSummary(tickets), [tickets]);

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

      <TicketGrid tickets={tickets} companyId={companyId} />
    </div>
  );
}
