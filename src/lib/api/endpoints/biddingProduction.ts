/**
 * Production report API — FRONTEND_PRODUCTION_REPORT.md
 */
import { get } from "../client";
import type {
  ProductionReport,
  ProductionReportListResponse,
  ProductionReportListRow,
} from "@/lib/bidding/production-types";

function normalizeList(raw: unknown): ProductionReportListResponse {
  if (Array.isArray(raw)) {
    return {
      mergeMode: "all_files_per_bid",
      rows: raw as ProductionReportListRow[],
    };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const rows = Array.isArray(o.rows)
      ? (o.rows as ProductionReportListRow[])
      : Array.isArray(o.data)
        ? (o.data as ProductionReportListRow[])
        : [];
    return {
      mergeMode:
        typeof o.mergeMode === "string" ? o.mergeMode : "all_files_per_bid",
      rows,
    };
  }
  return { mergeMode: "all_files_per_bid", rows: [] };
}

/** One row per bid — never use GET /estimation-files for this list */
export async function listProductionReports(params?: {
  q?: string;
  limit?: number;
}): Promise<ProductionReportListResponse> {
  const raw = await get<unknown>("/production-reports", {
    q: params?.q || undefined,
    limit: params?.limit ?? 200,
  });
  return normalizeList(raw);
}

export async function getProductionReport(
  bidId: string | number
): Promise<ProductionReport> {
  return get<ProductionReport>(`/bids/${bidId}/production-report`);
}
