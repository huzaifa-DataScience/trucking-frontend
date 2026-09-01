"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProcessAward } from "@/lib/bidding/process-types";

const SAVE_MS = 800;

/** Awarded / startup — only when workflow.showAward (outcome = awarded). */
export function BidAwardTab() {
  const { bid, canWrite, refresh, setJobId } = useBidSheet();
  const [award, setAward] = useState<ProcessAward>({});
  const [jobIdDraft, setJobIdDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid) return;
    setAward({ ...(bid.process?.award ?? {}) });
    setJobIdDraft(bid.jobId != null ? String(bid.jobId) : "");
  }, [bid]);

  const persist = useCallback(
    async (next: ProcessAward) => {
      if (!bid || !editable) return;
      setSaving(true);
      setError(null);
      try {
        await biddingApi.patchBid(bid.id, {
          process: { award: next },
        });
        await refresh();
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to save Award"));
      } finally {
        setSaving(false);
      }
    },
    [bid, editable, refresh]
  );

  const scheduleAward = (next: ProcessAward) => {
    setAward(next);
    if (!editable) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), SAVE_MS);
  };

  if (!bid) return null;

  if (!bid.workflow?.showAward) {
    return (
      <div className="rounded-2xl border border-ink/[0.08] bg-surface p-6 text-sm text-ink/60">
        Awarded / startup appears only after you pick{" "}
        <span className="font-semibold text-ink">Awarded</span> on the{" "}
        <Link
          href={`/bidding/${bid.id}?stage=result`}
          className="font-medium text-brand underline-offset-2 hover:underline"
        >
          Outcome
        </Link>{" "}
        tab. Lost is a separate Post screen.
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Awarded / startup</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Same bid. Confirm award + leftover startup. Contract tiers / bonds can
          expand next.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Autosave on" : "Read only"}
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
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
          <label key={k} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink/60">{label}</span>
            <input
              type={k === "awardDate" ? "date" : "text"}
              className={inputClass}
              disabled={!editable}
              value={String(award[k] ?? "")}
              onChange={(e) =>
                scheduleAward({ ...award, [k]: e.target.value || null })
              }
            />
          </label>
        ))}
      </section>

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink/60">
            Linked job id (bid.jobId — Trimble / Connecteam)
          </span>
          <div className="flex gap-2">
            <input
              className={inputClass}
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
              className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save job
            </button>
          </div>
        </label>
      </section>
    </div>
  );
}
