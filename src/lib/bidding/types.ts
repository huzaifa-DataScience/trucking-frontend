/** API-aligned types — see BIDDING_FRONTEND_API.md */

export type BidStatus = "draft" | "submitted" | "archived";

export type BidSystemKey =
  | "duct1"
  | "duct2"
  | "hydronic1"
  | "hydronic2"
  | "plumbing1"
  | "plumbing2"
  | "vrf"
  | "equipment";

export interface BidListItem {
  id: string;
  estimateNumber: string;
  bidName: string;
  status: BidStatus;
  ourEntityId: number;
  companyName: string;
  bidDate: string;
  updatedAt: string;
}

/** Known keys; backend stores baseBid as a loose object (passthrough). */
export interface BaseBidInput {
  [key: string]: unknown;
  marginPercent?: number;
  projectState?: string;
  salesTaxApplicable?: boolean;
  stateSalesTaxRate?: number;
  hoursPerDay?: number;
  daysPerWeek?: number;
  durationMonths?: number;
  startInMonths?: number;
  bidDate?: string;
  gsfOfBuilding?: number;
  parking?: boolean;
  parkingCostPerDay?: number;
  parkingPeoplePercent?: number;
  liftsNeeded?: boolean;
  liftPercentage?: number;
  liftCostPer4Weeks?: number;
  averageNoPeople?: number;
  materialEscalationPerYear?: number;
  laborRateCompositePerHour?: number;
  teamName?: string;
  assistantEstimator?: string;
  projectType?: string;
  buildingType?: string;
  preference?: string;
  wageRateLabel?: string;
  ccipCoversWc?: boolean;
  citizenProject?: boolean;
  apprenticeable?: boolean;
  pla?: boolean;
}

export interface BidSystemRow {
  key: BidSystemKey;
  used?: boolean;
  mikeEstimateNumber?: number;
  materials?: number;
  laborHours?: number;
  mikeTotalPrice?: number;
  quantity?: number;
}

export type BidComputed = Record<string, unknown>;

export interface BidDetail extends BidListItem {
  jobId: number | null;
  baseBid: BaseBidInput;
  systems: BidSystemRow[];
  computed: BidComputed;
}

export interface CalcResult {
  version: string;
  computed: BidComputed;
  errors: { field: string; message: string }[];
  warnings: string[];
}

export interface BidTeam {
  id: number;
  teamName: string;
  captain: string | null;
  bidClerk: string | null;
  duct1: string | null;
  duct2: string | null;
  hydronic1: string | null;
  hydronic2: string | null;
  plumbing1: string | null;
  plumbing2: string | null;
}

export interface BidWageRate {
  id: number;
  rateLabel: string;
  wage: number;
  fringe: number;
  total: number;
  displayLabel: string;
  wageAsOf: string | null;
}

export interface BurdenedRateResult {
  wageRateId: number;
  rateLabel: string;
  wage: number;
  burdenedRate: number;
  totalBurden: number;
  lines: { code: string; label: string; amountPerHour: number }[];
}

export interface BidStateLookup {
  stateCode: string;
  salesTaxRate: number;
}

export interface LookupNameItem {
  id: number;
  name: string;
}

export interface CreateBidBody {
  ourEntityId: number;
  jobId?: number | null;
  estimateNumber: string;
  bidName?: string;
  bidDate?: string;
}

export interface PatchBidBody {
  status?: BidStatus;
  estimateNumber?: string;
  bidName?: string;
  bidDate?: string;
  ourEntityId?: number;
  baseBid?: BaseBidInput;
  systems?: BidSystemRow[];
  /** Client Excel engine snapshot; stored verbatim (source: client). */
  computed?: BidComputed;
}

export interface CalculateBidBody {
  forceServerCalc?: boolean;
}

export interface BidInsights {
  mikeEstimate: number;
  pjEstimate: number;
  costPerHourMike: number;
  costPerHourPj: number;
  marginPercent: number;
  completionPercent: number;
  isRecalculating?: boolean;
}
