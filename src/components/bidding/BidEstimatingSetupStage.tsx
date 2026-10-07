"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { DatePicker } from "@/components/ui/DatePicker";
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
    dirty,
    error,
    editable,
  } = useProcessDraft();
  const { setBaseBidField, selectWageRate, lookups } = useBidSheet();
  const inputClass = "intake-field w-full appearance-none";
  const labelClass = "intake-label";
  const sectionHead = "intake-section-head";
  const sectionBody = "intake-section-body";
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
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="intake-title">Handoff</h2>
        <p className="intake-sub mt-0.5">
          {saving ? "Saving…" : dirty ? "Unsaved changes" : editable ? "Save to keep changes" : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="intake-section min-w-0 max-w-md">
        <h3 className={sectionHead}>Internal bid date</h3>
        <div className={`${sectionBody} intake-stack`}>
          <label className="intake-row">
            <span className={labelClass}>Turn-in date</span>
            <DatePicker
              ariaLabel="Internal bid date"
              className={inputClass}
              disabled={!editable}
              value={draft.internalBidDate?.slice(0, 10) ?? ""}
              onChange={(v) => setField("internalBidDate", v || null)}
            />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-3 items-start gap-6 max-[1000px]:grid-cols-1">
        <section className="intake-section min-w-0">
          <h3 className={sectionHead}>Preferences</h3>
          <div className={`${sectionBody} intake-stack`}>
            <label className="intake-row">
              <span className={labelClass}>MBE preference</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={draft.mbePreference ?? ""}
                onChange={(e) => setField("mbePreference", e.target.value || null)}
              />
            </label>
            <label className="intake-row">
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
            <label className="intake-row">
              <span className={labelClass}>Wage decision</span>
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 sm:grid-cols-3">
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
                  disabled={!editable}
                  checked={Boolean(draft.pla)}
                  onChange={(e) => setField("pla", e.target.checked)}
                />
                <span className="font-medium">PLA project</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
                  disabled={!editable}
                  checked={draft.buyAmerican === true}
                  onChange={(e) =>
                    setField("buyAmerican", e.target.checked ? true : null)
                  }
                />
                <span className="font-medium">Buy American</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
                  disabled={!editable}
                  checked={draft.aPlus === true}
                  onChange={(e) =>
                    setField("aPlus", e.target.checked ? true : null)
                  }
                />
                <span className="font-medium">A+</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
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
                <span className="font-medium">OCIP covers WC</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
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
                <span className="font-medium">OCIP covers GL</span>
              </label>
            </div>
          </div>
        </section>

        <section className="intake-section min-w-0">
          <h3 className={sectionHead}>Site logistics</h3>
          <div className={`${sectionBody} intake-stack`}>
            <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
              <input
                type="checkbox"
                disabled={!editable}
                checked={Boolean(b.parking)}
                onChange={(e) => setBaseBidField("parking", e.target.checked)}
              />
              <span className="font-medium">Parking?</span>
            </label>
            <label className="intake-row">
              <span className={labelClass}>% who park</span>
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
            <label className="intake-row">
              <span className={labelClass}>Park $/day</span>
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
            <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
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
              <span className="font-medium">Lifts needed</span>
            </label>
            <label className="intake-row">
              <span className={labelClass}>Lift %</span>
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
            <label className="intake-row">
              <span className={labelClass}>Lift $/4 wk</span>
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
        </section>

        <section className="intake-section min-w-0 row-span-2 max-[1000px]:row-span-1">
          <h3 className={sectionHead}>Wage and schedule</h3>
          <div className={`${sectionBody} intake-stack`}>
            <label className="intake-row">
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
                  disabled={!editable}
                  checked={Boolean(b.citizenProject)}
                  onChange={(e) =>
                    setBaseBidField("citizenProject", e.target.checked)
                  }
                />
                <span className="font-medium">Citizen project</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#374151]">
                <input
                  type="checkbox"
                  className="intake-check-lg"
                  disabled={!editable}
                  checked={Boolean(b.apprenticeable)}
                  onChange={(e) =>
                    setBaseBidField("apprenticeable", e.target.checked)
                  }
                />
                <span className="font-medium">Apprenticeable</span>
              </label>
            </div>
            {(
              [
                ["marginPercent", "Margin"],
                ["hoursPerDay", "Hours / day"],
                ["daysPerWeek", "Days / week"],
                ["durationMonths", "Duration (mo)"],
                ["startInMonths", "Start in # mo"],
                ["backcheckHours", "Backcheck hrs"],
                ["averageNoPeople", "Avg # people"],
                ["materialEscalationPerYear", "Mat. esc. / yr"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="intake-row">
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
          </div>
        </section>

        <section className="intake-section min-w-0 col-span-2 max-[1000px]:col-span-1">
          <h3 className={sectionHead}>Technical review</h3>
          <div className={`${sectionBody} intake-grid`}>
            {bid.workflow?.completeBlockedReason ? (
              <p className="col-span-full text-[12.5px] text-[#9a3412]">
                {bid.workflow.completeBlockedReason}
              </p>
            ) : null}
            <label className="intake-row">
              <span className={labelClass}>Prepared by</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={review.preparedBy ?? ""}
                onChange={(e) => setReview({ preparedBy: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className={labelClass}>Reviewed by</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={review.reviewedBy ?? ""}
                onChange={(e) => setReview({ reviewedBy: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className={labelClass}>Review date</span>
              <DatePicker
                ariaLabel="Review date"
                className={inputClass}
                disabled={!editable}
                value={review.reviewDate?.slice(0, 10) ?? ""}
                onChange={(v) => setReview({ reviewDate: v || null })}
              />
            </label>
            <label className="intake-row col-span-full">
              <span className={labelClass}>Comments</span>
              <textarea
                className={`${inputClass} min-h-[4.5rem] resize-y`}
                disabled={!editable}
                value={review.comments ?? ""}
                onChange={(e) => setReview({ comments: e.target.value || null })}
              />
            </label>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8ecf1] bg-[#f8fafc] px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1f2937]">
                  {review.approvedForTakeoff
                    ? "Approved for takeoff"
                    : "Takeoff approval required"}
                </p>
                <p className="text-[11px] text-[#6b7280]">
                  {review.approvedForTakeoff
                    ? "Setup can hand off to Takeoff. You can revoke if review needs another pass."
                    : "Complete & Hand Off to Takeoff stays blocked until you approve."}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {review.approvedForTakeoff ? (
                  <>
                    <span className="text-[11px] font-semibold text-[#047857]">
                      Approved
                    </span>
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => setReview({ approvedForTakeoff: false })}
                      className="intake-head-btn disabled:opacity-40"
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
                    className="intake-head-btn disabled:opacity-40"
                  >
                    Approve for takeoff
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
