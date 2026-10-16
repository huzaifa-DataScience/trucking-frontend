"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessAward } from "@/lib/bidding/process-types";

/** Awarded / startup — only when workflow.showAward (outcome = awarded). */
export function BidAwardTab() {
  const router = useRouter();
  const { bid, canWrite, setJobId, confirmLeaveUnsaved } = useBidSheet();
  const {
    draft,
    setField,
    persist,
    dirty,
    saving,
    error,
    editable: processEditable,
  } = useProcessDraft();
  const [jobIdDraft, setJobIdDraft] = useState(() =>
    bid?.jobId != null ? String(bid.jobId) : ""
  );
  const [jobError, setJobError] = useState<string | null>(null);
  const editable = processEditable && canWrite && bid?.status !== "archived";
  const award: ProcessAward = { ...(draft.award ?? {}) };

  const patchAward = (next: ProcessAward) => {
    setField("award", next);
  };

  if (!bid) return null;

  if (!bid.workflow?.showAward) {
    return (
      <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
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
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
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

      {error || jobError ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {jobError ?? error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-start gap-6 max-[1100px]:grid-cols-1">
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
                      setJobError("Job id must be a number");
                      return;
                    }
                    setJobError(null);
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
