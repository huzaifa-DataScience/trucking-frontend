"use client";

import { useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Bidding RBAC — FRONTEND_RBAC.md.
 * Legacy: if JWT has no `bidding:*` keys, allow all bidding UI.
 */
export function useBiddingAccess() {
  const { canBidding, permissions } = usePermission();

  return useMemo(() => {
    const hasBiddingKeys = permissions.some((p) => p.startsWith("bidding:"));

    const canRead =
      canBidding(PERMISSIONS.biddingRead) ||
      canBidding(PERMISSIONS.biddingWrite) ||
      canBidding(PERMISSIONS.biddingSummary);

    const canWrite = canBidding(PERMISSIONS.biddingWrite);
    const canSummary = canBidding(PERMISSIONS.biddingSummary);

    return { canRead, canWrite, canSummary, hasBiddingKeys };
  }, [canBidding, permissions]);
}
