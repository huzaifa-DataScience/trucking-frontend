"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProcessAward } from "@/lib/bidding/process-types";

/** Awarded / startup — only when workflow.showAward (outcome = awarded). */
export function BidAwardTab() {
  const router = useRouter();
  const {
    bid,
    canWrite,
    refresh,
    setJobId,
    setProcessDirty,
    registerProcessSave,
    confirmLeaveUnsaved,
  } = useBidSheet();
  const [award, setAward] = useState<ProcessAward>({});
  const [jobIdDraft, setJobIdDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const awardRef = useRef<ProcessAward>({});
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid) return;
    const next = { ...(bid.process?.award ?? {}) };
    setAward(next);
    awardRef.current = next;
    setJobIdDraft(bid.jobId != null ? String(bid.jobId) : "");
    setDirty(false);
    setProcessDirty(false);
  }, [bid, setProcessDirty]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    try {
      await biddingApi.patchBid(bid.id, {
        process: { award: awardRef.current },
      });
      setDirty(false);
      setProcessDirty(false);
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save Award"));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [bid, editable, refresh, setProcessDirty]);

  useEffect(() => {
    registerProcessSave(persist);
    return () => registerProcessSave(null);
  }, [persist, registerProcessSave]);

  useEffect(() => {
    setProcessDirty(dirty);
    return () => setProcessDirty(false);
  }, [dirty, setProcessDirty]);

  const patchAward = (next: ProcessAward) => {
    setAward(next);
    awardRef.current = next;
    if (!editable) return;
    setDirty(true);
    setProcessDirty(true);
  };

  if (!bid) return null;

  if (!bid.workflow?.showAward) {
    return (
      <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        <div className="intake-section">
          <div className="intake-section-body text-[12.5px] text-[#4b5563]">
            Awarded / startup appears only after you pick{" "}
            <span className="font-semibold text-[#1f2937]">Awarded</span> on the{" "}
            <Link
              href={`/bidding/${bid.id}?stage=result`}
              className="font-medium text-[#333333] hover:underline"
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  if (!(await confirmLeaveUnsaved())) return;
                  router.push(`/bidding/${bid.id}?stage=result`);
                })();
              }}
            >
              Outcome
            </Link>{" "}
            tab. Lost is a separate Post screen.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="intake-title">Awarded / startup</h2>
          <p className="mt-1 text-[11px] text-[#9ca3af]">
            {saving
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : editable
                  ? "Save to keep changes"
                  : "Read only"}
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void persist()}
            className="intake-head-btn disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-start gap-3 max-[1000px]:grid-cols-1">
        <section className="intake-section min-w-0">
          <div className="intake-section-head">Award details</div>
          <div className="intake-section-body">
            <div className="intake-stack">
              {(
                [
                  ["jobNumber", "Job number"],
                  ["pm", "PM"],
                  ["me", "ME"],
                  ["ops", "Ops"],
                  ["awardDate", "Award date"],
                  ["primeContractor", "Prime contractor"],
                  ["mechanicalContractor", "Mechanical contractor"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="intake-row">
                  <span className="intake-label">{label}</span>
                  <input
                    type={k === "awardDate" ? "date" : "text"}
                    className="intake-field"
                    disabled={!editable}
                    value={String(award[k] ?? "")}
                    onChange={(e) =>
                      patchAward({ ...award, [k]: e.target.value || null })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="intake-section min-w-0">
          <div className="intake-section-head">Linked job</div>
          <div className="intake-section-body">
            <label className="intake-row">
              <span className="intake-label">Job id</span>
              <div className="flex min-w-0 gap-1.5">
                <input
                  className="intake-field min-w-0 flex-1"
                  disabled={!editable}
                  value={jobIdDraft}
                  onChange={(e) => setJobIdDraft(e.target.value)}
                  placeholder="e.g. 451"
                />
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => {
                    const n = jobIdDraft.trim() ? Number(jobIdDraft) : null;
                    if (jobIdDraft.trim() && !Number.isFinite(n)) {
                      setError("Job id must be a number");
                      return;
                    }
                    void setJobId(n, { prefillCompany: false });
                  }}
                  className="intake-head-btn shrink-0 disabled:opacity-50"
                >
                  Save job
                </button>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
