/**
 * Mock data for Construction Logistics Reporting.
 * Replace with SQL Server API calls when backend is ready.
 */

import type {
  Direction,
  PhotoType,
  TicketRow,
  TicketDetail,
  LateSubmissionRow,
  EfficiencyOutlierRow,
} from "./types";

/** Companies / branches – used for company selector and data scoping. */
export const COMPANIES = [
  { id: "acme", name: "Acme Construction" },
  { id: "beta", name: "Beta Logistics" },
  { id: "gamma", name: "Gamma Holdings" },
  { id: "delta", name: "Delta Branch" },
] as const;

const JOBS = ["North Site Phase 1", "South Lot", "Riverside Demolition", "Warehouse A"];
const MATERIALS = ["Concrete", "Gravel", "Asbestos", "Scrap Metal", "Soil"];
const HAULERS = ["ABC Trucking", "Fast Haul Inc", "Green Logistics"];
const TRUCK_TYPES = ["Tri-Axle", "Trailer", "Dump Truck", "Tanker"];
const EXTERNAL_SITES = ["Quarry East", "Landfill North", "Recycling Co", "Depot 7"];
const DRIVERS = ["Mike Roberts", "Jane Smith", "Carlos M.", "Pat Lee"];

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const PHOTO_TYPES: PhotoType[] = ["Ticket", "Truck", "Truck2", "Asbestos", "Scrap"];

function buildPhotos(ticketId: number): { type: PhotoType; url: string }[] {
  const count = 1 + Math.floor(Math.random() * 4);
  const used = new Set<PhotoType>();
  const out: { type: PhotoType; url: string }[] = [];
  for (let i = 0; i < count && used.size < PHOTO_TYPES.length; i++) {
    const t = randomOf(PHOTO_TYPES);
    if (used.has(t)) continue;
    used.add(t);
    out.push({
      type: t,
      url: `/api/photos/${ticketId}/${t}.jpg`,
    });
  }
  return out;
}

let ticketIdSeq = 1;
function buildTicketRow(overrides: Partial<TicketRow> = {}): TicketRow {
  const ticketDate = new Date(2025, 0, 1 + Math.floor(Math.random() * 30));
  const createdLagHours = Math.random() > 0.7 ? 24 + Math.floor(Math.random() * 72) : 0;
  const createdAt = addDays(ticketDate, Math.floor(createdLagHours / 24));
  createdAt.setHours(createdAt.getHours() + (createdLagHours % 24), 0, 0, 0);

  const direction = randomOf(["Import", "Export"] as const);
  const hasPhysical = Math.random() > 0.2;
  const haulerNum = hasPhysical && Math.random() > 0.1 ? `HT-${1000 + Math.floor(Math.random() * 9000)}` : "";

  let haulerTicketNumber: "N/A" | "MISSING" | string = "N/A";
  if (hasPhysical) {
    haulerTicketNumber = haulerNum || "MISSING";
  }

  return {
    ticketNumber: `TKT-${2000 + ticketIdSeq++}`,
    ticketDate: formatDate(ticketDate),
    createdAt: formatDateTime(createdAt),
    jobName: randomOf(JOBS),
    direction,
    destinationOrigin: randomOf(EXTERNAL_SITES),
    haulingCompany: randomOf(HAULERS),
    material: randomOf(MATERIALS),
    truckNumber: `TRK-${100 + Math.floor(Math.random() * 900)}`,
    truckType: randomOf(TRUCK_TYPES),
    driverName: randomOf(DRIVERS),
    haulerTicketNumber,
    hasPhysicalTicket: hasPhysical,
    signedBy: randomOf(DRIVERS),
    photoTicket: null,
    photoTruck1: null,
    photoTruck2: null,
    photoAsbestos: null,
    photoScrap: null,
    ...overrides,
  };
}

function pivotPhotosIntoRow(row: TicketRow, photos: { type: PhotoType; url: string }[]): TicketRow {
  const out = { ...row };
  for (const p of photos) {
    if (p.type === "Ticket") out.photoTicket = p.url;
    else if (p.type === "Truck") out.photoTruck1 = p.url;
    else if (p.type === "Truck2") out.photoTruck2 = p.url;
    else if (p.type === "Asbestos") out.photoAsbestos = p.url;
    else if (p.type === "Scrap") out.photoScrap = p.url;
  }
  return out;
}

const COMPANY_IDS = COMPANIES.map((c) => c.id);
const MOCK_TICKETS: TicketDetail[] = [];
const TICKET_COUNT = 120;
for (let i = 0; i < TICKET_COUNT; i++) {
  const companyId = COMPANY_IDS[i % COMPANY_IDS.length]!;
  const base = buildTicketRow();
  const photos = buildPhotos(i + 1);
  const row = pivotPhotosIntoRow(base, photos);
  MOCK_TICKETS.push({
    id: i + 1,
    companyId,
    ...row,
    photos: photos.map((p, idx) => ({
      id: i * 10 + idx,
      ticketId: i + 1,
      type: p.type,
      url: p.url,
      fileName: `${p.type}.jpg`,
    })),
  });
}

/** Filter tickets by company, date range, and optional job/material/hauler/direction. */
export function filterTickets(filters: {
  companyId: string;
  startDate: string;
  endDate: string;
  jobId?: string;
  materialId?: string;
  haulerId?: string;
  truckTypeId?: string;
  direction: Direction;
}): TicketRow[] {
  let list = MOCK_TICKETS.filter((t) => t.companyId === filters.companyId).map((t) => {
    const { photos, id, companyId: _c, ...row } = t;
    return pivotPhotosIntoRow(row, photos.map((p) => ({ type: p.type, url: p.url })));
  });

  list = list.filter((t) => {
    if (filters.startDate && t.ticketDate < filters.startDate) return false;
    if (filters.endDate && t.ticketDate > filters.endDate) return false;
    if (filters.jobId && filters.jobId !== "all" && t.jobName !== filters.jobId) return false;
    if (filters.materialId && filters.materialId !== "all" && t.material !== filters.materialId) return false;
    if (filters.haulerId && filters.haulerId !== "all" && t.haulingCompany !== filters.haulerId) return false;
    if (filters.truckTypeId && filters.truckTypeId !== "all" && t.truckType !== filters.truckTypeId) return false;
    if (filters.direction === "Import" && t.direction !== "Import") return false;
    if (filters.direction === "Export" && t.direction !== "Export") return false;
    return true;
  });

  list.sort((a, b) => (b.ticketDate + b.createdAt).localeCompare(a.ticketDate + a.createdAt));
  return list;
}

export function getTicketByNumber(ticketNumber: string, companyId?: string): TicketDetail | null {
  const t = MOCK_TICKETS.find((t) => t.ticketNumber === ticketNumber);
  if (!t) return null;
  if (companyId != null && t.companyId !== companyId) return null;
  return t;
}

export function getJobDashboardKpis(
  tickets: TicketRow[]
): { totalTickets: number; flowBalance: string; lastActive: string } {
  const imports = tickets.filter((t) => t.direction === "Import").length;
  const exports = tickets.filter((t) => t.direction === "Export").length;
  const last = tickets.length
    ? tickets.reduce((a, b) => (a.ticketDate >= b.ticketDate ? a : b)).ticketDate
    : "—";
  return {
    totalTickets: tickets.length,
    flowBalance: `${imports} Imports / ${exports} Exports`,
    lastActive: last,
  };
}

export function getMaterialDashboardKpis(
  tickets: TicketRow[]
): { totalTickets: number; topSource: string; topDestination: string; activeJobs: number } {
  const bySiteImport: Record<string, number> = {};
  const bySiteExport: Record<string, number> = {};
  const jobs = new Set<string>();
  for (const t of tickets) {
    jobs.add(t.jobName);
    if (t.direction === "Import") bySiteImport[t.destinationOrigin] = (bySiteImport[t.destinationOrigin] ?? 0) + 1;
    else bySiteExport[t.destinationOrigin] = (bySiteExport[t.destinationOrigin] ?? 0) + 1;
  }
  const topSource =
    Object.entries(bySiteImport).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topDestination =
    Object.entries(bySiteExport).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return {
    totalTickets: tickets.length,
    topSource,
    topDestination,
    activeJobs: jobs.size,
  };
}

export function getHaulerDashboardKpis(
  tickets: TicketRow[]
): { totalTickets: number; uniqueTrucks: number; activeJobs: number } {
  const trucks = new Set(tickets.map((t) => t.truckNumber));
  const jobs = new Set(tickets.map((t) => t.jobName));
  return {
    totalTickets: tickets.length,
    uniqueTrucks: trucks.size,
    activeJobs: jobs.size,
  };
}

export function getVendorSummary(tickets: TicketRow[]): { companyName: string; truckType: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) {
    const key = `${t.haulingCompany}|${t.truckType}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, totalTickets]) => {
    const [companyName, truckType] = key.split("|");
    return { companyName: companyName!, truckType: truckType!, totalTickets };
  });
}

export function getMaterialSummary(tickets: TicketRow[]): { materialName: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) map.set(t.material, (map.get(t.material) ?? 0) + 1);
  return Array.from(map.entries()).map(([materialName, totalTickets]) => ({ materialName, totalTickets }));
}

export function getSitesSummary(
  tickets: TicketRow[]
): { externalSiteName: string; direction: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) {
    const key = `${t.destinationOrigin}|${t.direction}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, totalTickets]) => {
    const [externalSiteName, direction] = key.split("|");
    return { externalSiteName: externalSiteName!, direction: direction!, totalTickets };
  });
}

export function getJobsSummary(
  tickets: TicketRow[]
): { jobName: string; direction: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) {
    const key = `${t.jobName}|${t.direction}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, totalTickets]) => {
    const [jobName, direction] = key.split("|");
    return { jobName: jobName!, direction: direction!, totalTickets };
  });
}

export function getBillableUnitsSummary(tickets: TicketRow[]): { truckType: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) map.set(t.truckType, (map.get(t.truckType) ?? 0) + 1);
  return Array.from(map.entries()).map(([truckType, totalTickets]) => ({ truckType, totalTickets }));
}

export function getCostCenterSummary(tickets: TicketRow[]): { jobName: string; totalTickets: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) map.set(t.jobName, (map.get(t.jobName) ?? 0) + 1);
  return Array.from(map.entries()).map(([jobName, totalTickets]) => ({ jobName, totalTickets }));
}

/** Late submission: Created At > 24h after Ticket Date. */
export function getLateSubmissionRows(tickets: TicketRow[]): LateSubmissionRow[] {
  const out: LateSubmissionRow[] = [];
  for (const t of tickets) {
    const ticketDt = new Date(t.ticketDate);
    const createdDt = new Date(t.createdAt.replace(" ", "T"));
    const lagMs = createdDt.getTime() - ticketDt.getTime();
    const lagHours = lagMs / (1000 * 60 * 60);
    if (lagHours < 24) continue;
    const days = Math.floor(lagHours / 24);
    out.push({
      ticketNumber: t.ticketNumber,
      ticketDate: t.ticketDate,
      systemDate: t.createdAt,
      lagTime: `+${days} Day${days !== 1 ? "s" : ""}`,
      signedBy: t.signedBy,
      jobName: t.jobName,
      hauler: t.haulingCompany,
    });
  }
  return out.sort((a, b) => b.systemDate.localeCompare(a.systemDate));
}

/** Efficiency outlier: by Date + Job + Destination (route), avg loads vs this truck. */
export function getEfficiencyOutlierRows(tickets: TicketRow[]): EfficiencyOutlierRow[] {
  type RouteKey = string;
  const byRoute = new Map<
    RouteKey,
    { date: string; jobName: string; route: string; tickets: TicketRow[] }
  >();
  for (const t of tickets) {
    const key = `${t.ticketDate}|${t.jobName}|${t.destinationOrigin}`;
    if (!byRoute.has(key)) {
      byRoute.set(key, {
        date: t.ticketDate,
        jobName: t.jobName,
        route: `${t.jobName} / ${t.destinationOrigin}`,
        tickets: [],
      });
    }
    byRoute.get(key)!.tickets.push(t);
  }

  const rows: EfficiencyOutlierRow[] = [];
  for (const [, group] of byRoute) {
    const byTruck = new Map<string, TicketRow[]>();
    for (const t of group.tickets) {
      const list = byTruck.get(t.truckNumber) ?? [];
      list.push(t);
      byTruck.set(t.truckNumber, list);
    }
    const totalLoads = group.tickets.length;
    const truckCount = byTruck.size;
    const fleetAvgLoads = truckCount ? Math.round((totalLoads / truckCount) * 10) / 10 : 0;

    for (const [truckNumber, truckTickets] of byTruck) {
      const sorted = [...truckTickets].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      const firstTime = new Date(first.createdAt.replace(" ", "T"));
      const lastTime = new Date(last.createdAt.replace(" ", "T"));
      const impliedHours = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
      const hours = Math.max(impliedHours, 0.1);
      const loadsPerHour = Math.round((truckTickets.length / hours) * 10) / 10;

      rows.push({
        date: group.date,
        jobName: group.jobName,
        route: group.route,
        truckNumber,
        fleetAvgLoads,
        thisTruckLoads: truckTickets.length,
        firstTicketTime: firstTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        lastTicketTime: lastTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        impliedHours,
        loadsPerHour,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export { JOBS, MATERIALS, HAULERS, TRUCK_TYPES };
