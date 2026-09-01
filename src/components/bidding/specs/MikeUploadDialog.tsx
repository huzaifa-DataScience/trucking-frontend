"use client";

import { useEffect, useState } from "react";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { parseMikeFile } from "@/lib/bidding/parseMikeFile";
import type { LookupItem } from "@/lib/api/types";
import type { MikeUploadOptions } from "@/lib/bidding/uploadMikeSpecs";

function stripExt(name: string): string {
  return name.replace(/\.(csv|xlsx|xls)$/i, "").trim() || name;
}

function jobLabel(j: LookupItem): string {
  const name = (j.name || "").trim();
  if (name && name !== String(j.id)) return `${name} (#${j.id})`;
  return `Job #${j.id}`;
}

export type MikeUploadBidOption = {
  id: string | number;
  estimateNumber: string;
  bidName?: string | null;
  /** Existing takeoff name on this estimate (append) */
  existingTakeoffName?: string | null;
};

/**
 * Required before POST mike-files — FRONTEND_BIDDING_SPECS.md §7.1
 * Takeoff name + Job. On library main, also pick estimate (bid).
 */
export function MikeUploadDialog({
  files,
  bids,
  defaultBidId,
  defaultFileName,
  defaultJobId,
  onCancel,
  onConfirm,
}: {
  files: File[];
  /** When set, dialog asks which estimate to upload onto (library main) */
  bids?: MikeUploadBidOption[];
  defaultBidId?: string | null;
  defaultFileName?: string;
  defaultJobId?: number | null;
  onCancel: () => void;
  onConfirm: (values: MikeUploadOptions) => void;
}) {
  const needBid = Boolean(bids && bids.length > 0);
  const [bidId, setBidId] = useState(
    defaultBidId != null ? String(defaultBidId) : ""
  );
  const [fileName, setFileName] = useState(
    defaultFileName?.trim() || stripExt(files[0]?.name || "Mike takeoff")
  );
  const [jobId, setJobId] = useState(
    defaultJobId != null ? String(defaultJobId) : ""
  );
  const [jobNumberHint, setJobNumberHint] = useState("");
  const [projectLabel, setProjectLabel] = useState("");
  const [jobs, setJobs] = useState<LookupItem[]>([]);
  const [parsing, setParsing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void lookupsApi
      .getJobs()
      .then((list) => {
        if (!cancelled) setJobs(list);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setParsing(true);
    void (async () => {
      try {
        if (files[0]) {
          const { meta } = await parseMikeFile(files[0]);
          if (cancelled) return;
          if (meta.jobNumberHint) setJobNumberHint(meta.jobNumberHint);
          if (meta.projectLabel) setProjectLabel(meta.projectLabel);
          if (!defaultFileName?.trim() && files[0].name) {
            setFileName(stripExt(files[0].name));
          }
        }
      } catch {
        /* dialog still usable */
      } finally {
        if (!cancelled) setParsing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files, defaultFileName]);

  useEffect(() => {
    if (jobId || !jobNumberHint || jobs.length === 0) return;
    const hint = jobNumberHint.replace(/^0+/, "");
    const match = jobs.find((j) => {
      const n = (j.name || "").toLowerCase();
      return n.includes(jobNumberHint.toLowerCase()) || n.includes(hint);
    });
    if (match) setJobId(String(match.id));
  }, [jobs, jobNumberHint, jobId]);

  useEffect(() => {
    if (!needBid || !bidId || !bids) return;
    const existing = bids.find((b) => String(b.id) === bidId)?.existingTakeoffName;
    if (existing?.trim()) setFileName(existing.trim());
  }, [needBid, bidId, bids]);

  const submit = () => {
    if (needBid && !bidId) {
      setError("Select an estimate");
      return;
    }
    const name = fileName.trim();
    if (!name) {
      setError("Enter a takeoff name");
      return;
    }
    if (!jobId) {
      setError("Select a job");
      return;
    }
    setError(null);
    onConfirm({
      fileName: name,
      jobId: Number(jobId),
      jobNumberHint: jobNumberHint.trim() || undefined,
      projectLabel: projectLabel.trim() || undefined,
      ...(needBid ? { bidId } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mike-upload-title"
        className="w-full max-w-md rounded-2xl border border-ink/10 bg-surface p-5 shadow-xl"
      >
        <h2 id="mike-upload-title" className="text-lg font-semibold text-ink">
          Upload Mike takeoff
        </h2>
        <p className="mt-1 text-sm text-ink/50">
          {files.length === 1
            ? "1 file — rows append into one takeoff"
            : `${files.length} files — all rows append into one takeoff`}
        </p>

        <ul className="mt-3 max-h-24 overflow-auto rounded-xl border border-ink/[0.06] bg-canvas/40 px-3 py-2 text-xs text-ink/60">
          {files.map((f) => (
            <li key={f.name + f.size} className="truncate">
              {f.name}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-3">
          {needBid && bids ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink/70">
              Estimate
              <select
                value={bidId}
                onChange={(e) => setBidId(e.target.value)}
                className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-normal text-ink"
                autoFocus
              >
                <option value="">Select estimate…</option>
                {bids.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.estimateNumber}
                    {b.bidName ? ` · ${b.bidName}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-xs font-semibold text-ink/70">
            Takeoff name
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-normal text-ink"
              placeholder="e.g. 21437 HQA takeoff"
              autoFocus={!needBid}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-ink/70">
            Job
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm font-normal text-ink"
            >
              <option value="">Select job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={String(j.id)}>
                  {jobLabel(j)}
                </option>
              ))}
            </select>
          </label>

          {jobNumberHint || projectLabel ? (
            <p className="text-[11px] text-ink/40">
              {parsing ? "Reading Mike header…" : null}
              {jobNumberHint ? ` Job # hint: ${jobNumberHint}` : ""}
              {projectLabel ? ` · ${projectLabel}` : ""}
            </p>
          ) : parsing ? (
            <p className="text-[11px] text-ink/40">Reading Mike header…</p>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
