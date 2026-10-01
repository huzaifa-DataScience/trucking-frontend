"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getSpecsErrorMessage } from "@/lib/bidding/specs-errors";
import type { LookupItem } from "@/lib/api/types";

/**
 * Job for Qty Received — PATCH /bids/:id { jobId } anytime (reselect allowed).
 * Backend updates trimbleProjectId with the new job. Not a Trimble picker.
 */
export function SpecsJobSelect({
  bidId,
  jobId,
  canWrite,
  onLinked,
  onError,
}: {
  bidId: string;
  jobId: number | null | undefined;
  canWrite: boolean;
  onLinked: (result: {
    jobId: number | null;
    trimbleProjectId: number | null;
  }) => void;
  onError: (message: string) => void;
}) {
  const [jobs, setJobs] = useState<LookupItem[]>([]);
  const [value, setValue] = useState(jobId != null ? String(jobId) : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(jobId != null ? String(jobId) : "");
  }, [jobId]);

  useEffect(() => {
    if (!canWrite) return;
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
  }, [canWrite]);

  if (!canWrite) return null;

  const apply = async (raw: string) => {
    const nextId = raw ? Number(raw) : null;
    if (raw && !Number.isFinite(nextId)) return;
    if ((nextId ?? null) === (jobId ?? null)) {
      setValue(raw);
      return;
    }
    setValue(raw);
    setBusy(true);
    try {
      const updated = await biddingApi.patchBid(bidId, { jobId: nextId });
      onLinked({
        jobId: updated.jobId ?? null,
        trimbleProjectId: updated.trimbleProjectId ?? null,
      });
    } catch (e) {
      setValue(jobId != null ? String(jobId) : "");
      onError(getSpecsErrorMessage(e, "Failed to link job"));
    } finally {
      setBusy(false);
    }
  };

  const needsPick = jobId == null;
  const jobLabel = (j: LookupItem) => {
    const name = (j.name || "").trim();
    if (name && name !== String(j.id)) return `${name} (#${j.id})`;
    return `Job #${j.id}`;
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 ${
        needsPick
          ? "border-warning-border bg-warning-tint/60"
          : "border-[#e5e7eb] bg-[#f8fafc]"
      }`}
    >
      <label
        className={`shrink-0 text-[12.5px] font-medium ${
          needsPick ? "text-warning" : "text-[#6b7280]"
        }`}
        htmlFor={`specs-job-${bidId}`}
      >
        {needsPick ? "Select Job for Qty Received" : "Job"}
      </label>
      <select
        id={`specs-job-${bidId}`}
        className="intake-field min-w-0 flex-1 cursor-pointer appearance-none disabled:opacity-50"
        disabled={busy}
        value={value}
        onChange={(e) => void apply(e.target.value)}
      >
        <option value="">{needsPick ? "Choose job…" : "No job linked"}</option>
        {jobs.map((j) => (
          <option key={j.id} value={String(j.id)}>
            {jobLabel(j)}
          </option>
        ))}
        {jobId != null && !jobs.some((j) => Number(j.id) === jobId) ? (
          <option value={String(jobId)}>Job #{jobId}</option>
        ) : null}
      </select>
    </div>
  );
}
