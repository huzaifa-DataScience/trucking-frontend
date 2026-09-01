/** Production report — FRONTEND_PRODUCTION_REPORT.md */

export type ProductionStatus = "green" | "red" | "unknown";

export interface ProductionReportConnecteam {
  linked: boolean;
  refJobId: number | null;
  jobNumber: string | null;
  normalizedJobNumber: string | null;
  actualHours: number | null;
  actualMinutes: number | null;
  shiftCount: number | null;
  /** Unique workers who clocked on this job */
  workerCount?: number | null;
  /** actualHours ÷ workerCount */
  averageHoursPerWorker?: number | null;
  jobLabel: string | null;
}

export interface ProductionReportLine {
  commodityKey: string;
  type: string | null;
  insulation: string;
  materialBase: string | null;
  catalogMatchMode: string; // "pipe" | "roll"
  size: number;
  thickness: number;
  weight: string | null;
  facing: string | null;
  qtyEstimated: number;
  hoursEstimated: number;
  productionPerHour: number | null;
  qtyReceived: number;
  qtyReceivedSf: number | null;
  hoursEstimatedFromReceived: number | null;
  qtyRemain: number;
  specLineIds: number[];
}

export interface MikeFilesMerged {
  count: number;
  fileIds: number[];
  fileNames: string[];
}

export interface ProductionReportTotals {
  hoursEstimatedMike: number;
  hoursEstimatedFromReceived: number;
  actualHours: number | null;
  /** Unique workers who clocked on this job */
  workerCount?: number | null;
  /** actualHours ÷ workerCount */
  averageHoursPerWorker?: number | null;
  varianceHours: number | null;
  status: ProductionStatus;
  actualHoursSource?: "connecteam" | string;
}

export interface ProductionReport {
  bidId: number;
  jobId: number | null;
  jobNumber: string | null;
  trimbleProjectId: number | null;
  /** All Mike uploads merged into Specs / Production calcs */
  mikeFilesMerged?: MikeFilesMerged | null;
  connecteam: ProductionReportConnecteam;
  lines: ProductionReportLine[];
  totals: ProductionReportTotals;
}

/** GET /production-reports — one row per bid (already merged metadata) */
export interface ProductionReportListRow {
  bidId: number;
  estimateNumber: string | null;
  bidName: string | null;
  jobNumber: string | null;
  fileCount: number;
  fileNames: string[];
  fileIds?: number[];
  totalRows?: number;
  specLineCount: number;
  latestUploadAt: string | null;
  productionReportPath?: string;
}

export interface ProductionReportListResponse {
  mergeMode: "all_files_per_bid" | string;
  rows: ProductionReportListRow[];
}

export function fmtProductionHours(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function commodityChartLabel(line: ProductionReportLine): string {
  const base = line.materialBase || line.insulation || "Commodity";
  const thick =
    line.thickness != null && !Number.isNaN(line.thickness)
      ? ` ${line.thickness}″`
      : "";
  return `${base}${thick}`.trim();
}

export function formatMikeFilesMergedHeader(
  merged: MikeFilesMerged | null | undefined,
  fallbackNames?: string[]
): string | null {
  const names =
    merged?.fileNames?.filter(Boolean) ??
    fallbackNames?.filter(Boolean) ??
    [];
  const count = merged?.count ?? names.length;
  if (!count && names.length === 0) return null;
  // Backend physically appends into one Bid_MikeFile (e.g. COMBINED TAKEOFF.csv)
  if (count === 1 || names.length === 1) {
    return `Mike takeoff: ${names[0] ?? "COMBINED TAKEOFF.csv"}`;
  }
  const list = names.join(", ");
  return `Using ${count} estimation files (combined): ${list}`;
}
