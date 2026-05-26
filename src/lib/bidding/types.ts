export type BidStatus = "draft" | "in_review" | "submitted" | "won" | "lost" | "archived";

export type BidWizardStepId = "startup" | "base-bid" | "labor" | "review";

export interface BidSummary {
  id: string;
  estimateNumber: string;
  bidName: string;
  status: BidStatus;
  companyName: string;
  bidDate: string;
  mikeEstimate: number;
  pjEstimate: number;
  costPerHour: number;
  marginPercent: number;
  completionPercent: number;
  updatedAt: string;
}

export interface BidInsights {
  mikeEstimate: number;
  pjEstimate: number;
  costPerHourMike: number;
  costPerHourPj: number;
  marginPercent: number;
  wageTotal: number;
  liftTotal: number;
  completionPercent: number;
  isRecalculating?: boolean;
}

export interface BidDetail extends BidSummary {
  jobName: string;
  jobNumber: string;
  mechanicalContractor: string;
  projectState: string;
  teamCode: string;
  captain: string;
  bidClerk: string;
}
