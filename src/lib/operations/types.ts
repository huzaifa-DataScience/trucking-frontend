/** Operations / trucking log — FRONTEND_OPERATIONS.md */

export interface HaulLeed {
  lightTubes?: number | null;
  metalsDirect?: number | null;
  metalsReclaimed?: number | null;
  insulation?: number | null;
  wood?: number | null;
  paper?: number | null;
  aggregates?: number | null;
  plastics?: number | null;
  drywall?: number | null;
  boardFeetWood?: number | null;
  dirt?: number | null;
  lumber?: number | null;
  brickDeconstructed?: number | null;
  brickPallets?: number | null;
  roofing?: number | null;
  landfill?: number | null;
}

export interface HaulAggregates {
  rc57?: number | null;
  rc6?: number | null;
  rc2?: number | null;
  cr57?: number | null;
  dirtTons?: number | null;
}

export interface OperationsHaul {
  id: number;
  ticketDate: string;
  jobId?: number | null;
  jobNumber?: string | null;
  jobName?: string | null;
  haulerRateId?: number | null;
  haulerLabel?: string | null;
  hours?: number | null;
  disposalRateId?: number | null;
  disposalLabel?: string | null;
  goelTicketNumber?: string | null;
  haulingTicketNumber?: string | null;
  disposalTicketNumber?: string | null;
  wasteManifestNumber?: string | null;
  transferJobNumber?: string | null;
  weightTons?: number | null;
  leed?: HaulLeed | null;
  aggregates?: HaulAggregates | null;
  /** Server-calculated — paint only, never POST/PATCH */
  truckingCost?: number | null;
  disposalCost?: number | null;
  totalCost?: number | null;
}

export type HaulWriteBody = {
  ticketDate: string;
  jobNumber?: string | null;
  jobName?: string | null;
  jobId?: number | null;
  haulerRateId?: number | null;
  hours?: number | null;
  disposalRateId?: number | null;
  goelTicketNumber?: string | null;
  haulingTicketNumber?: string | null;
  disposalTicketNumber?: string | null;
  wasteManifestNumber?: string | null;
  transferJobNumber?: string | null;
  weightTons?: number | null;
  leed?: HaulLeed | null;
  aggregates?: HaulAggregates | null;
};

export interface HaulerRateCard {
  id: number;
  companyId?: number | null;
  companyName: string;
  category?: string | null;
  label: string;
  ratePerLoad?: number | null;
  ratePerHour?: number | null;
  unit?: string | null;
  showUpHours?: number | null;
  address?: string | null;
  phone?: string | null;
  contact?: string | null;
  email?: string | null;
  coi?: string | null;
  isActive: boolean;
}

export type HaulerRateWriteBody = {
  companyName: string;
  category?: string | null;
  companyId?: number | null;
  ratePerLoad?: number | null;
  ratePerHour?: number | null;
  unit?: string | null;
  showUpHours?: number | null;
  address?: string | null;
  phone?: string | null;
  contact?: string | null;
  email?: string | null;
  coi?: string | null;
  isActive?: boolean;
};

export interface DisposalRateCard {
  id: number;
  siteId?: number | null;
  companyName: string;
  unitLabel?: string | null;
  category?: string | null;
  label: string;
  costPerLoad?: number | null;
  costPerTon?: number | null;
  costPerCy?: number | null;
  truckSizeCy?: number | null;
  tonsIncluded?: number | null;
  address?: string | null;
  phone?: string | null;
  contact?: string | null;
  email?: string | null;
  isActive: boolean;
}

export type DisposalRateWriteBody = {
  companyName: string;
  unitLabel?: string | null;
  category?: string | null;
  siteId?: number | null;
  costPerLoad?: number | null;
  costPerTon?: number | null;
  costPerCy?: number | null;
  truckSizeCy?: number | null;
  tonsIncluded?: number | null;
  address?: string | null;
  phone?: string | null;
  contact?: string | null;
  email?: string | null;
  isActive?: boolean;
};

export interface CostReportTotals {
  loads: number;
  weightTons: number;
  truckingCost: number;
  disposalCost: number;
  totalCost: number;
}

export interface CostReportRow extends CostReportTotals {
  jobNumber?: string;
  jobName?: string | null;
  haulerRateId?: number;
  hauler?: string;
  disposalRateId?: number;
  destination?: string;
}

export interface CostReportResponse {
  rows: CostReportRow[];
  totals: CostReportTotals;
}

export type LeedReportRow = {
  jobNumber: string;
  jobName?: string | null;
  loads: number;
} & Partial<HaulLeed> &
  Partial<HaulAggregates>;

export interface HaulsQuery {
  from?: string;
  to?: string;
  jobNumber?: string;
  haulerRateId?: number;
  disposalRateId?: number;
}

export interface ReportDateQuery {
  from?: string;
  to?: string;
}

export const LEED_FIELD_META: { key: keyof HaulLeed; label: string }[] = [
  { key: "lightTubes", label: "Light tubes / ballasts" },
  { key: "metalsDirect", label: "Metals (scrap)" },
  { key: "metalsReclaimed", label: "Metals (rolloffs)" },
  { key: "insulation", label: "Insulation" },
  { key: "wood", label: "Wood" },
  { key: "paper", label: "Paper products" },
  { key: "aggregates", label: "Aggregates" },
  { key: "plastics", label: "Plastics" },
  { key: "drywall", label: "Drywall" },
  { key: "boardFeetWood", label: "Board feet of wood" },
  { key: "dirt", label: "Dirt" },
  { key: "lumber", label: "Lumber" },
  { key: "brickDeconstructed", label: "Brick deconstructed" },
  { key: "brickPallets", label: "Pallets of brick" },
  { key: "roofing", label: "Roofing" },
  { key: "landfill", label: "Landfill" },
];

export const AGGREGATE_FIELD_META: { key: keyof HaulAggregates; label: string }[] = [
  { key: "rc57", label: "RC-57" },
  { key: "rc6", label: "RC-6" },
  { key: "rc2", label: "RC-2" },
  { key: "cr57", label: "CR 57" },
  { key: "dirtTons", label: "Dirt (tons)" },
];
