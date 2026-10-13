"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type {
  ProcessAssignment,
  ProcessTakeoffAssignment,
  ProcessTechnicalReview,
  TakeoffRole,
} from "@/lib/bidding/process-types";
import type { BidCaptainLookup, BidContactLookup, BidTeam } from "@/lib/bidding/types";
import { personDisplayName } from "@/lib/bidding/person-label";
import { teamColorForId } from "@/lib/bidding/team-colors";
import { DatePicker } from "@/components/ui/DatePicker";
import { useBidSheet } from "@/contexts/BidSheetContext";

/** Dropdown arrow for selects (intake-field uses appearance-none, which hides the native one). */
function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "Tory Burton" → "TB" (captain avatar in the Captain field). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function captainDisplayName(c: BidCaptainLookup): string {
  return personDisplayName({
    firstName: c.firstName,
    lastName: c.lastName,
    name: c.name,
    email: c.email,
  });
}

function contactDisplayName(c: BidContactLookup): string {
  return (
    c.name?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    c.email?.trim() ||
    ""
  );
}

/** Stage 2 — Assignment (FRONTEND_INTAKE.md). Nick + PJ + bid clerk. */
export function BidAssignmentStage() {
  const { setBidHeader } = useBidSheet();
  const router = useRouter();
  const {
    bid,
    draft,
    setField,
    saving,
    dirty,
    error,
    editable,
  } = useProcessDraft();
  const inputClass = "intake-field w-full appearance-none";
  const labelClass = "intake-label";
  const sectionHead = "intake-section-head";
  const sectionBody = "intake-section-body";
  const [teams, setTeams] = useState<BidTeam[]>([]);
  const [captains, setCaptains] = useState<BidCaptainLookup[]>([]);
  const [aes, setAes] = useState<BidContactLookup[]>([]);

  useEffect(() => {
    void biddingApi
      .getBiddingTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
    void biddingApi
      .getBiddingCaptains()
      .then(setCaptains)
      .catch(() => setCaptains([]));
    // AEs are not on /captains — use contacts?role=assistant_estimator
    void biddingApi
      .getBiddingContacts({ role: "assistant_estimator" })
      .then((list) => (list.length > 0 ? list : biddingApi.getBiddingContacts()))
      .then(setAes)
      .catch(() => setAes([]));
  }, []);

  if (!bid) return null;

  const a: ProcessAssignment = { ...(draft.assignment ?? {}) };
  const rows: ProcessTakeoffAssignment[] = [
    ...(draft.takeoffAssignments ?? []),
  ];

  const setAssignment = (patch: Partial<ProcessAssignment>) => {
    const next = { ...a, ...patch };
    setField("assignment", next);
    if (patch.pursue === false) {
      void (async () => {
        try {
          await biddingApi.setBidOutcome(bid.id, { outcome: "no_bid" });
        } catch {
          /* user can still pick on Outcome */
        }
        router.push(`/bidding/${bid.id}?stage=result`);
      })();
    }
  };

  const seedTakeoffFromTeam = (team: BidTeam) => {
    const nextRows = [...rows];
    const seed: { role: TakeoffRole; name: string | null }[] = [
      { role: "duct1", name: team.duct1 },
      { role: "duct2", name: team.duct2 },
      { role: "hydronic1", name: team.hydronic1 },
      { role: "hydronic2", name: team.hydronic2 },
      { role: "plumbing1", name: team.plumbing1 },
      { role: "plumbing2", name: team.plumbing2 },
    ];
    for (const s of seed) {
      if (!s.name) continue;
      const i = nextRows.findIndex((r) => r.role === s.role);
      const existing = i >= 0 ? nextRows[i]?.assigneeName : null;
      if (existing) continue;
      const row: ProcessTakeoffAssignment = {
        ...(i >= 0 ? nextRows[i] : { role: s.role }),
        role: s.role,
        assigneeName: s.name,
      };
      if (i >= 0) nextRows[i] = row;
      else nextRows.push(row);
    }
    setField("takeoffAssignments", nextRows);
  };

  /** Captain first — save captainUserId; BE fills teamId + captain name. */
  const pickCaptain = (captainUserIdRaw: string) => {
    if (!captainUserIdRaw) {
      setAssignment({ captainUserId: null, captain: null, teamId: null });
      return;
    }
    const captainUserId = Number(captainUserIdRaw);
    const cap = captains.find((c) => c.userId === captainUserId);
    if (!cap) {
      setAssignment({ captainUserId });
      return;
    }
    // teamId null → disabled in UI; still don't invent a team
    const team =
      cap.teamId != null ? teams.find((t) => t.id === cap.teamId) : undefined;
    setAssignment({
      captainUserId: cap.userId,
      // Optimistic label; BE overwrites captain + teamId on save
      captain: captainDisplayName(cap),
      teamId: cap.teamId,
      assistantEstimator:
        team?.assistantEstimator ?? a.assistantEstimator ?? null,
      bidClerk: team?.bidClerk ?? a.bidClerk ?? null,
    });
    if (team) seedTakeoffFromTeam(team);
  };

  /**
   * Team still shown. Changing team only fills captain when that team has a
   * login captain in GET /lookups/bidding/captains.
   */
  const pickTeam = (teamIdRaw: string) => {
    if (!teamIdRaw) {
      setAssignment({ teamId: null });
      return;
    }
    const teamId = Number(teamIdRaw);
    const team = teams.find((t) => t.id === teamId);
    const loginCaptain = captains.find((c) => c.teamId === teamId) ?? null;
    setAssignment({
      teamId,
      ...(loginCaptain
        ? {
            captainUserId: loginCaptain.userId,
            captain: captainDisplayName(loginCaptain),
          }
        : {
            // No active captain login for this team — clear captain
            captainUserId: null,
            captain: null,
          }),
      assistantEstimator:
        team?.assistantEstimator ?? a.assistantEstimator ?? null,
      bidClerk: team?.bidClerk ?? a.bidClerk ?? null,
    });
    if (team) seedTakeoffFromTeam(team);
  };

  const upsertRole = (role: TakeoffRole, patch: Partial<ProcessTakeoffAssignment>) => {
    const next = [...rows];
    const i = next.findIndex((r) => r.role === role);
    const row: ProcessTakeoffAssignment = {
      ...(i >= 0 ? next[i] : { role }),
      ...patch,
      role,
    };
    if (i >= 0) next[i] = row;
    else next.push(row);
    setField("takeoffAssignments", next);
  };

  const rowFor = (role: TakeoffRole) => rows.find((r) => r.role === role);

  const review: ProcessTechnicalReview = { ...(draft.technicalReview ?? {}) };
  const setReview = (patch: Partial<ProcessTechnicalReview>) => {
    setField("technicalReview", { ...review, ...patch });
  };

  const renderRoleFields = (role: TakeoffRole, optional = false) => {
    const row = rowFor(role);
    return (
      <div key={role} className="flex min-w-0 flex-col gap-1.5">
        <label className="flex min-w-0 flex-col gap-0.5">
          <span className={labelClass}>
            {role}
            {optional ? " (optional)" : ""}
          </span>
          <input
            className={inputClass}
            disabled={!editable}
            aria-label={`${role} assignee`}
            placeholder={optional ? "Leave blank if no scope" : "Assignee"}
            value={row?.assigneeName ?? ""}
            onChange={(e) =>
              upsertRole(role, { assigneeName: e.target.value || null })
            }
          />
        </label>
        <label className="flex min-w-0 flex-col gap-0.5">
          <span className={labelClass}>Due</span>
          <DatePicker
            ariaLabel={`${role} takeoff due`}
            className={`${inputClass} w-full`}
            disabled={!editable}
            value={row?.dueAt?.slice(0, 10) ?? ""}
            onChange={(v) => upsertRole(role, { dueAt: v || null })}
          />
        </label>
      </div>
    );
  };

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-4 overflow-auto sm:gap-6">
      <header>
        <h2 className="intake-title">Assignment</h2>
        <p className="intake-sub mt-0.5">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : editable
                ? "Save to keep changes"
                : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="intake-section min-w-0">
        <h3 className={`${sectionHead} flex-wrap`}>
          Assignment
          {/* Pursue = a switch in the header (was a checkbox row). Unchecked = no bid. */}
          <label className="flex items-center gap-2 text-[12.5px] font-medium normal-case tracking-normal text-[#374151] sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              disabled={!editable}
              checked={a.pursue !== false}
              onChange={(e) => setAssignment({ pursue: e.target.checked })}
            />
            <span
              className="relative h-[18px] w-8 shrink-0 rounded-full bg-[#cbd5e1] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-3.5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-disabled:opacity-50"
              aria-hidden
            />
            {a.pursue !== false ? "Pursue this bid" : "Not pursuing (no bid)"}
          </label>
        </h3>
        {/* Two columns in pairs, labels above (option A). */}
        <div className={`${sectionBody} grid grid-cols-1 gap-x-[18px] gap-y-3.5 sm:grid-cols-2`}>
          <p className="col-span-full text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">People</p>

          <div className="flex min-w-0 flex-col gap-[5px]">
            <label htmlFor="assign-captain" className={labelClass}>
              Captain
            </label>
            <div className="relative">
              {a.captain ? (
                <span
                  className="pointer-events-none absolute left-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-brand text-[10px] font-bold text-white"
                  aria-hidden
                >
                  {initials(a.captain)}
                </span>
              ) : null}
              <select
                id="assign-captain"
                className={`${inputClass} !pr-8 ${a.captain ? "!pl-8" : ""}`}
                disabled={!editable}
                value={a.captainUserId != null ? String(a.captainUserId) : ""}
                onChange={(e) => pickCaptain(e.target.value)}
              >
                <option value="">—</option>
                {captains.length === 0 ? (
                  <option value="" disabled>
                    No captains (API empty)
                  </option>
                ) : (
                  captains.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {captainDisplayName(c)}
                      {c.teamName ? ` · ${c.teamName}` : ""}
                      {c.teamId == null ? " (crew later in Settings)" : ""}
                    </option>
                  ))
                )}
              </select>
              <SelectChevron />
            </div>
            <span className="text-[11.5px] text-[#6b7280]">Picking a captain fills the team.</span>
          </div>

          <div className="flex min-w-0 flex-col gap-[5px]">
            <label htmlFor="assign-team" className={labelClass}>
              Team
            </label>
            <div className="relative">
              {a.teamId != null ? (
                <span
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${teamColorForId(a.teamId).dot}`}
                  aria-hidden
                />
              ) : null}
              <select
                id="assign-team"
                className={`${inputClass} !pr-8 ${a.teamId != null ? "!pl-7" : ""}`}
                disabled={!editable}
                value={a.teamId != null ? String(a.teamId) : ""}
                onChange={(e) => pickTeam(e.target.value)}
              >
                <option value="">—</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamName}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
            <span className="text-[11.5px] text-[#6b7280]">Changing team picks its captain, if it has one.</span>
          </div>

          <div className="flex min-w-0 flex-col gap-[5px]">
            <label htmlFor="assign-ae" className={labelClass}>
              Asst. estimator
            </label>
            <div className="relative">
              <select
                id="assign-ae"
                className={`${inputClass} !pr-8`}
                disabled={!editable}
                value={a.assistantEstimator ?? ""}
                onChange={(e) => setAssignment({ assistantEstimator: e.target.value || null })}
              >
                <option value="">—</option>
                {a.assistantEstimator && !aes.some((c) => contactDisplayName(c) === a.assistantEstimator) ? (
                  <option value={a.assistantEstimator}>{a.assistantEstimator}</option>
                ) : null}
                {aes.map((c, i) => {
                  const name = contactDisplayName(c);
                  if (!name) return null;
                  return (
                    <option
                      key={
                        c.appUserId != null
                          ? `ae-app-${c.appUserId}`
                          : c.connecteamUserId != null
                            ? `ae-ct-${c.connecteamUserId}`
                            : `ae-${name}-${i}`
                      }
                      value={name}
                    >
                      {name}
                      {c.email ? ` · ${c.email}` : ""}
                    </option>
                  );
                })}
              </select>
              <SelectChevron />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-[5px]">
            <label htmlFor="assign-priority" className={labelClass}>
              Priority
            </label>
            <input
              id="assign-priority"
              className={inputClass}
              disabled={!editable}
              value={a.priority ?? ""}
              onChange={(e) => setAssignment({ priority: e.target.value || null })}
              placeholder="e.g. High / Normal"
            />
          </div>

          <div className="col-span-full my-0.5 h-px bg-[#eef1f5]" aria-hidden />
          <p className="col-span-full text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Schedule</p>

          {/* div not label — native <label> prevents react-aria DatePicker popover from staying open */}
          <div className="flex min-w-0 flex-col gap-[5px]">
            <span className={labelClass}>Internal estimate due</span>
            <DatePicker
              ariaLabel="Internal estimate due"
              className={inputClass}
              disabled={!editable}
              value={a.internalEstimateDue?.slice(0, 10) ?? ""}
              onChange={(v) => setAssignment({ internalEstimateDue: v || null })}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-[5px]">
            <span className={labelClass}>Internal review due</span>
            <DatePicker
              ariaLabel="Internal review due"
              className={inputClass}
              disabled={!editable}
              value={a.internalReviewDue?.slice(0, 10) ?? ""}
              onChange={(v) => setAssignment({ internalReviewDue: v || null })}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-[5px]">
            <label htmlFor="assign-time" className={labelClass}>
              Time est. (hrs)
            </label>
            <input
              id="assign-time"
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              disabled={!editable}
              value={bid.timeEstimate ?? ""}
              onChange={(e) =>
                setBidHeader({
                  timeEstimate: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="intake-section min-w-0">
        <h3 className={sectionHead}>Technical review</h3>
        <div className={`${sectionBody} intake-grid`}>
          <p className="col-span-full text-[11px] text-[#6b7280]">
            Nick or PJ reviews before assign — same fields as Handoff.
          </p>
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
                  : "Takeoff approval"}
              </p>
              <p className="text-[11px] text-[#6b7280]">
                {review.approvedForTakeoff
                  ? "Approved — revoke if review needs another pass."
                  : "Optional here; Handoff can still require approval before Complete."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {review.approvedForTakeoff ? (
                <>
                  <span className="text-[11px] font-semibold text-[#047857]">Approved</span>
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
                        review.reviewDate || new Date().toISOString().slice(0, 10),
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

      <section className="intake-section min-w-0">
        <h3 className={sectionHead}>Takeoff assignments</h3>
        <div className={`${sectionBody} flex flex-col gap-4`}>
          <p className="text-[11px] text-[#6b7280]">
            Team/captain pick prefills blank roles. VRF / equipment stay optional.
          </p>
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {(
              [
                ["Duct", ["duct1", "duct2"]],
                ["Hydronic", ["hydronic1", "hydronic2"]],
                ["Plumbing", ["plumbing1", "plumbing2"]],
              ] as const
            ).map(([title, roles]) => (
              <div key={title} className="flex min-w-0 flex-col gap-3">
                <p className="mb-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  {title}
                </p>
                {roles.map((role) => renderRoleFields(role))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-5 border-t border-[#e8ecf1] pt-4 sm:grid-cols-2 sm:gap-5 sm:pt-5 lg:grid-cols-3 lg:gap-6">
            {(["vrf", "equipment", "other"] as const).map((role) =>
              renderRoleFields(role, role === "vrf" || role === "equipment")
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
