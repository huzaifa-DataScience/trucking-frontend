/** API-aligned types — see docs/BIDDING_FRONTEND_API.md */

import type {
  BidProcess,
  BidWorkflow,
  ProcessOutcome,
  ProcessStage,
  WorkType,
} from "./process-types";

export type {
  BidProcess,
  BidWorkflow,
  ProcessOutcome,
  ProcessStage,
  WorkType,
} from "./process-types";

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
  /** Our entity (GOEL / GOEL DC / DCB). */
  companyName: string;
  /** Client/GC from companyInfo.companyName. */
  clientCompanyName?: string | null;
  bidDate: string;
  submitDate?: string | null;
  timeEstimate?: number | null;
  updatedAt: string;
  /** Lifecycle list filters — BIDDING_FRONTEND_API §0 */
  processStage?: ProcessStage | string | null;
  outcomeStatus?: ProcessOutcome | string | null;
  workType?: WorkType | string | null;
  /** Intake duplicate typeahead — FRONTEND_INTAKE.md */
  drawingName?: string | null;
  ownerProjectNumber?: string | null;
  mechanicalEngineerProjectNumber?: string | null;
  relatedBidId?: number | null;
  bidKind?: string | null;
  dueDate?: string | null;
}

export interface BidCompanyInfo {
  companyName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export type BidAttachmentMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "text/csv";

export interface BidAttachment {
  id: number;
  fileId: number;
  fileName: string;
  mimeType: BidAttachmentMime;
  sizeBytes: number;
  label: string | null;
  sortOrder: number;
  downloadPath: string;
  createdAt: string;
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
  clientCompanyName?: string | null;
  companyInfo?: BidCompanyInfo;
  attachments?: BidAttachment[];
  baseBid: BaseBidInput;
  systems: BidSystemRow[];
  computed: BidComputed;
  /** StructShare / Trimble project for Specs Qty Received — FRONTEND_BIDDING_SPECS.md */
  trimbleProjectId?: number | null;
  /** Lifecycle JSON — editable after submit until archived */
  process?: BidProcess | null;
  /** Gates — read from GET; do not invent */
  workflow?: BidWorkflow | null;
  activitySummary?: {
    attendeeCount?: number;
    changeCount?: number;
    lastActivityAt?: string | null;
    lastActivityByEmail?: string | null;
  } | null;
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
  assistantEstimator?: string | null;
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
  submitDate?: string | null;
  timeEstimate?: number | null;
  companyInfo?: BidCompanyInfo;
  trimbleProjectId?: number | null;
  process?: Partial<BidProcess> | null;
}

export interface PatchBidBody {
  status?: BidStatus;
  jobId?: number | null;
  estimateNumber?: string;
  bidName?: string;
  bidDate?: string;
  submitDate?: string | null;
  timeEstimate?: number | null;
  ourEntityId?: number;
  companyInfo?: BidCompanyInfo;
  baseBid?: BaseBidInput;
  systems?: BidSystemRow[];
  /** Client Excel engine snapshot; stored verbatim (source: client). */
  computed?: BidComputed;
  trimbleProjectId?: number | null;
  /** Lifecycle — objects merge; arrays replace */
  process?: Partial<BidProcess> | null;
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

export type PayrollBurdenRateType = "pct_wage" | "capped_annual" | "per_hour";

export interface PayrollBurdenItem {
  id: number;
  code: string;
  label: string;
  rateType: PayrollBurdenRateType;
  rate: number;
  annualCap: number | null;
  hoursBasis: number | null;
  includeInBaseRate: boolean;
}

export interface CreateWageRateBody {
  rateLabel: string;
  wage: number;
  fringe: number;
  displayLabel?: string;
  wageAsOf?: string;
}

export type UpdateWageRateBody = Partial<CreateWageRateBody>;

export interface CreatePayrollBurdenBody {
  code: string;
  label: string;
  rateType: PayrollBurdenRateType;
  rate: number;
  annualCap?: number | null;
  hoursBasis?: number | null;
  includeInBaseRate?: boolean;
}

export type UpdatePayrollBurdenBody = Partial<CreatePayrollBurdenBody>;
