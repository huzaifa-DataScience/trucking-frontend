/**
 * API layer – single entry point.
 * All modules use the same client instance (see client.ts).
 */

export { get, getBlob, ApiError } from "./client";
export { getApiUrl, getBaseUrl } from "./config";
export * from "./types";

export * as lookups from "./endpoints/lookups";
export * as jobDashboard from "./endpoints/job-dashboard";
export * as materialDashboard from "./endpoints/material-dashboard";
export * as haulerDashboard from "./endpoints/hauler-dashboard";
export * as forensic from "./endpoints/forensic";
export * as tickets from "./endpoints/tickets";
