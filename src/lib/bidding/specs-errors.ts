/** Specs API error codes — FRONTEND_BIDDING_SPECS.md §13 */

import { ApiError, getApiErrorMessage } from "@/lib/api/client";

export type SpecsErrorCode =
  | "SPECS_NO_MIKE_ROWS"
  | "SPECS_MIKE_ROWS_INVALID"
  | "SPECS_LINE_INVALID"
  | "SPECS_LINE_NOT_FOUND"
  | "SPECS_BID_NOT_FOUND"
  | "SPECS_CATALOG_NOT_FOUND"
  | "SPECS_CATALOG_PRICE_INVALID"
  | "VALIDATION_FAILED"
  | "DB_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | string;

export function getSpecsErrorCode(error: unknown): SpecsErrorCode | undefined {
  if (error instanceof ApiError && error.code) return error.code;
  return undefined;
}

/** Prefer API `message`; add light hints for known Specs codes. */
export function getSpecsErrorMessage(error: unknown, fallback: string): string {
  const message = getApiErrorMessage(error, fallback);
  const code = getSpecsErrorCode(error);

  switch (code) {
    case "SPECS_NO_MIKE_ROWS":
      return message || "Upload a Mike file first, then generate Spec lines.";
    case "SPECS_LINE_NOT_FOUND":
      return message || "Spec line not found — refresh the grid.";
    case "SPECS_BID_NOT_FOUND":
      return message || "Workspace not found.";
    case "DB_UNAVAILABLE":
      return message || "Database unavailable — try again in a moment.";
    case "UNAUTHORIZED":
      return message || "Session expired — please sign in again.";
    default:
      return message;
  }
}

/** True when UI should prompt Mike upload (auto-gen without rows). */
export function isSpecsNoMikeRows(error: unknown): boolean {
  return getSpecsErrorCode(error) === "SPECS_NO_MIKE_ROWS";
}
