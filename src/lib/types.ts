/**
 * Construction Logistics Reporting – shared types.
 * All IDs are resolved to human-readable names in the UI (per spec).
 */

export type Direction = "Import" | "Export" | "Both";

/** Company / branch for multi-tenant dashboard. */
export interface Company {
  id: string;
  name: string;
}

export type PhotoType = "Ticket" | "Truck" | "Truck2" | "Asbestos" | "Scrap";

export interface Photo {
  id: number;
  ticketId: number;
  type: PhotoType;
  url: string;
  fileName?: string;
}

/** Ticket row as returned from API / used in grids. All names, no raw IDs. */
export interface TicketRow {
  ticketNumber: string;
  ticketDate: string;
  createdAt: string;
  jobName: string;
  direction: "Import" | "Export";
  destinationOrigin: string;
  haulingCompany: string;
  material: string;
  truckNumber: string;
  truckType: string;
  driverName: string;
  haulerTicketNumber: "N/A" | "MISSING" | string;
  hasPhysicalTicket: boolean;
  signedBy: string;
  photoTicket: string | null;
  photoTruck1: string | null;
  photoTruck2: string | null;
  photoAsbestos: string | null;
  photoScrap: string | null;
}

/** Full ticket for detail modal (same as row + any extra fields). */
export interface TicketDetail extends TicketRow {
  id: number;
  companyId?: string;
  photos: Photo[];
}

/** Filter state shared across Job / Material / Hauler pages. */
export interface ReportFilters {
  startDate: string;
  endDate: string;
  jobId: string;
  materialId: string;
  haulerId: string;
  truckTypeId: string;
  direction: Direction;
}

/** Late submission audit row. */
export interface LateSubmissionRow {
  ticketNumber: string;
  ticketDate: string;
  systemDate: string;
  lagTime: string;
  signedBy: string;
  jobName: string;
  hauler: string;
}

/** Efficiency outlier row (per spec). */
export interface EfficiencyOutlierRow {
  date: string;
  jobName: string;
  route: string; // Format: "Material Name → Destination Site"
  truckNumber: string;
  haulerName?: string; // Backend may not return this yet
  totalTickets: number; // thisTruckLoads
  workDuration: string; // Format: "Hours:Minutes" (e.g., "7:30")
  myAvgCycle: number; // Minutes per Trip
  fleetBenchmark: number; // Average Cycle time in minutes (all other trucks)
  status: "green" | "red" | "grey"; // green: within 15%, red: SLOW (>15%), grey: Single Load
  // Legacy fields (for backward compatibility with current backend)
  fleetAvgLoads?: number;
  thisTruckLoads?: number;
  firstTicketTime?: string;
  lastTicketTime?: string;
  impliedHours?: number;
  loadsPerHour?: number;
}
