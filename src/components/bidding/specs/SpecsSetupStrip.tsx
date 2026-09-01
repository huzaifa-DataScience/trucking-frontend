"use client";

import Link from "next/link";
import { SpecsJobSelect } from "./SpecsJobSelect";
import { TrimbleStatusBanner } from "./TrimbleStatusBanner";
import { MikeFilesList } from "./MikeFilesList";
import { MikeUploadButton } from "./MikeUploadButton";
import type {
  JobLinkInfo,
  MikeFileInfo,
  MikeUploadBuildResult,
} from "@/lib/bidding/specs-types";

/**
 * Specs setup — Trimble/Job + one physical Mike takeoff per bid.
 * Extra CSV uploads append into the same Bid_MikeFile.
 */
export function SpecsSetupStrip({
  bidId,
  jobId,
  trimbleProjectId,
  jobLink,
  mikeFiles,
  lineCount,
  canWrite,
  regenerating,
  fileBusyId,
  onRegenerate,
  onAddLine,
  onBuilt,
  onJobLinked,
  onDeleteFile,
  onError,
}: {
  bidId: string;
  jobId: number | null | undefined;
  trimbleProjectId: number | null | undefined;
  jobLink?: JobLinkInfo | null;
  mikeFiles: MikeFileInfo[];
  lineCount: number;
  canWrite: boolean;
  regenerating: boolean;
  fileBusyId?: number | null;
  onRegenerate: () => void;
  onAddLine: () => void;
  onBuilt: (result: MikeUploadBuildResult) => void;
  onJobLinked: (result: {
    jobId: number | null;
    trimbleProjectId: number | null;
  }) => void;
  onDeleteFile: (fileId: number) => void;
  onError: (message: string) => void;
}) {
  const fileCount = mikeFiles.length;
  const totalRows = mikeFiles.reduce((n, f) => n + (f.rowCount || 0), 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
      <TrimbleStatusBanner
        jobId={jobId}
        trimbleProjectId={trimbleProjectId}
        jobLink={jobLink}
        bidEditHref={`/bidding/${bidId}`}
      />

      <SpecsJobSelect
        bidId={bidId}
        jobId={jobId}
        canWrite={canWrite}
        onLinked={onJobLinked}
        onError={onError}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="text-sm text-ink/70">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Takeoff{" "}
          </span>
          <span className="font-medium text-ink">
            {fileCount === 0
              ? "None yet"
              : `${mikeFiles[0]?.fileName || "Mike takeoff"} · ${totalRows.toLocaleString()} rows`}
          </span>
          <span className="mx-2 text-ink/25">·</span>
          <span className="text-xs text-ink/45">More CSVs append here</span>
          <span className="mx-2 text-ink/25">·</span>
          <Link
            href="/estimation-files"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Library
          </Link>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <MikeUploadButton
              bidId={bidId}
              hasExistingLines={lineCount > 0}
              existingTakeoffName={mikeFiles[0]?.fileName}
              existingJobId={jobId}
              onBuilt={onBuilt}
              onError={onError}
              label="Upload Mike files"
            />
            <button
              type="button"
              disabled={fileCount === 0 || regenerating}
              title={
                fileCount === 0
                  ? "Upload at least one Mike file first"
                  : "Rebuild Specs from every Mike file on this bid"
              }
              onClick={onRegenerate}
              className="rounded-xl border border-ink/10 bg-canvas px-3 py-2.5 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand disabled:opacity-45"
            >
              {regenerating ? "Regenerating…" : "Regenerate Specs"}
            </button>
            <button
              type="button"
              onClick={onAddLine}
              className="rounded-xl border border-ink/10 bg-canvas px-3 py-2.5 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
            >
              + Add line
            </button>
          </div>
        ) : null}
      </div>

      <MikeFilesList
        files={mikeFiles}
        canWrite={canWrite}
        busyId={fileBusyId}
        onDelete={onDeleteFile}
      />
    </div>
  );
}
