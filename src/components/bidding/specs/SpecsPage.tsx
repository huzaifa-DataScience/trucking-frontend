"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useToast } from "@/components/ui/ToastProvider";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SpecsPageSkeleton } from "@/components/bidding/MikeModuleSkeletons";
import { SpecsProductionTabNav } from "@/components/bidding/SpecsProductionTabNav";
import { SpecsSetupStrip } from "@/components/bidding/specs/SpecsSetupStrip";
import { SpecsGrid } from "@/components/bidding/specs/SpecsGrid";
import { CatalogPriceDialog } from "@/components/bidding/specs/CatalogPriceDialog";
import { MikeRulesPanel } from "@/components/bidding/specs/MikeRulesPanel";
import { toastForMikeUpload } from "@/lib/bidding/mikeJobLinkUi";
import { getSpecsErrorMessage, isSpecsNoMikeRows } from "@/lib/bidding/specs-errors";
import type {
  JobLinkInfo,
  MikeFileInfo,
  MikeUploadBuildResult,
  SpecArea,
  SpecFacing,
  SpecLine,
  SpecMaterial,
  SpecSystem,
} from "@/lib/bidding/specs-types";
import type { BidDetail } from "@/lib/bidding/types";

/**
 * Specs Plumb — Mike module.
 * Qty / hours / auto-from-mike merge ALL uploaded Mike files on the bid.
 */
export function SpecsPage({
  bidId,
  embedded = false,
}: {
  bidId: string;
  /** Inside bid lifecycle chrome — hide duplicate nav / library back link */
  embedded?: boolean;
}) {
  const { canRead, canWrite } = useBiddingAccess();
  const { showToast } = useToast();

  const [bid, setBid] = useState<BidDetail | null>(null);
  const [lines, setLines] = useState<SpecLine[]>([]);
  const [mikeFiles, setMikeFiles] = useState<MikeFileInfo[]>([]);
  const [systems, setSystems] = useState<SpecSystem[]>([]);
  const [materials, setMaterials] = useState<SpecMaterial[]>([]);
  const [areas, setAreas] = useState<SpecArea[]>([]);
  const [facings, setFacings] = useState<SpecFacing[]>([]);
  const [jobLink, setJobLink] = useState<JobLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [fileBusyId, setFileBusyId] = useState<number | null>(null);
  const [catalogLine, setCatalogLine] = useState<SpecLine | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const editable = canWrite && bid?.status === "draft";

  const load = useCallback(async () => {
    if (!bidId) return;
    setLoading(true);
    setError(null);
    setLines([]);
    setMikeFiles([]);
    try {
      const [bidRes, lineRes, filesRes, sys, mat, area, face] = await Promise.all([
        biddingApi.getBid(bidId),
        biddingSpecsApi.getSpecLines(bidId),
        biddingSpecsApi.getMikeFiles(bidId).catch(() => ({
          files: [] as MikeFileInfo[],
          activeMikeFileId: null as number | null,
        })),
        biddingSpecsApi.getSpecSystems(),
        biddingSpecsApi.getSpecMaterials(),
        biddingSpecsApi.getSpecAreas(),
        biddingSpecsApi.getSpecFacings(),
      ]);
      setBid(bidRes);
      setLines(lineRes);
      setMikeFiles(filesRes.files ?? []);
      setSystems(sys.filter((s) => s.isActive !== false));
      setMaterials(mat.filter((m) => m.isActive !== false));
      setAreas(area.filter((a) => a.isActive !== false));
      setFacings(face);
    } catch (e) {
      setError(getSpecsErrorMessage(e, "Failed to load Specs"));
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJobLinked = (linked: {
    jobId: number | null;
    trimbleProjectId: number | null;
  }) => {
    setBid((prev) =>
      prev
        ? {
            ...prev,
            jobId: linked.jobId,
            trimbleProjectId: linked.trimbleProjectId,
          }
        : prev
    );
    setJobLink({
      status: linked.trimbleProjectId != null ? "auto_linked" : "already_set",
      message:
        linked.trimbleProjectId != null
          ? "Job linked — Trimble materials can fill Qty Received"
          : "Job linked — waiting for Trimble match",
    });
    showToast(
      linked.trimbleProjectId != null
        ? "Job linked — Qty Received can load"
        : "Job linked",
      "success"
    );
    void load();
  };

  const handleBuilt = (result: MikeUploadBuildResult) => {
    setLines(result.lines);
    setJobLink(result.jobLink);
    if (result.files) setMikeFiles(result.files);
    setBid((prev) =>
      prev
        ? {
            ...prev,
            jobId: result.jobId ?? prev.jobId,
            trimbleProjectId: result.trimbleProjectId ?? prev.trimbleProjectId,
          }
        : prev
    );
    toastForMikeUpload(result, showToast);
  };

  const handleRegenerate = async () => {
    if (mikeFiles.length === 0) {
      showToast("Upload at least one Mike file first", "error");
      return;
    }
    if (lines.length > 0) {
      const ok = confirm(
        "Replace all Spec lines from EVERY Mike file on this bid?"
      );
      if (!ok) return;
    }
    setRegenerating(true);
    try {
      const res = await biddingSpecsApi.autoFromMike(bidId, true);
      setLines(res.lines ?? []);
      showToast(`Regenerated ${res.created} Spec lines (all Mike files)`, "success");
    } catch (e) {
      const msg = getSpecsErrorMessage(e, "Regenerate failed");
      showToast(msg, "error");
      if (isSpecsNoMikeRows(e)) setError(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    setFileBusyId(fileId);
    try {
      await biddingSpecsApi.deleteMikeFile(bidId, fileId);
      await load();
      showToast("File deleted — regenerate Specs to refresh totals", "success");
    } catch (e) {
      showToast(getSpecsErrorMessage(e, "Failed to delete file"), "error");
    } finally {
      setFileBusyId(null);
    }
  };

  const handleAddLine = async () => {
    try {
      const line = await biddingSpecsApi.createSpecLine(bidId, {
        type: "Plumbing",
        systemName: systems[0]?.systemName ?? "Domestic Cold Water",
        areaName: areas[0]?.areaName ?? "All",
        insulation: materials[0]?.description ?? "Fiberglass with ASJ",
        size: 1,
        thickness: 1,
      });
      setLines((prev) => [...prev, line]);
    } catch (e) {
      showToast(getSpecsErrorMessage(e, "Failed to add line"), "error");
    }
  };

  const handlePatch = async (lineId: number, patch: Partial<SpecLine>) => {
    setBusyId(lineId);
    try {
      const updated = await biddingSpecsApi.patchSpecLine(bidId, lineId, {
        type: patch.type,
        systemName: patch.systemName,
        areaName: patch.areaName,
        insulation: patch.insulation,
        size: patch.size,
        thickness: patch.thickness,
        weight: patch.weight,
        facing: patch.facing,
        extraNotes: patch.extraNotes,
      });
      setLines((prev) => prev.map((l) => (l.id === lineId ? updated : l)));
    } catch (e) {
      showToast(getSpecsErrorMessage(e, "Failed to update line"), "error");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (lineId: number) => {
    setBusyId(lineId);
    try {
      await biddingSpecsApi.deleteSpecLine(bidId, lineId);
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    } catch (e) {
      showToast(getSpecsErrorMessage(e, "Failed to delete line"), "error");
    } finally {
      setBusyId(null);
    }
  };

  if (!canRead) {
    return (
      <RestrictedState
        title="Access required"
        message="You do not have permission to open Specs."
        permission={PERMISSIONS.biddingRead}
      />
    );
  }

  if (loading) {
    return <SpecsPageSkeleton />;
  }

  if (error && !bid) {
    return <p className="py-12 text-center text-sm text-danger">{error}</p>;
  }

  const hasMike = mikeFiles.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!embedded ? (
        <div>
          <Link
            href="/estimation-files"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-brand"
          >
            ← Estimation files
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-ink">
            {bid?.estimateNumber ?? "Specs Plumb"}
          </h1>
          <p className="text-sm text-ink/50">
            {bid?.bidName ||
              "One combined takeoff per bid — Specs use the merged Mike data"}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink/50">
            Specs — Mike takeoff qty / hours (merged on this bid)
          </p>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
          >
            Rules
          </button>
        </div>
      )}

      {!embedded ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SpecsProductionTabNav
            bidId={bidId}
            active="specs"
            productionEnabled={Boolean(hasMike && lines.length > 0)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
            >
              Rules
            </button>
            {hasMike && lines.length > 0 ? (
              <Link
                href={`/bidding/${bidId}?stage=production`}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Open production report →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <SpecsSetupStrip
        bidId={bidId}
        jobId={bid?.jobId}
        trimbleProjectId={bid?.trimbleProjectId}
        jobLink={jobLink}
        mikeFiles={mikeFiles}
        lineCount={lines.length}
        canWrite={editable || canWrite}
        regenerating={regenerating}
        fileBusyId={fileBusyId}
        onRegenerate={() => void handleRegenerate()}
        onAddLine={() => void handleAddLine()}
        onBuilt={handleBuilt}
        onJobLinked={handleJobLinked}
        onDeleteFile={(id) => void handleDeleteFile(id)}
        onError={(msg) => showToast(msg, "error")}
      />

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 bg-canvas/40 px-6 py-20 text-center">
          <h3 className="text-base font-semibold text-ink">No Specs yet</h3>
          <p className="max-w-md text-sm text-ink/50">
            Upload Mike CSV(s), then Regenerate Specs. Extra uploads append into
            one takeoff file on this bid.
          </p>
          <Link
            href="/estimation-files"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          >
            Open Estimation files
          </Link>
        </div>
      ) : (
        <SpecsGrid
          lines={lines}
          systems={systems}
          materials={materials}
          areas={areas}
          facings={facings}
          canWrite={editable || canWrite}
          busyId={busyId}
          onPatch={(id, patch) => void handlePatch(id, patch)}
          onDelete={(id) => void handleDelete(id)}
          onOpenCatalog={setCatalogLine}
        />
      )}

      <CatalogPriceDialog
        open={Boolean(catalogLine)}
        onClose={() => setCatalogLine(null)}
        initialSearch={catalogLine?.keyword ?? catalogLine?.materialBase ?? ""}
        size1={catalogLine?.size}
        size2={catalogLine?.thickness}
        onPriceUpdated={() => void load()}
      />

      <MikeRulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
