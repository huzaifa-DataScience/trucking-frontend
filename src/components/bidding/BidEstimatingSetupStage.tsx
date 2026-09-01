"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import {
  clearanceOptionsFromMeta,
  type ProcessMeta,
  type ProcessTechnicalReview,
  type WageDecision,
} from "@/lib/bidding/process-types";

/** Stage 3 — Estimating Setup (wage decision ≠ wage rate). Spec sheets = next tab. */
export function BidEstimatingSetupStage() {
  const {
    bid,
    draft,
    setDraft,
    setField,
    saving,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [decisions, setDecisions] = useState<WageDecision[]>([]);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
    void biddingApi
      .getWageDecisions()
      .then(setDecisions)
      .catch(() => setDecisions([]));
  }, []);

  if (!bid) return null;

  const clearances = clearanceOptionsFromMeta(meta);
  const review: ProcessTechnicalReview = { ...(draft.technicalReview ?? {}) };
  const suggested = draft.entityRule?.suggestedOurEntity;

  const setReview = (patch: Partial<ProcessTechnicalReview>) => {
    setField("technicalReview", { ...review, ...patch });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Estimating Setup</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Wage decision, PLA, OCIP, lifts, parking, technical review. Spec sheet
          rules are on the next tab. Hand off to Takeoff only when approved.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Draft autosaves" : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {suggested ? (
        <p className="rounded-xl border border-ink/[0.08] bg-canvas/50 px-3 py-2 text-xs text-ink/60">
          Entity rule suggests{" "}
          <span className="font-semibold text-ink">{suggested}</span> — does not
          overwrite company on the bid header.
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Construction type</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.constructionType ?? ""}
            onChange={(e) =>
              setField("constructionType", e.target.value || null)
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Subtype</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.constructionSubtype ?? ""}
            onChange={(e) =>
              setField("constructionSubtype", e.target.value || null)
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>MBE preference</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.mbePreference ?? ""}
            onChange={(e) => setField("mbePreference", e.target.value || null)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Clearance</span>
          <select
            className={inputClass}
            disabled={!editable}
            value={draft.clearance ?? ""}
            onChange={(e) =>
              setField(
                "clearance",
                (e.target.value || null) as typeof draft.clearance
              )
            }
          >
            <option value="">—</option>
            {clearances.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(draft.pla)}
            onChange={(e) => setField("pla", e.target.checked)}
          />
          <span className="text-sm text-ink/80">PLA project</span>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>
            Wage decision # (not the Estimate wage rate)
          </span>
          <select
            className={inputClass}
            disabled={!editable}
            value={
              draft.wageDecisionId != null ? String(draft.wageDecisionId) : ""
            }
            onChange={(e) =>
              setField(
                "wageDecisionId",
                e.target.value ? Number(e.target.value) : null
              )
            }
          >
            <option value="">—</option>
            {decisions.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.label || d.decisionNumber || `Decision #${d.id}`}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-semibold text-ink">
          OCIP / lifts / parking
        </h3>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={draft.buyAmerican === true}
            onChange={(e) =>
              setField("buyAmerican", e.target.checked ? true : null)
            }
          />
          <span className="text-sm text-ink/80">
            Buy American?{" "}
            <span className="text-ink/45">(project-level · federal)</span>
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(draft.ocipCcip?.coversWc)}
            onChange={(e) =>
              setDraft({
                ...draft,
                ocipCcip: {
                  ...(draft.ocipCcip ?? {}),
                  coversWc: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm text-ink/80">OCIP covers WC</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(draft.ocipCcip?.coversGl)}
            onChange={(e) =>
              setDraft({
                ...draft,
                ocipCcip: {
                  ...(draft.ocipCcip ?? {}),
                  coversGl: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm text-ink/80">OCIP covers GL</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(draft.lifts?.needed)}
            onChange={(e) =>
              setDraft({
                ...draft,
                lifts: { ...(draft.lifts ?? {}), needed: e.target.checked },
              })
            }
          />
          <span className="text-sm text-ink/80">Lifts needed</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Lifts add $</span>
          <input
            type="number"
            className={inputClass}
            disabled={!editable}
            value={draft.lifts?.addMoney ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                lifts: {
                  ...(draft.lifts ?? {}),
                  addMoney: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Parking total $</span>
          <input
            type="number"
            className={inputClass}
            disabled={!editable}
            value={draft.parking?.total ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                parking: {
                  ...(draft.parking ?? {}),
                  total: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-semibold text-ink">
          Technical review
        </h3>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Prepared by</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={review.preparedBy ?? ""}
            onChange={(e) => setReview({ preparedBy: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Reviewed by</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={review.reviewedBy ?? ""}
            onChange={(e) => setReview({ reviewedBy: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Review date</span>
          <input
            type="date"
            className={inputClass}
            disabled={!editable}
            value={review.reviewDate?.slice(0, 10) ?? ""}
            onChange={(e) => setReview({ reviewDate: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Comments</span>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            disabled={!editable}
            value={review.comments ?? ""}
            onChange={(e) => setReview({ comments: e.target.value || null })}
          />
        </label>

        <div
          className={`sm:col-span-2 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            review.approvedForTakeoff
              ? "border-emerald-600/25 bg-emerald-50/80"
              : "border-ink/[0.08] bg-canvas/40"
          }`}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {review.approvedForTakeoff
                ? "Approved for takeoff"
                : "Takeoff approval required"}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {review.approvedForTakeoff
                ? "Setup can hand off to Takeoff. You can revoke if review needs another pass."
                : "Complete & Hand Off to Takeoff stays blocked until you approve."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {review.approvedForTakeoff ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Approved
                </span>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setReview({ approvedForTakeoff: false })}
                  className="rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.03] disabled:opacity-40"
                >
                  Revoke approval
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!editable}
                onClick={() =>
                  setReview({
                    approvedForTakeoff: true,
                    reviewDate:
                      review.reviewDate ||
                      new Date().toISOString().slice(0, 10),
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Approve for takeoff
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
