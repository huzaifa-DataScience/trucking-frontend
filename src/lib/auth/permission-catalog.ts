/**
 * Permission catalog for admin UI — keys must match backend JWT `user.permissions`.
 */

import { PERMISSIONS } from "@/lib/auth/permissions";

export type PermissionGroup = "bidding" | "dashboards" | "siteline" | "admin";

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  group: PermissionGroup;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: PERMISSIONS.biddingRead,
    label: "View bids",
    description: "Open the bidding list and bid sheets.",
    group: "bidding",
  },
  {
    key: PERMISSIONS.biddingWrite,
    label: "Edit bids",
    description: "Create and update bid estimates.",
    group: "bidding",
  },
  {
    key: PERMISSIONS.biddingSummary,
    label: "View bid totals (summary)",
    description:
      "See MIKE/PJ $, margin, labor build-up, and per-system subtotals on the bid sheet.",
    group: "bidding",
  },
  {
    key: "job_dashboard:read",
    label: "Job dashboard",
    description: "View the job operations dashboard.",
    group: "dashboards",
  },
  {
    key: "material_dashboard:read",
    label: "Material dashboard",
    description: "View the material dashboard.",
    group: "dashboards",
  },
  {
    key: "hauler_dashboard:read",
    label: "Hauler dashboard",
    description: "View the hauler dashboard.",
    group: "dashboards",
  },
  {
    key: "forensic:read",
    label: "Forensic reporting",
    description: "View forensic / reconciliation reports.",
    group: "siteline",
  },
  {
    key: "tickets:read",
    label: "Tickets (read)",
    description: "View support tickets.",
    group: "siteline",
  },
  {
    key: "tickets:export",
    label: "Tickets (export)",
    description: "Export ticket data.",
    group: "siteline",
  },
  {
    key: "admin:users",
    label: "Manage users",
    description: "Access the admin user panel.",
    group: "admin",
  },
  {
    key: "admin:create_user",
    label: "Create users",
    description: "Create new user accounts from admin.",
    group: "admin",
  },
];

export const BIDDING_PERMISSIONS = PERMISSION_CATALOG.filter((p) => p.group === "bidding");

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  bidding: "Bidding",
  dashboards: "Dashboards",
  siteline: "Siteline & tickets",
  admin: "Admin",
};
