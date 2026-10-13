/** Awarded-job book. Paint API numbers. Do not derive overhead, net, or contacts. */

export type FinancialsView = "active" | "all";

export type FinancialsAlert = "fix" | "not_in_siteline" | "any";

export type ReconCode = "FIX" | "NOT_IN_SITELINE";

export type ReconStatus = "ok" | "fix" | "not_in_siteline";

export type ReconAlert = {
  code: ReconCode;
  label: string;
};

export type JobRecon = {
  sitelineClearstory: ReconStatus;
  difference: number | null;
  overUnderBillings: number | null;
  alerts: ReconAlert[];
};

export type FinancialsAlertCounts = {
  fix: number;
  notInSiteline: number;
};

export type FinancialsCompany = {
  entityId: number;
  company: string;
};

export type FinancialsFilters = {
  companies: FinancialsCompany[];
  views: FinancialsView[];
  alerts: FinancialsAlert[];
  pms: string[];
};

export type SummaryRow = {
  pm: string;
  activeBillings: number;
  backlog: number;
  ar: number;
  atp: number;
  atpPctOfBillings: number | null;
  openJobs: number;
  activeJobs: number;
  retentionOnly: number;
  totalCost: number;
  cashFlow: number | null;
  fixCount: number;
  notInSitelineCount: number;
  overhead: null;
  billingsVsExpense: null;
  net: null;
  pctNet: null;
  netWith75Atp: null;
};

export type SummaryResponse = {
  asOf: string;
  missing: string[];
  alerts: FinancialsAlertCounts;
  rows: SummaryRow[];
  totals: SummaryRow;
};

export type JobStatus = "active" | "inactive" | "siteline_only" | "clearstory_only";

export type BomCompany = {
  entityId: number;
  company: string;
  materialCost: number;
  laborHours: number;
};

export type BomTrimble = {
  projectIds: number[];
  itemCount: number;
  ordered: number;
  received: number;
  orderedMinusReceived: number;
  actualCost: number;
  laborHours: number;
  estLaborHours: number;
  bomBudget: number;
  remaining: number | null;
  pctUsed: number | null;
  bomBudgetPct: number | null;
};

export type JobBom = {
  companies: BomCompany[];
  totals: { materialCost: number; laborHours: number };
  clearstory: {
    contract: number;
    approvedCos: number;
    totalContract: number;
    completionPct: number | null;
  };
  trimble: BomTrimble | null;
  vsCompletion: {
    materialVsCompletion: number | null;
    laborVsCompletion: number | null;
  };
};

export type JobRow = {
  jobNumber: string;
  name: string | null;
  customer: string | null;
  city: string | null;
  state: string | null;
  entityId: number | null;
  company: string | null;
  pm: string | null;
  pmEmail: string | null;
  status: JobStatus;
  contract: {
    amount: number;
    approvedCos: number;
    atp: number;
    inReview: number;
    placeholder: number;
    revised: number;
    siteline: number | null;
    difference: number | null;
  };
  billing: {
    billed: number;
    retainage: number;
    backlog: number | null;
    ar: number;
    pctBilled: number | null;
    percentComplete: number | null;
    retentionOnly: boolean;
  };
  cost: {
    lab: number;
    mat: number;
    sub: number;
    equ: number;
    bur: number;
    ins: number;
    oth: number;
    dis: number;
    total: number;
    labHours: number;
    laborRate: number | null;
    laborWithBurden: number;
    cashFlow: number | null;
  };
  recon: JobRecon;
  bom: JobBom;
  sources: {
    siteline: boolean;
    clearstory: boolean;
    refJob: boolean;
    foundation: boolean;
    trimble: boolean;
  };
};

export type JobsResponse = {
  asOf: string;
  missing: string[];
  alerts: FinancialsAlertCounts;
  jobs: JobRow[];
};

export type FinancialsQuery = {
  entityId?: number;
  pm?: string;
  search?: string;
  view: FinancialsView;
  alert?: FinancialsAlert;
};
