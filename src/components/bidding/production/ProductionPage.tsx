"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import * as biddingProductionApi from "@/lib/api/endpoints/biddingProduction";
import { getApiErrorMessage } from "@/lib/api/client";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ProductionDetailSkeleton } from "@/components/bidding/MikeModuleSkeletons";
import { SpecsProductionTabNav } from "@/components/bidding/SpecsProductionTabNav";
import { ProductionHoursCompareChart } from "@/components/bidding/production/ProductionHoursCompareChart";
import { ProductionCommodityHoursChart } from "@/components/bidding/production/ProductionCommodityHoursChart";
import { ProductionCommodityTable } from "@/components/bidding/production/ProductionCommodityTable";
import {
  formatMikeFilesMergedHeader,
  type ProductionReport,
} from "@/lib/bidding/production-types";
import type { MikeFileInfo } from "@/lib/bidding/specs-types";
import type { BidDetail } from "@/lib/bidding/types";

/**
 * Mike Production detail — one report per bid (all Mike files combined).
 * FRONTEND_PRODUCTION_REPORT.md §4
 */
export function ProductionPage({
  bidId,
  embedded = false,
}: {
  bidId: string;
  embedded?: boolean;
}) {
  const { canRead } = useBiddingAccess();

  const [bid, setBid] = useState<BidDetail | null>(null);
  const [report, setReport] = useState<ProductionReport | null>(null);
  const [mikeFiles, setMikeFiles] = useState<MikeFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bidId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setMikeFiles([]);
    try {
      const [bidRes, filesRes] = await Promise.all([
        biddingApi.getBid(bidId),
        biddingSpecsApi.getMikeFiles(bidId).catch(() => ({
          files: [] as MikeFileInfo[],
          activeMikeFileId: null as number | null,
        })),
      ]);
      setBid(bidRes);
      setMikeFiles(filesRes.files ?? []);

      try {
        setReport(await biddingProductionApi.getProductionReport(bidId));
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load production report"));
        setReport(null);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load production report"));
      setBid(null);
      setReport(null);
      setMikeFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <RestrictedState
        title="Access required"
        message="You do not have permission to open Production."
        permission={PERMISSIONS.biddingRead}
      />
    );
  }

  // Never flash empty-gate / upload CTA while data is still loading
  if (loading) {
    return <ProductionDetailSkeleton />;
  }

  const specsHref = embedded
    ? `/bidding/${bidId}?stage=takeoff`
    : `/estimation-files/specs/${bidId}`;
  const hasLines = Boolean(report && report.lines.length > 0);
  const hasMike = mikeFiles.length > 0;
  const productionEnabled = Boolean(hasMike && hasLines);
  const showEmptyGate = !error && (!hasMike || !hasLines);

  const mergedHeader = formatMikeFilesMergedHeader(
    report?.mikeFilesMerged,
    mikeFiles.map((f) => f.fileName).filter(Boolean)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!embedded ? (
        <>
          <div>
            <Link
              href="/production"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-brand"
            >
              ← Production
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-ink">
              {bid?.estimateNumber ?? "Production"}
            </h1>
            <p className="text-sm text-ink/50">
              {bid?.bidName ||
                "One report per bid — one Mike takeoff (uploads append into it)"}
            </p>
          </div>
          <SpecsProductionTabNav
            bidId={bidId}
            active="production"
            productionEnabled={productionEnabled || hasLines}
          />
        </>
      ) : (
        <p className="text-sm text-ink/50">
          Production — hours vs Connecteam for this bid’s Mike takeoff
        </p>
      )}

      {mergedHeader ? (
        <p className="rounded-xl border border-ink/[0.08] bg-surface px-3 py-2.5 text-xs text-ink/70">
          <span className="font-semibold text-ink">{mergedHeader}</span>
          <span className="mt-0.5 block text-ink/45">
            Extra CSV uploads append into the same takeoff — Specs + Production
            use that one file.
          </span>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {showEmptyGate ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 bg-canvas/40 px-6 py-20 text-center">
          <h3 className="text-base font-semibold text-ink">
            Generate Specs from Mike first
          </h3>
          <p className="max-w-md text-sm text-ink/50">
            Upload one or more Mike files on this bid, regenerate Specs, then
            open Production.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/estimation-files"
              className="rounded-xl border border-ink/10 bg-surface px-5 py-2.5 text-sm font-semibold text-ink/70"
            >
              Estimation files
            </Link>
            <Link
              href={specsHref}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              Open Specs
            </Link>
          </div>
        </div>
      ) : report ? (
        <>
          {report.jobId == null ? (
            <p className="rounded-xl border border-warning-border bg-warning-tint px-4 py-2.5 text-xs text-warning">
              Link a job on the bid for Trimble received + Connecteam hours
            </p>
          ) : report.trimbleProjectId == null ? (
            <p className="rounded-xl border border-warning-border bg-warning-tint px-4 py-2.5 text-xs text-warning">
              No Trimble project — recv / material-on-site hours may be 0
            </p>
          ) : null}

          <ProductionHoursCompareChart report={report} />
          <ProductionCommodityHoursChart lines={report.lines} />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">
              Full commodity table
            </h3>
            <p className="mb-3 text-xs text-ink/45">
              Every row in the report — zeros included
            </p>
            <ProductionCommodityTable lines={report.lines} />
          </div>
        </>
      ) : null}
    </div>
  );
}
