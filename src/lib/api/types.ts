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

/** Forensic – late submission (backend shape). */
export interface ApiLateSubmissionRow {
  ticketNumber: string;
  ticketDate: string;
  systemDate: string;
  lagTime: string;
  signedBy: string;
  jobName: string;
  hauler: string;
}

/** Forensic – efficiency outlier (backend shape). */
export interface ApiEfficiencyOutlierRow {
  date: string;
  jobName: string;
  routeName: string; // external site name (destination)
  truckNumber: string;
  fleetAvgLoads: number;
  thisTruckLoads: number;
  firstTicketTime: string;
  lastTicketTime: string;
  impliedHours: number;
  loadsPerHour: number;
  // Optional fields per spec (backend should add these):
  materialName?: string; // For route display: "Material Name → Destination Site"
  haulerName?: string;
  fleetBenchmarkMinutes?: number; // Average cycle time in minutes (all trucks in peer group)
  myAvgCycleMinutes?: number; // This truck's cycle time in minutes
  status?: "green" | "red" | "grey"; // green: within 15%, red: SLOW (>15%), grey: Single Load
}
