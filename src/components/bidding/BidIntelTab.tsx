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
  return {
    id: newId(),
    companyName: null,
    contactName: null,
    phone: null,
    callAttempts: [],
  };
}

const labelClass = "text-xs font-semibold text-ink/50";
const inputClass =
  "box-border h-12 w-full min-w-0 rounded-xl border border-ink/10 bg-white px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

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
  const [followUpCalls, setFollowUpCalls] = useState<ProcessFollowUpCompany[]>(
    []
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<{
    notes: string;
    followUpCalls: ProcessFollowUpCompany[];
  }>({
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
    const { notes: nextNotes, followUpCalls: nextFollowUpCalls } =
      stateRef.current;
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

  const patchCompany = (
    index: number,
    patch: Partial<ProcessFollowUpCompany>
  ) => {
    setCompanies(
      followUpCalls.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const addCompany = () =>
    setCompanies([...followUpCalls, emptyFollowUpCompany()]);

  if (!bid) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Post-Bid
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink/45">
            Follow-up calls and competitor notes. Still Pre — pick win/lose on
            the Outcome tab next. GCs / mechanicals now live on Intake.
          </p>
          <p className="mt-1.5 text-xs text-ink/40">
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
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f26620] disabled:opacity-40"
          >
            <SaveDiskIcon />
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : null}
      </header>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex w-full flex-col gap-6">
        <section className="min-w-0 rounded-2xl border border-ink/[0.07] bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <PhoneIcon />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Follow-up calls
                </h3>
                <p className="mt-0.5 text-xs text-ink/45">
                  Up to {MAX_FOLLOWUP_COMPANIES} companies, each with up to{" "}
                  {MAX_FOLLOWUP_CALL_ATTEMPTS} dated call attempts.
                </p>
              </div>
            </div>
            {editable && followUpCalls.length < MAX_FOLLOWUP_COMPANIES ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand/35 bg-white px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
                onClick={addCompany}
              >
                <PlusIcon />
                Add company
              </button>
            ) : null}
          </div>

          {followUpCalls.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/[0.1] bg-[#f0f1f4]/40 px-4 py-6 text-center">
              <p className="text-sm text-ink/45">
                No follow-up calls logged yet.
              </p>
              {editable ? (
                <button
                  type="button"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  onClick={addCompany}
                >
                  <PlusIcon />
                  Add company
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {followUpCalls.map((company, index) => {
                const attempts = company.callAttempts ?? [];
                return (
                  <div
                    key={company.id}
                    className="rounded-xl border border-ink/[0.06] bg-[#f3f4f6]/70 px-4 py-4"
                  >
                    <div className="grid grid-cols-1 items-end gap-3.5 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_minmax(0,12rem)_auto]">
                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className={labelClass}>Company</span>
                        <input
                          className={inputClass}
                          disabled={!editable}
                          placeholder="Enter company name"
                          value={company.companyName ?? ""}
                          onChange={(e) =>
                            patchCompany(index, {
                              companyName: e.target.value || null,
                            })
                          }
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className={labelClass}>Contact name</span>
                        <input
                          className={inputClass}
                          disabled={!editable}
                          placeholder="Enter contact name"
                          value={company.contactName ?? ""}
                          onChange={(e) =>
                            patchCompany(index, {
                              contactName: e.target.value || null,
                            })
                          }
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className={labelClass}>Phone</span>
                        <input
                          className={inputClass}
                          disabled={!editable}
                          placeholder="Enter phone number"
                          value={company.phone ?? ""}
                          onChange={(e) =>
                            patchCompany(index, {
                              phone: e.target.value || null,
                            })
                          }
                        />
                      </label>
                      {editable ? (
                        <button
                          type="button"
                          aria-label="Remove company"
                          title="Remove company"
                          className="inline-flex items-center gap-1.5 justify-self-start pb-2 text-sm font-semibold text-[#b91c1c]/85 hover:text-danger xl:justify-self-auto"
                          onClick={() => {
                            void (async () => {
                              const ok = await confirmDialog({
                                title: "Remove follow-up company?",
                                message: `Remove "${company.companyName || "this company"}" and its call log?`,
                                confirmLabel: "Remove",
                                variant: "danger",
                              });
                              if (!ok) return;
                              setCompanies(
                                followUpCalls.filter((_, i) => i !== index)
                              );
                            })();
                          }}
                        >
                          <TrashIcon />
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3.5 rounded-xl border border-ink/[0.05] bg-white/90 px-4 py-3.5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink/55">
                          <CalendarIcon className="text-ink/40" />
                          Call attempts
                        </span>
                        {editable &&
                        attempts.length < MAX_FOLLOWUP_CALL_ATTEMPTS ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/15"
                            onClick={() =>
                              patchCompany(index, {
                                callAttempts: [
                                  ...attempts,
                                  {
                                    ordinal: attempts.length + 1,
                                    dateOfCall: null,
                                    remarks: null,
                                  },
                                ],
                              })
                            }
                          >
                            <PlusIcon />
                            Add call
                          </button>
                        ) : null}
                      </div>
                      {attempts.length === 0 ? (
                        <p className="py-1 text-sm text-ink/40">
                          No calls logged yet.
                        </p>
                      ) : (
                        attempts.map((attempt, attemptIndex) => (
                          <div
                            key={attemptIndex}
                            className="mt-2.5 grid grid-cols-1 items-end gap-3.5 sm:grid-cols-[3.5rem_minmax(0,13rem)_1fr_auto]"
                          >
                            <span className="pb-2.5 text-sm font-semibold text-ink/45">
                              {ordinalLabel(attemptIndex + 1)}
                            </span>
                            <label className="flex min-w-0 flex-col gap-1.5">
                              <span className={labelClass}>Date of call</span>
                              <DatePicker
                                ariaLabel="Date of call"
                                className={inputClass}
                                disabled={!editable}
                                value={attempt.dateOfCall?.slice(0, 10) ?? ""}
                                onChange={(v) => {
                                  const next = attempts.map((a, i) =>
                                    i === attemptIndex
                                      ? { ...a, dateOfCall: v || null }
                                      : a
                                  );
                                  patchCompany(index, { callAttempts: next });
                                }}
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1.5">
                              <span className={labelClass}>Remarks</span>
                              <input
                                className={inputClass}
                                disabled={!editable}
                                placeholder="Call notes"
                                value={attempt.remarks ?? ""}
                                onChange={(e) => {
                                  const next = attempts.map((a, i) =>
                                    i === attemptIndex
                                      ? {
                                          ...a,
                                          remarks: e.target.value || null,
                                        }
                                      : a
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
                                className="inline-flex items-center gap-1.5 justify-self-start pb-2 text-sm font-semibold text-[#b91c1c]/70 hover:text-danger sm:justify-self-auto"
                                onClick={() => {
                                  const next = attempts
                                    .filter((_, i) => i !== attemptIndex)
                                    .map((a, i) => ({ ...a, ordinal: i + 1 }));
                                  patchCompany(index, { callAttempts: next });
                                }}
                              >
                                <TrashIcon />
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

        <section className="min-w-0 rounded-2xl border border-ink/[0.07] bg-white px-7 py-7 sm:px-8 sm:py-8">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <NotesDocIcon />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">
                Notes / competitors
              </h3>
              <p className="mt-1.5 text-sm text-ink/45">
                Free-text intel — not a structured competitor list.
              </p>
            </div>
          </div>
          <textarea
            aria-label="Notes / competitors"
            placeholder="Competitor notes, overheard pricing, who showed up…"
            className="min-h-[220px] w-full resize-y rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
            disabled={!editable}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty(e.target.value, followUpCalls);
            }}
          />
        </section>
      </div>
    </div>
  );
}

function ordinalLabel(n: number): string {
  const suffixes: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
  return suffixes[n] ?? `${n}th`;
}

function SaveDiskIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotesDocIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
