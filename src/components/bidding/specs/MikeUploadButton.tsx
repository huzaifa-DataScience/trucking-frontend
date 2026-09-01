"use client";

import { useRef, useState } from "react";
import { MikeUploadDialog } from "./MikeUploadDialog";
import { getSpecsErrorMessage } from "@/lib/bidding/specs-errors";
import {
  uploadMikeFilesAndBuildSpecs,
  type MikeUploadOptions,
} from "@/lib/bidding/uploadMikeSpecs";
import type { MikeUploadBuildResult } from "@/lib/bidding/specs-types";

/**
 * Pick CSVs → dialog (name + job) → append into one takeoff → auto-from-mike.
 */
export function MikeUploadButton({
  bidId,
  hasExistingLines,
  existingTakeoffName,
  existingJobId,
  disabled,
  label = "Upload Mike files",
  onBuilt,
  onError,
}: {
  bidId: string;
  hasExistingLines: boolean;
  existingTakeoffName?: string | null;
  existingJobId?: number | null;
  disabled?: boolean;
  label?: string;
  onBuilt: (result: MikeUploadBuildResult) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const runUpload = async (files: File[], values: MikeUploadOptions) => {
    if (hasExistingLines) {
      const ok = confirm(
        "Append into this takeoff and rebuild Specs? Existing Spec lines will be replaced."
      );
      if (!ok) return;
    }

    setBusy(true);
    setPendingFiles(null);
    try {
      const result = await uploadMikeFilesAndBuildSpecs(bidId, files, values);
      onBuilt(result);
    } catch (e) {
      onError(getSpecsErrorMessage(e, "Failed to upload Mike file(s)"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const list = e.target.files ? Array.from(e.target.files) : [];
          if (list.length) setPendingFiles(list);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        title="Select one or more CSV / XLSX — name + job next"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(255,123,17,0.35)] disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>

      {pendingFiles ? (
        <MikeUploadDialog
          files={pendingFiles}
          defaultFileName={existingTakeoffName ?? undefined}
          defaultJobId={existingJobId}
          onCancel={() => {
            setPendingFiles(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          onConfirm={(values) => void runUpload(pendingFiles, values)}
        />
      ) : null}
    </>
  );
}
