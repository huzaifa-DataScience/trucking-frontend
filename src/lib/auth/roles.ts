/**
 * App roles — FRONTEND_RBAC.md
 */

export type AppRoleId =
  | "super_admin"
  | "admin"
  | "bid_clerk"
  | "captain"
  | "assistant_estimator"
  | "project_manager"
  | "operations_manager"
  | "user";

/** @deprecated Use AppRoleId */
export type AuthRole = AppRoleId;

export const APP_ROLE_IDS: AppRoleId[] = [
  "super_admin",
  "admin",
  "bid_clerk",
  "captain",
  "assistant_estimator",
  "project_manager",
  "operations_manager",
  "user",
];

/** Fallback labels when GET /admin/rbac is unavailable. Prefer API roles[].label. */
export const APP_ROLE_LABELS: Record<AppRoleId, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  bid_clerk: "Bid clerk",
  captain: "Captain",
  assistant_estimator: "Assistant estimator",
  project_manager: "Project manager",
  operations_manager: "Operations manager",
  user: "Legacy user",
};

const ROLE_SET = new Set<string>(APP_ROLE_IDS);

export function isAppRoleId(raw: unknown): raw is AppRoleId {
  return typeof raw === "string" && ROLE_SET.has(raw);
}

/** Coerce API / storage role; unknown → legacy `user`. */
export function normalizeAppRole(raw: unknown): AppRoleId {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (isAppRoleId(s)) return s;
  return "user";
}

/** Who sees Admin layout — FRONTEND_RBAC.md (not admin:rbac). */
export function isAdminPanelRole(role: AppRoleId | string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function roleLabel(role: AppRoleId | string): string {
  if (isAppRoleId(role)) return APP_ROLE_LABELS[role];
  return String(role);
}
