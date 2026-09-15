/** WFS — FRONTEND_WFS.md (Dashboard Pro Loans v44) */

export type WfsCompanyKey =
  | "goel"
  | "dcb"
  | "goel_dc"
  | "ati"
  | "g3"
  | "dmv_demo"
  | "dmv_insul"
  | string;

export type WfsCompanyKind = "arap" | "cash" | "property" | string;

export type WfsAgingSide = "ar" | "ap";

export interface WfsStatus {
  foundation?: boolean;
  plaid?: boolean;
  missing?: string[];
  asOf?: string | null;
  [key: string]: unknown;
}

export interface WfsKpi {
  value: number;
  delta: number | null;
  deltaPct: number | null;
}

export interface WfsComparedTo {
  asOf: string | null;
  totalEquity: number;
  availableCash: number;
  ar: number;
  ap: number;
  netArAp: number;
}

export interface WfsCompanyRow {
  key: WfsCompanyKey;
  label: string;
  ourEntityId: number | null;
  kind: WfsCompanyKind;
  bank: number;
  pnotes: number;
  locLimit: number;
  borrowing: number;
  availCredit: number;
  otherLoans: number;
  totalDebt: number;
  ar: number | null;
  ap: number | null;
  netArAp: number | null;
  availCash: number;
  equity: number;
}

export interface WfsTotals {
  bank: number;
  pnotes: number;
  locLimit: number;
  borrowing: number;
  availCredit: number;
  otherLoans: number;
  totalDebt: number;
  ar: number | null;
  ap: number | null;
  netArAp: number | null;
  availCash: number;
  equity: number;
  agingAr?: number | null;
  agingAp?: number | null;
}

export interface WfsAgingRow {
  companyKey: WfsCompanyKey;
  label: string;
  type: WfsAgingSide;
  current: number;
  d31: number;
  d61: number;
  d90: number;
  retainage: number;
  total: number;
}

export interface WfsProperty {
  value: number;
  evaluationDate: string | null;
  debt: number;
  cashHeld: number;
  netEquity: number;
  shareOfGroupEquity: number | null;
}

export interface WfsEquityCashPoint {
  date: string;
  label: string;
  totalEquity: number;
  availableCash: number;
}

export interface WfsEquityByCompanyPoint {
  date: string;
  label: string;
  goel: number;
  dcb: number;
  goelDc: number;
  other: number;
}

export interface WfsArApByCompanyPoint {
  date: string;
  label: string;
  goel: number;
  dcb: number;
  goelDc: number;
}

export interface WfsArVsApBar {
  key: string;
  label: string;
  ar: number;
  ap: number;
}

/** AR aging chart series — not the same as `aging[]` table. */
export interface WfsArAgingBar {
  key: string;
  label: string;
  current: number;
  d31: number;
  d61: number;
  d90: number;
  retainage: number;
  total: number;
}

/**
 * Excel v44 2×3 charts — FRONTEND_WFS.md order:
 * equityCash | arVsAp
 * equityByCompany | arAging
 * arByCompany | apByCompany
 */
export interface WfsCharts {
  equityCash: WfsEquityCashPoint[];
  arVsAp: WfsArVsApBar[];
  equityByCompany: WfsEquityByCompanyPoint[];
  arAging: WfsArAgingBar[];
  arByCompany: WfsArApByCompanyPoint[];
  apByCompany: WfsArApByCompanyPoint[];
}

export interface WfsDashboard {
  title: string;
  subtitle: string;
  asOf: string | null;
  cadence: string;
  nextSnapshotDate: string;
  comparedTo: WfsComparedTo | null;
  sources: {
    foundation: boolean;
    plaid: boolean;
    missing: string[];
  };
  kpis: {
    totalEquity: WfsKpi;
    availableCash: WfsKpi;
    totalAr: WfsKpi;
    totalAp: WfsKpi;
    netArAp: WfsKpi;
  };
  charts?: WfsCharts | null;
  companies: WfsCompanyRow[];
  totals: WfsTotals;
  aging: WfsAgingRow[];
  property: WfsProperty;
}

export interface WfsAgingLine {
  id?: string | number;
  invoiceNumber?: string | null;
  vendor?: string | null;
  customer?: string | null;
  companyKey?: WfsCompanyKey;
  dueDate?: string | null;
  amount?: number | null;
  current?: number | null;
  d31?: number | null;
  d61?: number | null;
  d90?: number | null;
  retainage?: number | null;
  total?: number | null;
  [key: string]: unknown;
}

export interface WfsCashRow {
  id?: string | number;
  companyKey?: WfsCompanyKey | null;
  label?: string | null;
  accountName?: string | null;
  institution?: string | null;
  balance?: number | null;
  asOf?: string | null;
  [key: string]: unknown;
}

export type WfsStaticKind =
  | "loc_limit"
  | "loc_drawn"
  | "pnote"
  | "mortgage"
  | "equipment_loan"
  | "property_value"
  | "extra_cash"
  | string;

export interface WfsStaticItem {
  id: number;
  kind: WfsStaticKind;
  label?: string | null;
  amount: number;
  asOfDate?: string | null;
  companyKey?: WfsCompanyKey | null;
  [key: string]: unknown;
}

export interface WfsStaticPatchItem {
  id: number;
  amount?: number;
  label?: string | null;
  asOfDate?: string | null;
}
