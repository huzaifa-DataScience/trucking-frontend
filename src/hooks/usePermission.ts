"use client";

import { useAuth } from "@/contexts/AuthContext";
import { can, canBidding, type Permission } from "@/lib/auth/permissions";

export function usePermission() {
  const { user, permissions, isAdmin } = useAuth();

  return {
    can: (permission: Permission) => can(user, permission),
    canBidding: (key: "bidding:read" | "bidding:write" | "bidding:summary") =>
      canBidding(user, key),
    isAdmin,
    permissions,
    user,
  };
}
