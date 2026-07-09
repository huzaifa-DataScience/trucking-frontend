"use client";

import { useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Bidding RBAC — legacy users with no `bidding:*` keys keep full access until backend assigns roles.
 */
export function useBiddingAccess() {
  const { can, isAdmin, permissions } = usePermission();

  return useMemo(() => {
    const hasBiddingKeys = permissions.some((p) => p.startsWith("bidding:"));

    const canRead =
      isAdmin ||
      !hasBiddingKeys ||
      can(PERMISSIONS.biddingRead) ||
      can(PERMISSIONS.biddingWrite) ||
      can(PERMISSIONS.biddingSummary);

    const canWrite = isAdmin || !hasBiddingKeys || can(PERMISSIONS.biddingWrite);

    const canSummary = can(PERMISSIONS.biddingSummary);

    return { canRead, canWrite, canSummary, hasBiddingKeys };
  }, [can, isAdmin, permissions]);
}
