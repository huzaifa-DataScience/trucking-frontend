"use client";

import { DatePicker } from "@/components/ui/DatePicker";
import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { useBidSheet } from "@/contexts/BidSheetContext";
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

/** Stage 3 — Estimating Setup (wage decision ≠ wage rate). Spec sheets = next tab. */
export function BidEstimatingSetupStage() {
  const {
    bid,
    draft,
    setDraft,
    setField,
    saving,
    dirty,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();
  const { setBaseBidField, selectWageRate, lookups } = useBidSheet();
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

  const b = bid.baseBid ?? {};
  const wageRateId = lookups.wageRates.find((w) => w.rateLabel === b.wageRateLabel)?.id ?? "";
  const num = (value: unknown) => (typeof value === "number" ? value : "");

  const clearances = clearanceOptionsFromMeta(meta);
  const review: ProcessTechnicalReview = { ...(draft.technicalReview ?? {}) };

  const setReview = (patch: Partial<ProcessTechnicalReview>) => {
    setField("technicalReview", { ...review, ...patch });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header>
        <h2 className="text-base font-semibold text-ink">Estimating Setup</h2>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : dirty ? "Unsaved changes" : editable ? "Save to keep changes" : "Read only"}
          {" · "}
          Identity (building / GSF / company) is on Intake — wage rate, schedule,
          parking, and lifts are filled here.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
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
        <label className="flex max-w-2xl flex-col gap-1 col-span-full">
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
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
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
          <p className="mb-3 text-xs text-ink/40">
            Calculator inputs. Percents are decimals (0.5 = 50%). Parking people: 1 = 100%.
          </p>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!editable}
                checked={Boolean(b.parking)}
                onChange={(e) => setBaseBidField("parking", e.target.checked)}
              />
              <span className="text-sm text-ink/80">Parking?</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>% who park (1 = 100%)</span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                disabled={!editable}
                value={num(b.parkingPeoplePercent)}
                onChange={(e) =>
                  setBaseBidField(
                    "parkingPeoplePercent",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Parking cost / day</span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                disabled={!editable}
                value={num(b.parkingCostPerDay)}
                onChange={(e) =>
                  setBaseBidField(
                    "parkingCostPerDay",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!editable}
                checked={Boolean(b.liftsNeeded)}
                onChange={(e) => {
                  setBaseBidField("liftsNeeded", e.target.checked);
                  setDraft({
                    ...draft,
                    lifts: { ...(draft.lifts ?? {}), needed: e.target.checked },
                  });
                }}
              />
              <span className="text-sm text-ink/80">Lifts needed</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Lift % (0.5 = 50%)</span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                disabled={!editable}
                value={num(b.liftPercentage)}
                onChange={(e) =>
                  setBaseBidField(
                    "liftPercentage",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Lift cost / 4 weeks</span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                disabled={!editable}
                value={num(b.liftCostPer4Weeks)}
                onChange={(e) =>
                  setBaseBidField(
                    "liftCostPer4Weeks",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <h3 className="col-span-full text-sm font-semibold text-ink">Wage and schedule</h3>
        <p className="col-span-full -mt-2 text-xs text-ink/40">
          Estimate wage rate is not the wage decision above. Margin and escalation are decimals (0.25 = 25%).
        </p>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Wage rate</span>
          <select
            className={inputClass}
            disabled={!editable}
            value={wageRateId === "" ? "" : String(wageRateId)}
            onChange={(e) => {
              if (e.target.value) void selectWageRate(Number(e.target.value));
            }}
          >
            <option value="">Select wage rate…</option>
            {lookups.wageRates.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.displayLabel || w.rateLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(b.citizenProject)}
            onChange={(e) => setBaseBidField("citizenProject", e.target.checked)}
          />
          <span className="text-sm text-ink/80">Citizen project</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(b.apprenticeable)}
            onChange={(e) => setBaseBidField("apprenticeable", e.target.checked)}
          />
          <span className="text-sm text-ink/80">Apprenticeable</span>
        </label>
        {(
          [
            ["marginPercent", "Margin (0.25 = 25%)"],
            ["hoursPerDay", "Hours / day"],
            ["daysPerWeek", "Days / week"],
            ["durationMonths", "Duration (months)"],
            ["startInMonths", "Start in # months"],
            ["backcheckHours", "Backcheck hours"],
            ["averageNoPeople", "Average # people"],
            ["materialEscalationPerYear", "Material escalation / year"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className={labelClass}>{label}</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              disabled={!editable}
              value={num(b[key])}
              onChange={(e) =>
                setBaseBidField(key, e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          </label>
        ))}
      </section>

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <h3 className="col-span-full text-sm font-semibold text-ink">
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
        <label className="flex max-w-2xl flex-col gap-1 col-span-full">
          <span className={labelClass}>Review date</span>
          <DatePicker
            ariaLabel="Review date"
            className={inputClass}
            disabled={!editable}
            value={review.reviewDate?.slice(0, 10) ?? ""}
            onChange={(v) => setReview({ reviewDate: v || null })}
          />
        </label>
        <label className="flex max-w-2xl flex-col gap-1 col-span-full">
          <span className={labelClass}>Comments</span>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            disabled={!editable}
            value={review.comments ?? ""}
            onChange={(e) => setReview({ comments: e.target.value || null })}
          />
        </label>

        <div
          className={`col-span-full flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
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
