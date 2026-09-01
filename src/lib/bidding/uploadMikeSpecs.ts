/**
 * Happy path: dialog → POST mike-files (append).
 * Backend auto-regenerates Specs (`specsRegenerated`); FE falls back to auto-from-mike if missing.
 */
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { parseMikeFile } from "@/lib/bidding/parseMikeFile";
import type { MikeUploadBuildResult } from "@/lib/bidding/specs-types";

export type MikeUploadOptions = {
  /** User-chosen takeoff display name — required */
  fileName: string;
  /** User-picked job — preferred */
  jobId?: number | null;
  jobNumberHint?: string;
  projectLabel?: string;
  rebuildSpecs?: boolean;
  /** Set when library dialog picks the target bid */
  bidId?: string;
};

export async function uploadMikeAndBuildSpecs(
  bidId: string,
  file: File,
  options: MikeUploadOptions
): Promise<MikeUploadBuildResult> {
  return uploadMikeFilesAndBuildSpecs(bidId, [file], options);
}

/** Upload one or more CSVs into ONE takeoff (same fileName + jobId each append). */
export async function uploadMikeFilesAndBuildSpecs(
  bidId: string,
  files: File[],
  options: MikeUploadOptions
): Promise<MikeUploadBuildResult> {
  if (files.length === 0) {
    throw new Error("Select at least one Mike CSV / XLSX file");
  }
  const takeoffName = options.fileName.trim();
  if (!takeoffName) {
    throw new Error("Enter a takeoff name");
  }

  const rebuildSpecs = options?.rebuildSpecs !== false;
  let imported = 0;
  let lastCreated: Awaited<
    ReturnType<typeof biddingSpecsApi.createMikeFile>
  > | null = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { rows, meta } = await parseMikeFile(file);
    if (rows.length === 0) {
      throw new Error(
        `“${file.name}”: no usable Mike rows. Need Size, Thickness, and Quantity columns.`
      );
    }
    lastCreated = await biddingSpecsApi.createMikeFile(bidId, {
      fileName: takeoffName,
      rows,
      jobId: options.jobId ?? undefined,
      jobNumberHint:
        options.jobNumberHint?.trim() || meta.jobNumberHint || undefined,
      projectLabel:
        options.projectLabel?.trim() || meta.projectLabel || undefined,
      activate: i === files.length - 1,
    });
    imported += lastCreated.imported;
  }

  let lines = [] as MikeUploadBuildResult["lines"];
  let createdCount = 0;
  if (rebuildSpecs) {
    const regen = lastCreated?.specsRegenerated;
    if (regen) {
      createdCount = regen.created ?? regen.lineCount ?? 0;
      if (Array.isArray(regen.lines) && regen.lines.length > 0) {
        lines = regen.lines;
      } else {
        lines = await biddingSpecsApi.getSpecLines(bidId).catch(() => []);
      }
    } else {
      const built = await biddingSpecsApi.autoFromMike(bidId, true);
      lines = built.lines ?? [];
      createdCount = built.created;
    }
  }

  const list = await biddingSpecsApi.getMikeFiles(bidId).catch(() => ({
    files: lastCreated?.mikeFile ? [lastCreated.mikeFile] : [],
    activeMikeFileId: lastCreated?.mikeFile?.id ?? null,
  }));

  return {
    imported,
    created: createdCount,
    lines,
    jobId: lastCreated?.jobId ?? options.jobId ?? null,
    trimbleProjectId: lastCreated?.trimbleProjectId ?? null,
    jobLink: lastCreated?.jobLink ?? null,
    mikeFile: lastCreated?.mikeFile ?? null,
    files: list.files,
    activeMikeFileId:
      list.activeMikeFileId ?? lastCreated?.mikeFile?.id ?? null,
  };
}

export function jobLinkNeedsManualSelect(
  status: string | null | undefined
): boolean {
  return status === "not_found" || status === "no_hint";
}
