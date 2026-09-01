"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSpecsErrorMessage } from "@/lib/bidding/specs-errors";
import type { EstimationFileDetail as Detail } from "@/lib/bidding/specs-types";

/**
 * Legacy per-file URL — redirect into the bid’s combined Specs takeoff.
 * Backend joins all uploads; there is no separate takeoff per CSV.
 */
export function EstimationFileDetail({ fileId }: { fileId: string }) {
  const { canRead } = useBiddingAccess();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const detail: Detail = await biddingSpecsApi.getEstimationFile(fileId);
      const bidId = detail.bidId ?? detail.bid?.id;
      if (bidId != null) {
        router.replace(`/estimation-files/specs/${bidId}`);
        return;
      }
      setError("This file is not linked to a bid");
    } catch (e) {
      setError(getSpecsErrorMessage(e, "Failed to open estimation file"));
    }
  }, [fileId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <RestrictedState
        title="Access required"
        message="You do not have permission to open Estimation files."
        permission={PERMISSIONS.biddingRead}
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/estimation-files" className="text-sm font-medium text-brand">
          ← Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24">
      <LogoLoader />
      <p className="text-sm text-ink/50">Opening combined takeoff…</p>
    </div>
  );
}
