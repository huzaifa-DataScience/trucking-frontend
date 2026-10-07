"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { getApiErrorMessage } from "@/lib/api/client";
import { newId } from "@/lib/bidding/newId";
import { seedFollowUpFromCompanyInfo } from "@/lib/bidding/bid-crm-snapshot";
import { DatePicker } from "@/components/ui/DatePicker";
import { BidPostBidSummary } from "@/components/bidding/BidPostBidSummary";
import {
  INTAKE_ADD_BTN,
  INTAKE_REMOVE_BTN,
  PlusIcon,
  TrashIcon,
} from "@/components/bidding/intakeIcons";
import type {
  BidProcess,
  ProcessCompetitor,
  ProcessFollowUpCompany,
  ProcessIntelligence,
} from "@/lib/bidding/process-types";

const MAX_FOLLOWUP_COMPANIES = 10;
const MAX_FOLLOWUP_CALL_ATTEMPTS = 5;
const MAX_COMPETITORS = 40;

function emptyFollowUpCompany(): ProcessFollowUpCompany {
  return { id: newId(), companyName: null, contactName: null, phone: null, callAttempts: [] };
}

function emptyCompetitor(): ProcessCompetitor {
  return { name: null, amount: null, source: null, confidence: null, atBid: true };
}

type IntelState = {
  notes: string;
  followUpCalls: ProcessFollowUpCompany[];
  competitors: ProcessCompetitor[];
};

/** Intel tab — call summary, follow-up calls, structured competitors, notes. */
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
  const [competitors, setCompetitors] = useState<ProcessCompetitor[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<IntelState>({
    notes: "",
    followUpCalls: [],
    competitors: [],
  });
  const seededRef = useRef<string | null>(null);
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid?.process) return;
    const intel = bid.process.intelligence as ProcessIntelligence | undefined;
    const nextNotes = intel?.notes ?? "";
    let nextFollowUpCalls = [...(intel?.followUpCalls ?? [])];
    const nextCompetitors = [...(intel?.competitors ?? [])];
    let seeded = false;

    if (
      editable &&
      nextFollowUpCalls.length === 0 &&
      seededRef.current !== bid.id
    ) {
      const seed = seedFollowUpFromCompanyInfo(bid.companyInfo);
      if (seed) {
        nextFollowUpCalls = [seed];
        seeded = true;
      }
      seededRef.current = bid.id;
    }

    setNotes(nextNotes);
    setFollowUpCalls(nextFollowUpCalls);
    setCompetitors(nextCompetitors);
    stateRef.current = {
      notes: nextNotes,
      followUpCalls: nextFollowUpCalls,
      competitors: nextCompetitors,
    };
    setDirty(seeded);
    setProcessDirty(seeded);
  }, [bid, editable, setProcessDirty]);

  const teamId = bid?.process?.assignment?.teamId ?? bid?.teamId ?? null;
  useEffect(() => {
    if (teamId == null) {
      setTeamName(null);
      return;
    }
    let cancelled = false;
    void biddingApi.getBiddingTeams().then((teams) => {
      if (cancelled) return;
      setTeamName(teams.find((t) => t.id === teamId)?.teamName ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    const {
      notes: nextNotes,
      followUpCalls: nextFollowUpCalls,
      competitors: nextCompetitors,
    } = stateRef.current;
    const process: Partial<BidProcess> = {
      intelligence: {
        ...(bid.process?.intelligence ?? {}),
        notes: nextNotes || null,
        followUpCalls: nextFollowUpCalls,
        competitors: nextCompetitors,
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

  const markDirty = (next: IntelState) => {
    stateRef.current = next;
    if (!editable) return;
    setDirty(true);
    setProcessDirty(true);
  };

  const setCompanies = (next: ProcessFollowUpCompany[]) => {
    setFollowUpCalls(next);
    markDirty({ notes, followUpCalls: next, competitors });
  };

  const setCompetitorList = (next: ProcessCompetitor[]) => {
    setCompetitors(next);
    markDirty({ notes, followUpCalls, competitors: next });
  };

  const patchCompany = (index: number, patch: Partial<ProcessFollowUpCompany>) => {
    setCompanies(followUpCalls.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const patchCompetitor = (index: number, patch: Partial<ProcessCompetitor>) => {
    setCompetitorList(competitors.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  if (!bid) return null;

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="intake-title">Post-Bid</h2>
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

      <BidPostBidSummary bid={bid} teamName={teamName} />

      <div className="flex flex-col gap-6">
        <section className="intake-section min-w-0">
          <div className="intake-section-head-bar">
            <div>
              <h3>Follow-up calls</h3>
            </div>
            {editable && followUpCalls.length < MAX_FOLLOWUP_COMPANIES ? (
              <button
                type="button"
                className={INTAKE_ADD_BTN}
                aria-label="Add company"
                title="Add company"
                onClick={() => setCompanies([...followUpCalls, emptyFollowUpCompany()])}
              >
                <PlusIcon />
              </button>
            ) : null}
          </div>
          <div className="intake-section-body">
            {followUpCalls.length === 0 ? (
              <p className="text-[12.5px] text-[#9ca3af]">No follow-up calls logged yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {followUpCalls.map((company, index) => {
                  const attempts = company.callAttempts ?? [];
                  return (
                    <div
                      key={company.id}
                      className="rounded-xl border border-[#e8ecf1] bg-[#f8fafc] px-2.5 py-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="intake-field min-w-[10rem] flex-1"
                          disabled={!editable}
                          placeholder="Company"
                          value={company.companyName ?? ""}
                          onChange={(e) =>
                            patchCompany(index, { companyName: e.target.value || null })
                          }
                        />
                        <input
                          className="intake-field min-w-[8rem] flex-1"
                          disabled={!editable}
                          placeholder="Contact name"
                          value={company.contactName ?? ""}
                          onChange={(e) =>
                            patchCompany(index, { contactName: e.target.value || null })
                          }
                        />
                        <input
                          className="intake-field min-w-[8rem] flex-1"
                          disabled={!editable}
                          placeholder="Phone"
                          value={company.phone ?? ""}
                          onChange={(e) =>
                            patchCompany(index, { phone: e.target.value || null })
                          }
                        />
                        {editable ? (
                          <button
                            type="button"
                            aria-label="Remove company"
                            title="Remove company"
                            className={INTAKE_REMOVE_BTN}
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
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-[#e8ecf1] bg-white px-2 py-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                            Call attempts
                          </span>
                          {editable && attempts.length < MAX_FOLLOWUP_CALL_ATTEMPTS ? (
                            <button
                              type="button"
                              className={INTAKE_ADD_BTN}
                              aria-label="Add call"
                              title="Add call"
                              onClick={() =>
                                patchCompany(index, {
                                  callAttempts: [
                                    ...attempts,
                                    { ordinal: attempts.length + 1, dateOfCall: null, remarks: null },
                                  ],
                                })
                              }
                            >
                              <PlusIcon />
                            </button>
                          ) : null}
                        </div>
                        {attempts.length === 0 ? (
                          <p className="text-[12.5px] text-[#9ca3af]">No calls logged yet.</p>
                        ) : (
                          attempts.map((attempt, attemptIndex) => (
                            <div
                              key={attemptIndex}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="w-8 shrink-0 text-[11px] font-medium text-[#6b7280]">
                                {ordinalLabel(attemptIndex + 1)}
                              </span>
                              <DatePicker
                                ariaLabel="Date of call"
                                className="intake-field min-w-[9rem]"
                                disabled={!editable}
                                value={attempt.dateOfCall?.slice(0, 10) ?? ""}
                                onChange={(v) => {
                                  const next = attempts.map((a, i) =>
                                    i === attemptIndex ? { ...a, dateOfCall: v || null } : a
                                  );
                                  patchCompany(index, { callAttempts: next });
                                }}
                              />
                              <input
                                className="intake-field min-w-[10rem] flex-1"
                                disabled={!editable}
                                placeholder="Remarks"
                                value={attempt.remarks ?? ""}
                                onChange={(e) => {
                                  const next = attempts.map((a, i) =>
                                    i === attemptIndex
                                      ? { ...a, remarks: e.target.value || null }
                                      : a
                                  );
                                  patchCompany(index, { callAttempts: next });
                                }}
                              />
                              {editable ? (
                                <button
                                  type="button"
                                  aria-label="Remove call"
                                  title="Remove call"
                                  className={INTAKE_REMOVE_BTN}
                                  onClick={() => {
                                    const next = attempts
                                      .filter((_, i) => i !== attemptIndex)
                                      .map((a, i) => ({ ...a, ordinal: i + 1 }));
                                    patchCompany(index, { callAttempts: next });
                                  }}
                                >
                                  <TrashIcon />
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
          </div>
        </section>

        <section className="intake-section min-w-0">
          <div className="intake-section-head-bar">
            <div>
              <h3>Competitors</h3>
              <p>Bidder / competitor companies on this opportunity</p>
            </div>
            {editable && competitors.length < MAX_COMPETITORS ? (
              <button
                type="button"
                className={INTAKE_ADD_BTN}
                aria-label="Add competitor"
                title="Add competitor"
                onClick={() => setCompetitorList([...competitors, emptyCompetitor()])}
              >
                <PlusIcon />
              </button>
            ) : null}
          </div>
          <div className="intake-section-body">
            {competitors.length === 0 ? (
              <p className="text-[12.5px] text-[#9ca3af]">No competitors recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-ink/[0.08] text-[11px] font-semibold text-ink/50">
                      <th className="px-2 py-1.5">Company</th>
                      <th className="px-2 py-1.5">Amount</th>
                      <th className="px-2 py-1.5">Source</th>
                      <th className="px-2 py-1.5">Confidence</th>
                      <th className="px-2 py-1.5">At bid</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((row, index) => (
                      <tr key={index} className="border-b border-ink/[0.05]">
                        <td className="px-2 py-1.5">
                          <input
                            className="intake-field w-full min-w-[8rem]"
                            disabled={!editable}
                            placeholder="Company name"
                            value={row.name ?? ""}
                            onChange={(e) =>
                              patchCompetitor(index, { name: e.target.value || null })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            className="intake-field w-full min-w-[6rem]"
                            disabled={!editable}
                            placeholder="0"
                            value={row.amount ?? ""}
                            onChange={(e) =>
                              patchCompetitor(index, {
                                amount:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="intake-field w-full min-w-[6rem]"
                            disabled={!editable}
                            placeholder="Source"
                            value={row.source ?? ""}
                            onChange={(e) =>
                              patchCompetitor(index, { source: e.target.value || null })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="intake-field w-full min-w-[5rem]"
                            disabled={!editable}
                            placeholder="e.g. high"
                            value={row.confidence ?? ""}
                            onChange={(e) =>
                              patchCompetitor(index, {
                                confidence: e.target.value || null,
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            className="intake-check"
                            disabled={!editable}
                            checked={row.atBid !== false}
                            onChange={(e) =>
                              patchCompetitor(index, { atBid: e.target.checked })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {editable ? (
                            <button
                              type="button"
                              className={INTAKE_REMOVE_BTN}
                              aria-label="Remove competitor"
                              title="Remove competitor"
                              onClick={() =>
                                setCompetitorList(
                                  competitors.filter((_, i) => i !== index)
                                )
                              }
                            >
                              <TrashIcon />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="intake-section min-w-0">
          <div className="intake-section-head">Notes</div>
          <div className="intake-section-body">
            <textarea
              className="intake-field min-h-[8rem] w-full"
              disabled={!editable}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                markDirty({
                  notes: e.target.value,
                  followUpCalls,
                  competitors,
                });
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ordinalLabel(n: number): string {
  const suffixes: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
  return suffixes[n] ?? `${n}th`;
}
