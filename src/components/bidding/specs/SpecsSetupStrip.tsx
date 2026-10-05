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
  addingLine,
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
  addingLine?: boolean;
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

  return (
    <section className="intake-section">
      <div className="intake-section-head-bar">
        <div>
          <h3>Mike takeoff</h3>
        </div>
        <Link
          href="/estimation-files"
          className="text-[12px] font-semibold text-[#5a5340] hover:underline"
        >
          Library
        </Link>
      </div>

      <div className="intake-section-body flex flex-col gap-3">
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
              className="intake-head-btn disabled:opacity-45"
            >
              {regenerating ? "Regenerating…" : "Regenerate Specs"}
            </button>
            <button
              type="button"
              disabled={addingLine}
              onClick={onAddLine}
              className="intake-head-btn disabled:opacity-50"
            >
              {addingLine ? "Adding…" : "+ Add line"}
            </button>
          </div>
        ) : null}

        <MikeFilesList
          files={mikeFiles}
          canWrite={canWrite}
          busyId={fileBusyId}
          onDelete={onDeleteFile}
        />
      </div>
    </section>
  );
}
