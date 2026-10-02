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
import { DatePicker } from "@/components/ui/DatePicker";
import { useBidSheet } from "@/contexts/BidSheetContext";

const TAKEOFF_ROLES: TakeoffRole[] = [
  "duct1",
  "duct2",
  "duct3",
  "hydronic1",
  "hydronic2",
  "hydronic3",
  "plumbing1",
  "plumbing2",
  "vrf",
  "equipment",
  "other",
];

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
  const sectionHint = "intake-section-hint";
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
      captain: cap.name,
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
            captain: loginCaptain.name,
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

  const upsertRole = (role: TakeoffRole, assigneeName: string) => {
    const next = [...rows];
    const i = next.findIndex((r) => r.role === role);
    const row: ProcessTakeoffAssignment = {
      ...(i >= 0 ? next[i] : { role }),
      role,
      assigneeName: assigneeName || null,
    };
    if (i >= 0) next[i] = row;
    else next.push(row);
    setField("takeoffAssignments", next);
  };

  const assigneeFor = (role: TakeoffRole) =>
    rows.find((r) => r.role === role)?.assigneeName ?? "";

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
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

      <div className="grid grid-cols-3 items-start gap-3 max-[1000px]:grid-cols-1">
        <section className="intake-section min-w-0">
          <h3 className={sectionHead}>Assignment</h3>
          <div className={`${sectionBody} intake-stack`}>
            <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
              <input
                type="checkbox"
                disabled={!editable}
                checked={a.pursue !== false}
                onChange={(e) => setAssignment({ pursue: e.target.checked })}
              />
              <span className="font-medium">Pursue this bid (uncheck = no bid)</span>
            </label>
            <label className="intake-row">
              <span className={labelClass}>Captain</span>
              <div className="min-w-0">
                <select
                  className={inputClass}
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
                        {c.name}
                        {c.teamName ? ` · ${c.teamName}` : ""}
                        {c.teamId == null ? " (crew later in Settings)" : ""}
                      </option>
                    ))
                  )}
                </select>
                <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
                  Pick captain first. Save captainUserId; backend fills team + name.
                </span>
              </div>
            </label>
            <label className="intake-row">
              <span className={labelClass}>Team</span>
              <div className="min-w-0">
                <select
                  className={inputClass}
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
                <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
                  Changing team sets captain only if that crew has a login captain.
                </span>
              </div>
            </label>
            <label className="intake-row">
              <span className={labelClass}>Priority</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={a.priority ?? ""}
                onChange={(e) => setAssignment({ priority: e.target.value || null })}
                placeholder="e.g. high / normal"
              />
            </label>
            <label className="intake-row">
              <span className={labelClass}>Captain name</span>
              <input
                className={inputClass}
                disabled
                readOnly
                value={a.captain ?? ""}
                placeholder="Filled from captain pick"
              />
            </label>
            <label className="intake-row">
              <span className={labelClass}>Asst. estimator</span>
              <div className="min-w-0">
                <select
                  className={inputClass}
                  disabled={!editable}
                  value={a.assistantEstimator ?? ""}
                  onChange={(e) =>
                    setAssignment({ assistantEstimator: e.target.value || null })
                  }
                >
                  <option value="">—</option>
                  {a.assistantEstimator &&
                  !aes.some((c) => contactDisplayName(c) === a.assistantEstimator) ? (
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
                <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
                  From contacts — not the captain list.
                </span>
              </div>
            </label>
            <label className="intake-row">
              <span className={labelClass}>Time est. (hrs)</span>
              <input
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
            </label>
            <label className="intake-row">
              <span className={labelClass}>Est. due</span>
              <DatePicker
                ariaLabel="Internal estimate due"
                className={inputClass}
                disabled={!editable}
                value={a.internalEstimateDue?.slice(0, 10) ?? ""}
                onChange={(v) => setAssignment({ internalEstimateDue: v || null })}
              />
            </label>
            <label className="intake-row">
              <span className={labelClass}>Review due</span>
              <DatePicker
                ariaLabel="Internal review due"
                className={inputClass}
                disabled={!editable}
                value={a.internalReviewDue?.slice(0, 10) ?? ""}
                onChange={(v) => setAssignment({ internalReviewDue: v || null })}
              />
            </label>
          </div>
        </section>

        <TechnicalReviewFields
          review={draft.technicalReview ?? {}}
          editable={editable}
          noBid={a.pursue === false}
          blockedReason={bid.workflow?.completeBlockedReason}
          onChange={(next) => setField("technicalReview", next)}
          inputClass={inputClass}
          labelClass={labelClass}
          sectionHead={sectionHead}
          sectionBody={sectionBody}
          sectionHint={sectionHint}
        />

        <section className="intake-section min-w-0">
          <h3 className={sectionHead}>Takeoff assignments</h3>
          <div className={`${sectionBody} intake-stack`}>
            <p className={sectionHint}>
              Saved with the captain and team. The server fills names from that crew.
            </p>
            {TAKEOFF_ROLES.map((role) => (
              <label key={role} className="intake-row">
                <span className={labelClass}>{role}</span>
                <input
                  className={inputClass}
                  disabled={!editable}
                  value={assigneeFor(role)}
                  onChange={(e) => upsertRole(role, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TechnicalReviewFields({
  review,
  editable,
  noBid,
  blockedReason,
  onChange,
  inputClass,
  labelClass,
  sectionHead,
  sectionBody,
  sectionHint,
}: {
  review: ProcessTechnicalReview;
  editable: boolean;
  noBid: boolean;
  blockedReason?: string | null;
  onChange: (next: ProcessTechnicalReview) => void;
  inputClass: string;
  labelClass: string;
  sectionHead: string;
  sectionBody: string;
  sectionHint: string;
}) {
  return (
    <section className="intake-section min-w-0">
      <h3 className={sectionHead}>Technical review</h3>
      <div className={`${sectionBody} intake-stack`}>
        <p className={sectionHint}>
          {noBid
            ? "No-bid does not need takeoff approval to leave Assignment."
            : "Approve for takeoff before handing off. Otherwise the server blocks complete."}
          {blockedReason ? ` ${blockedReason}` : ""}
        </p>
        <label className="intake-row">
          <span className={labelClass}>Prepared by</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={review.preparedBy ?? ""}
            onChange={(e) => onChange({ ...review, preparedBy: e.target.value || null })}
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Reviewed by</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={review.reviewedBy ?? ""}
            onChange={(e) => onChange({ ...review, reviewedBy: e.target.value || null })}
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Review date</span>
          <DatePicker
            ariaLabel="Review date"
            className={inputClass}
            disabled={!editable}
            value={review.reviewDate?.slice(0, 10) ?? ""}
            onChange={(v) => onChange({ ...review, reviewDate: v || null })}
          />
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
          <input
            type="checkbox"
            disabled={!editable}
            checked={review.approvedForTakeoff === true}
            onChange={(e) => onChange({ ...review, approvedForTakeoff: e.target.checked })}
          />
          <span className="font-medium">Approved for takeoff</span>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Comments</span>
          <textarea
            className={`${inputClass} min-h-[4.5rem] resize-y`}
            disabled={!editable}
            value={review.comments ?? ""}
            onChange={(e) => onChange({ ...review, comments: e.target.value || null })}
          />
        </label>
      </div>
    </section>
  );
}
