/**
 * Companies / branches for the dashboard selector.
 * Backend does not yet expose GET /companies; when it does, replace with API call.
 */

import type { Company } from "@/lib/types";

export const COMPANIES: Company[] = [
  { id: "1", name: "Default Company" },
  { id: "acme", name: "Acme Construction" },
  { id: "beta", name: "Beta Logistics" },
];
