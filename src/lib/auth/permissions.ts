/**
 * Permission helpers — align keys with backend JWT `user.permissions`.
 * See docs/FRONTEND_AUTH.md; bidding keys are frontend-defined until backend ships them.
 */

export const PERMISSIONS = {
  biddingRead: "bidding:read",
  biddingWrite: "bidding:write",
  /** View MIKE/PJ totals, margin $, labor build-up, per-system subtotals. */
  biddingSummary: "bidding:summary",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

function hasBiddingPermission(permissions: string[]): boolean {
  return permissions.some((p) => p.startsWith("bidding:"));
}

/**
 * Returns true if the user may perform the action.
 * - Admins always pass.
 * - Legacy: if backend sends no `bidding:*` keys yet, allow (existing users unchanged).
 */
export function hasPermission(
  permissions: string[],
  permission: Permission,
  options?: { isAdmin?: boolean }
): boolean {
  if (options?.isAdmin) return true;
  if (permissions.includes(permission)) return true;
  if (!hasBiddingPermission(permissions)) return true;
  return false;
}
