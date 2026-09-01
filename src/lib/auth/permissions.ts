/**
 * Permission helpers — FRONTEND_RBAC.md
 * Permissions are per role (from JWT). Bidding has a legacy allow-all fallback.
 */

import type { AppRoleId } from "./roles";

export const PERMISSIONS = {
  biddingRead: "bidding:read",
  biddingWrite: "bidding:write",
  biddingSummary: "bidding:summary",
  ticketsRead: "tickets:read",
  ticketsExport: "tickets:export",
  jobDashboardRead: "job_dashboard:read",
  materialDashboardRead: "material_dashboard:read",
  haulerDashboardRead: "hauler_dashboard:read",
  forensicRead: "forensic:read",
  sitelineRead: "siteline:read",
  clearstoryRead: "clearstory:read",
  trimbleRead: "trimble:read",
  connecteamRead: "connecteam:read",
  connecteamWrite: "connecteam:write",
  adminUsers: "admin:users",
  adminCreateUser: "admin:create_user",
  adminRbac: "admin:rbac",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type Permission = PermissionKey | string;

export type PermissionUser = {
  role?: AppRoleId | string | null;
  permissions: string[];
} | null;

function hasBiddingPermission(permissions: string[]): boolean {
  return permissions.some((p) => p.startsWith("bidding:"));
}

/** Strict permission check. Super admin always passes. */
export function can(user: PermissionUser, key: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return !!user.permissions?.includes(key);
}

/**
 * Bidding keys with legacy fallback:
 * if permissions has no `bidding:*` key, allow all bidding UI (old tokens).
 */
export function canBidding(
  user: PermissionUser,
  key: "bidding:read" | "bidding:write" | "bidding:summary"
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const perms = user.permissions ?? [];
  if (!hasBiddingPermission(perms)) return true;
  return perms.includes(key);
}

/**
 * @deprecated Prefer `can(user, key)` / `canBidding(user, key)`.
 * Kept for call sites that pass a permissions array + isAdmin flag.
 */
export function hasPermission(
  permissions: string[],
  permission: Permission,
  options?: { isAdmin?: boolean; role?: string }
): boolean {
  if (options?.role === "super_admin") return true;
  if (String(permission).startsWith("bidding:")) {
    return canBidding(
      { role: options?.role, permissions },
      permission as "bidding:read" | "bidding:write" | "bidding:summary"
    );
  }
  return can({ role: options?.role, permissions }, permission);
}
