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

function CheckIcon() {
  return (
    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Custom checkbox row — 20x20 rounded-square box, brand-orange when checked, whole row clickable. */
function CheckboxRow({
  checked,
  disabled,
  onChange,
  label,
  badges,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  badges?: string[];
}) {
  return (
    <label
      className={`group inline-flex w-fit items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${checked ? "bg-brand/[0.06]" : "hover:bg-ink/[0.03]"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-all duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
          checked ? "border-brand bg-brand" : "border-ink/25 bg-white group-hover:border-brand/40"
        }`}
      >
        {checked ? <CheckIcon /> : null}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/85">
        {label}
        {badges?.map((b) => (
          <span
            key={b}
            className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/45"
          >
            {b}
          </span>
        ))}
      </span>
    </label>
  );
}

/** Compact currency input — leading $ prefix, capped width, 8px radius. */
/** Compact currency input — leading $ prefix, capped width, 8px radius. */
function CurrencyField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  disabled?: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex max-w-[360px] flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink/60">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">$</span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="h-11 w-full rounded-lg border border-ink/10 bg-surface py-2 pl-7 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
    </label>
  );
}

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
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Estimating Setup</h2>
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

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:grid-cols-2">
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

      <section className="flex flex-col gap-5 rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/45">Requirements</h3>
          <div className="flex flex-col gap-2">
            <CheckboxRow
              label="Buy American"
              badges={["Project level", "Federal"]}
              disabled={!editable}
              checked={draft.buyAmerican === true}
              onChange={(v) => setField("buyAmerican", v ? true : null)}
            />
            <CheckboxRow
              label="A+"
              badges={["Bid level", "Setup"]}
              disabled={!editable}
              checked={draft.aPlus === true}
              onChange={(v) => setField("aPlus", v ? true : null)}
            />
          </div>
        </div>

        <div className="border-t border-ink/[0.06] pt-5">
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/45">Insurance</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckboxRow
              label="OCIP covers WC"
              disabled={!editable}
              checked={Boolean(draft.ocipCcip?.coversWc)}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  ocipCcip: { ...(draft.ocipCcip ?? {}), coversWc: v },
                })
              }
            />
            <CheckboxRow
              label="OCIP covers GL"
              disabled={!editable}
              checked={Boolean(draft.ocipCcip?.coversGl)}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  ocipCcip: { ...(draft.ocipCcip ?? {}), coversGl: v },
                })
              }
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/45">Site logistics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckboxRow
              label="Lifts needed"
              disabled={!editable}
              checked={Boolean(draft.lifts?.needed)}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  lifts: { ...(draft.lifts ?? {}), needed: v },
                })
              }
            />
            {draft.lifts?.needed ? (
              <CurrencyField
                label="Lift cost"
                disabled={!editable}
                value={draft.lifts?.addMoney}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    lifts: { ...(draft.lifts ?? {}), addMoney: v },
                  })
                }
              />
            ) : null}
            <CurrencyField
              label="Parking cost"
              disabled={!editable}
              value={draft.parking?.total}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  parking: { ...(draft.parking ?? {}), total: v },
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:grid-cols-2">
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
