/**
 * API response types matching the backend (BACKEND_IMPLEMENTATION.md).
 */

import type { TicketRow, TicketDetail as TicketDetailApp } from "@/lib/types";

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LookupItem {
  id: number;
  name: string;
}

/** Backend ticket row matches app TicketRow. */
export type ApiTicketRow = TicketRow;

/** Backend ticket detail. */
export type ApiTicketDetail = TicketDetailApp;

/** Job dashboard KPIs (single endpoint). */
export interface JobKpis {
  totalTickets: number;
  flowBalance: string;
  lastActive: string;
}

export interface VendorSummaryRow {
  companyName: string;
  truckType: string;
  totalTickets: number;
}

export interface MaterialSummaryRow {
  materialName: string;
  totalTickets: number;
}

/** Material dashboard KPIs. */
export interface MaterialKpis {
  totalTickets: number;
  topSource: string;
  topDestination: string;
  activeJobs: number;
}

export interface SitesSummaryRow {
  externalSiteName: string;
  direction: string;
  totalTickets: number;
}

export interface JobsSummaryRow {
  jobName: string;
  direction: string;
  totalTickets: number;
}

/** Hauler dashboard KPIs. */
export interface HaulerKpis {
  totalTickets: number;
  uniqueTrucks: number;
  activeJobs: number;
}

export interface BillableUnitsRow {
  truckType: string;
  totalTickets: number;
}

export interface CostCenterRow {
  jobName: string;
  totalTickets: number;
}

/** Forensic – late submission row (backend shape). FRONTEND_API_GUIDE.md contract. */
export interface ApiLateSubmissionRow {
  ticketNumber: string;
  ticketDate: string;
  systemEntryDate: string; // System Entry Date (CreatedAt)
  lagTime: string;
  signedBy: string;
  jobName: string;
  haulerCompanyName: string;
}

/** Late submission API response: KPI count + items for grid. */
export interface ApiLateSubmissionResponse {
  lateTicketsFound: number;
  items: ApiLateSubmissionRow[];
}

/** Forensic – efficiency outlier row (backend shape). FRONTEND_API_GUIDE.md contract. */
export interface ApiEfficiencyOutlierRow {
  date: string;
  jobName: string;
  route: string; // "Material Name → Destination Site"
  truckNumber: string;
  haulerName: string;
  totalTickets: number;
  workDuration: string; // "Hours:Minutes"
  myAvgCycle: number; // minutes per trip
  fleetBenchmark: number; // average cycle time (min) of peer group
  status: "RED" | "Single Load" | "Green";
  statusLabel: string; // "SLOW (>15%)" | "Single Load" | "Within 15%"
}
