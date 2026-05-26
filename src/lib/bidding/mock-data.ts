import type { BidDetail, BidSummary } from "./types";

/** UI prototype data — replace with API when backend bidding module ships. */
export const MOCK_BIDS: BidSummary[] = [
  {
    id: "1",
    estimateNumber: "IDC6098",
    bidName: "SCU Replacement Basement to 6th Floor, East & West",
    status: "draft",
    companyName: "Goel Services, Inc.",
    bidDate: "2026-05-15",
    mikeEstimate: 43837.68,
    pjEstimate: 47600,
    costPerHour: 89.91,
    marginPercent: 0.25,
    completionPercent: 72,
    updatedAt: "2026-05-19T14:32:00Z",
  },
  {
    id: "2",
    estimateNumber: "IDC6102",
    bidName: "Metro Health — Chilled water risers",
    status: "in_review",
    companyName: "Goel DC, LLC",
    bidDate: "2026-05-18",
    mikeEstimate: 28450,
    pjEstimate: 30120,
    costPerHour: 76.4,
    marginPercent: 0.22,
    completionPercent: 91,
    updatedAt: "2026-05-20T09:10:00Z",
  },
  {
    id: "3",
    estimateNumber: "IDC6081",
    bidName: "Union Station — duct wrap phase 2",
    status: "submitted",
    companyName: "DCB",
    bidDate: "2026-04-28",
    mikeEstimate: 112800,
    pjEstimate: 118400,
    costPerHour: 82.15,
    marginPercent: 0.28,
    completionPercent: 100,
    updatedAt: "2026-05-01T16:00:00Z",
  },
];

export function getMockBid(id: string): BidDetail | undefined {
  const base = MOCK_BIDS.find((b) => b.id === id);
  if (!base) return undefined;
  return {
    ...base,
    jobName: base.bidName,
    jobNumber: base.estimateNumber.replace("IDC", "24"),
    mechanicalContractor: "Sample Mechanical Partners LLC",
    projectState: "DC",
    teamCode: "Bil Shams",
    captain: "Mike Johnson",
    bidClerk: "PJ Smith",
  };
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}
