"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { getApiErrorMessage } from "@/lib/api/client";
import { newId } from "@/lib/bidding/newId";
import { DatePicker } from "@/components/ui/DatePicker";
import type {
  BidProcess,
  ProcessFollowUpCompany,
  ProcessIntelligence,
} from "@/lib/bidding/process-types";

const MAX_FOLLOWUP_COMPANIES = 10;
const MAX_FOLLOWUP_CALL_ATTEMPTS = 5;

function emptyFollowUpCompany(): ProcessFollowUpCompany {
  return { id: newId(), companyName: null, contactName: null, phone: null, callAttempts: [] };
}

const labelClass = "text-xs font-semibold text-ink/60";
const inputClass =
  "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

/** Intel tab shell — Follow-up calls / competitors notes — manual Save */
export function BidIntelTab() {
  const {
    bid,
    canWrite,
    refresh,
    setProcessDirty,
    registerProcessSave,
  } = useBidSheet();
  const confirmDialog = useConfirmDialog();
  const [notes, setNotes] = useState("");
  const [followUpCalls, setFollowUpCalls] = useState<ProcessFollowUpCompany[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<{ notes: string; followUpCalls: ProcessFollowUpCompany[] }>({
    notes: "",
    followUpCalls: [],
  });
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid?.process) return;
    const intel = bid.process.intelligence as ProcessIntelligence | undefined;
    const nextNotes = intel?.notes ?? "";
    const nextFollowUpCalls = intel?.followUpCalls ?? [];
    setNotes(nextNotes);
    setFollowUpCalls(nextFollowUpCalls);
    stateRef.current = { notes: nextNotes, followUpCalls: nextFollowUpCalls };
    setDirty(false);
    setProcessDirty(false);
  }, [bid, setProcessDirty]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    const { notes: nextNotes, followUpCalls: nextFollowUpCalls } = stateRef.current;
    const process: Partial<BidProcess> = {
      intelligence: {
        ...(bid.process?.intelligence ?? {}),
        notes: nextNotes || null,
        followUpCalls: nextFollowUpCalls,
      },
    };
    try {
      await biddingApi.patchBid(bid.id, { process });
      setDirty(false);
      setProcessDirty(false);
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save Intel"));
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

  const markDirty = (n: string, f: ProcessFollowUpCompany[]) => {
    stateRef.current = { notes: n, followUpCalls: f };
    if (!editable) return;
    setDirty(true);
    setProcessDirty(true);
  };

  const setCompanies = (next: ProcessFollowUpCompany[]) => {
    setFollowUpCalls(next);
    markDirty(notes, next);
  };

  const patchCompany = (index: number, patch: Partial<ProcessFollowUpCompany>) => {
    setCompanies(followUpCalls.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  if (!bid) return null;

  const area =
    "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand min-h-[6rem]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Post-Bid</h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Follow-up calls and competitor notes. Still Pre — pick win/lose on the Outcome tab next.
            GCs / mechanicals now live on Intake.
          </p>
          <p className="mt-1 text-xs text-ink/40">
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
            className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Follow-up calls</h3>
            <p className="mt-0.5 text-xs text-ink/45">
              Up to {MAX_FOLLOWUP_COMPANIES} companies, each with up to {MAX_FOLLOWUP_CALL_ATTEMPTS} dated call
              attempts.
            </p>
          </div>
          {editable && followUpCalls.length < MAX_FOLLOWUP_COMPANIES ? (
            <button
              type="button"
              className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand/40 hover:text-brand"
              onClick={() => setCompanies([...followUpCalls, emptyFollowUpCompany()])}
            >
              + Add company
            </button>
          ) : null}
        </div>

        {followUpCalls.length === 0 ? (
          <p className="mt-3 text-sm text-ink/40">No follow-up calls logged yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {followUpCalls.map((company, index) => {
              const attempts = company.callAttempts ?? [];
              return (
                <div key={company.id} className="rounded-xl border border-ink/[0.06] p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
                    <label className="flex flex-col gap-1">
                      <span className={labelClass}>Company</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={company.companyName ?? ""}
                        onChange={(e) => patchCompany(index, { companyName: e.target.value || null })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelClass}>Contact name</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={company.contactName ?? ""}
                        onChange={(e) => patchCompany(index, { contactName: e.target.value || null })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelClass}>Phone</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={company.phone ?? ""}
                        onChange={(e) => patchCompany(index, { phone: e.target.value || null })}
                      />
                    </label>
                    {editable ? (
                      <button
                        type="button"
                        aria-label="Remove company"
                        title="Remove company"
                        className="self-end rounded-md p-1.5 pb-2 text-xs font-medium text-danger/80 hover:text-danger"
                        onClick={() => {
                          void (async () => {
                            const ok = await confirmDialog({
                              title: "Remove follow-up company?",
                              message: `Remove "${company.companyName || "this company"}" and its call log?`,
                              confirmLabel: "Remove",
                              variant: "danger",
                            });
                            if (!ok) return;
                            setCompanies(followUpCalls.filter((_, i) => i !== index));
                          })();
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-ink/[0.05] bg-canvas/30 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink/60">Call attempts</span>
                      {editable && attempts.length < MAX_FOLLOWUP_CALL_ATTEMPTS ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand hover:underline"
                          onClick={() =>
                            patchCompany(index, {
                              callAttempts: [
                                ...attempts,
                                { ordinal: attempts.length + 1, dateOfCall: null, remarks: null },
                              ],
                            })
                          }
                        >
                          + Add call
                        </button>
                      ) : null}
                    </div>
                    {attempts.length === 0 ? (
                      <p className="text-xs text-ink/40">No calls logged yet.</p>
                    ) : (
                      attempts.map((attempt, attemptIndex) => (
                        <div key={attemptIndex} className="grid gap-2 sm:grid-cols-[3rem_10rem_1fr_auto]">
                          <span className="flex items-end pb-2 text-xs font-medium text-ink/50">
                            {ordinalLabel(attemptIndex + 1)}
                          </span>
                          <label className="flex flex-col gap-1">
                            <span className={labelClass}>Date of call</span>
                            <DatePicker
                              ariaLabel="Date of call"
                              className={inputClass}
                              disabled={!editable}
                              value={attempt.dateOfCall?.slice(0, 10) ?? ""}
                              onChange={(v) => {
                                const next = attempts.map((a, i) =>
                                  i === attemptIndex ? { ...a, dateOfCall: v || null } : a
                                );
                                patchCompany(index, { callAttempts: next });
                              }}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className={labelClass}>Remarks</span>
                            <input
                              className={inputClass}
                              disabled={!editable}
                              value={attempt.remarks ?? ""}
                              onChange={(e) => {
                                const next = attempts.map((a, i) =>
                                  i === attemptIndex ? { ...a, remarks: e.target.value || null } : a
                                );
                                patchCompany(index, { callAttempts: next });
                              }}
                            />
                          </label>
                          {editable ? (
                            <button
                              type="button"
                              aria-label="Remove call"
                              title="Remove call"
                              className="self-end rounded-md p-1.5 pb-2 text-xs font-medium text-danger/70 hover:text-danger"
                              onClick={() => {
                                const next = attempts
                                  .filter((_, i) => i !== attemptIndex)
                                  .map((a, i) => ({ ...a, ordinal: i + 1 }));
                                patchCompany(index, { callAttempts: next });
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Notes / competitors</span>
        <textarea
          className={area}
          disabled={!editable}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty(e.target.value, followUpCalls);
          }}
        />
      </label>
    </div>
  );
}

function ordinalLabel(n: number): string {
  const suffixes: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
  return suffixes[n] ?? `${n}th`;
}
