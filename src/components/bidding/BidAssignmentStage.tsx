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

/** Local "YYYY-MM-DD" for today (dates on the bid are stored as plain dates). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from `today` to `iso` (negative = past). Null when no date. */
function daysUntil(iso: string | null | undefined, today: string): number | null {
  const d = iso?.slice(0, 10);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** "2026-10-20" → "Oct 20". */
function shortDate(iso: string | null | undefined): string | null {
  const d = iso?.slice(0, 10);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

type Tone = "ok" | "warn" | "bad" | "info" | "none";

const PILL: Record<Tone, string> = {
  ok: "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]",
  warn: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  bad: "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]",
  info: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]",
  none: "border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]",
};

/** Takeoff table rows, grouped by trade. VRF / equipment are optional scopes. */
const TAKEOFF_GROUPS: { title: string; roles: { role: TakeoffRole; label: string; optional?: boolean }[] }[] = [
  {
    title: "Duct",
    roles: [
      { role: "duct1", label: "Duct 1" },
      { role: "duct2", label: "Duct 2" },
    ],
  },
  {
    title: "Hydronic",
    roles: [
      { role: "hydronic1", label: "Hydronic 1" },
      { role: "hydronic2", label: "Hydronic 2" },
    ],
  },
  {
    title: "Plumbing",
    roles: [
      { role: "plumbing1", label: "Plumbing 1" },
      { role: "plumbing2", label: "Plumbing 2" },
    ],
  },
  {
    title: "Other scopes",
    roles: [
      { role: "vrf", label: "VRF", optional: true },
      { role: "equipment", label: "Equipment", optional: true },
      { role: "other", label: "Other" },
    ],
  },
];

/** Status chip for one takeoff row: turned in, overdue, due soon, or not assigned. */
function takeoffStatus(
  row: ProcessTakeoffAssignment | undefined,
  optional: boolean,
  today: string
): { tone: Tone; label: string } {
  if (!row?.assigneeName?.trim()) return { tone: "none", label: optional ? "No scope" : "Not assigned" };
  if (row.completed) return { tone: "ok", label: "Turned in" };
  const days = daysUntil(row.dueAt, today);
  if (days == null) return { tone: "info", label: "Assigned" };
  if (days < 0) return { tone: "bad", label: `Overdue ${plural(-days, "day")}` };
  if (days === 0) return { tone: "warn", label: "Due today" };
  return { tone: days <= 3 ? "warn" : "info", label: `Due in ${plural(days, "day")}` };
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
  const fieldWrap = "flex min-w-0 flex-col gap-[5px]";
  const [teams, setTeams] = useState<BidTeam[]>([]);
  const [captains, setCaptains] = useState<BidCaptainLookup[]>([]);
  const [aes, setAes] = useState<BidContactLookup[]>([]);
  const [today] = useState(todayIso);

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


  const renderTakeoffRow = ({ role, label, optional }: { role: TakeoffRole; label: string; optional?: boolean }) => {
    const row = rowFor(role);
    const status = takeoffStatus(row, !!optional, today);
    const name = row?.assigneeName ?? "";
    return (
      <tr key={role} className="border-b border-[#eef1f5] last:border-b-0">
        <td className="w-[120px] whitespace-nowrap px-3 py-[7px] align-middle text-[13px] font-semibold text-[#1f2937]">
          {label}
          {optional ? <small className="block text-[11px] font-normal text-[#9ca3af]">optional</small> : null}
        </td>
        <td className="px-2 py-[7px] align-middle">
          <div className="relative">
            {name.trim() ? (
              <span
                className="pointer-events-none absolute left-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-[#94a3b8] text-[10px] font-bold text-white"
                aria-hidden
              >
                {initials(name)}
              </span>
            ) : null}
            <input
              className={`${inputClass} ${name.trim() ? "!pl-8" : ""}`}
              disabled={!editable}
              aria-label={`${label} assignee`}
              placeholder={optional ? "Leave blank if no scope" : "Assign…"}
              value={name}
              onChange={(e) => upsertRole(role, { assigneeName: e.target.value || null })}
            />
          </div>
        </td>
        <td className="w-[160px] px-2 py-[7px] align-middle">
          <DatePicker
            ariaLabel={`${label} takeoff due`}
            className={inputClass}
            disabled={!editable}
            value={row?.dueAt?.slice(0, 10) ?? ""}
            onChange={(v) => upsertRole(role, { dueAt: v || null })}
          />
        </td>
        <td className="w-[140px] px-3 py-[7px] align-middle">
          <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${PILL[status.tone]}`}
          >
            {status.label}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
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

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="intake-section min-w-0">
            <h3 className={`${sectionHead} flex-wrap`}>
              People &amp; schedule
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
            <div className={`${sectionBody} grid grid-cols-1 gap-x-[18px] gap-y-3.5 sm:grid-cols-2`}>
              <div className={fieldWrap}>
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
              </div>

              <div className={fieldWrap}>
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
              </div>

              <div className={fieldWrap}>
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

              <div className={fieldWrap}>
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

              {/* div not label — native <label> prevents react-aria DatePicker popover from staying open */}
              <div className={fieldWrap}>
                <span className={labelClass}>Internal estimate due</span>
                <DatePicker
                  ariaLabel="Internal estimate due"
                  className={inputClass}
                  disabled={!editable}
                  value={a.internalEstimateDue?.slice(0, 10) ?? ""}
                  onChange={(v) => setAssignment({ internalEstimateDue: v || null })}
                />
              </div>
              <div className={fieldWrap}>
                <span className={labelClass}>Internal review due</span>
                <DatePicker
                  ariaLabel="Internal review due"
                  className={inputClass}
                  disabled={!editable}
                  value={a.internalReviewDue?.slice(0, 10) ?? ""}
                  onChange={(v) => setAssignment({ internalReviewDue: v || null })}
                />
              </div>

              <div className={fieldWrap}>
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
            <h3 className={sectionHead}>Takeoff assignments</h3>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr>
                    {["Scope", "Assignee", "Due", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`border-y border-[#eef1f5] bg-[#fafafa] py-2 text-left text-[11.5px] font-semibold text-[#6b7280] ${i === 0 || i === 3 ? "px-3" : "px-2"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {TAKEOFF_GROUPS.map((g) => (
                  <tbody key={g.title}>
                    <tr>
                      <td
                        colSpan={4}
                        className="border-b border-[#eef1f5] bg-[#fcfcfd] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]"
                      >
                        {g.title}
                      </td>
                    </tr>
                    {g.roles.map(renderTakeoffRow)}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-0">
          <section className="intake-section min-w-0">
            <h3 className={sectionHead}>Technical review</h3>
            <div className={`${sectionBody} flex flex-col gap-3.5`}>
              {/* Approval status: icon + text + action, no tinted box. */}
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    review.approvedForTakeoff ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#f1f5f9] text-[#64748b]"
                  }`}
                  aria-hidden
                >
                  {review.approvedForTakeoff ? (
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold leading-tight text-[#1f2937]">
                    {review.approvedForTakeoff ? "Approved for takeoff" : "Awaiting approval"}
                  </p>
                  {review.approvedForTakeoff ? (
                    <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                      {shortDate(review.reviewDate)
                        ? `Reviewed ${shortDate(review.reviewDate)}${review.reviewedBy ? ` by ${review.reviewedBy}` : ""}`
                        : "Revoke if the review needs another pass."}
                    </p>
                  ) : null}
                </div>
              </div>
              {review.approvedForTakeoff ? (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setReview({ approvedForTakeoff: false })}
                  className="h-9 w-full cursor-pointer rounded-[10px] border border-[#e2e8f0] bg-white text-[12.5px] font-semibold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] disabled:cursor-default disabled:opacity-40"
                >
                  Revoke approval
                </button>
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
                  className="h-9 w-full cursor-pointer rounded-[10px] bg-brand text-[12.5px] font-semibold text-white transition hover:bg-brand/90 disabled:cursor-default disabled:opacity-40"
                >
                  Approve for takeoff
                </button>
              )}

              <div className="my-1 h-px bg-[#eef1f5]" aria-hidden />

              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div className={fieldWrap}>
                  <label htmlFor="review-prepared" className={labelClass}>
                    Prepared by
                  </label>
                  <input
                    id="review-prepared"
                    className={inputClass}
                    disabled={!editable}
                    value={review.preparedBy ?? ""}
                    onChange={(e) => setReview({ preparedBy: e.target.value || null })}
                  />
                </div>
                <div className={fieldWrap}>
                  <label htmlFor="review-reviewed" className={labelClass}>
                    Reviewed by
                  </label>
                  <input
                    id="review-reviewed"
                    className={inputClass}
                    disabled={!editable}
                    placeholder="Nick or PJ"
                    value={review.reviewedBy ?? ""}
                    onChange={(e) => setReview({ reviewedBy: e.target.value || null })}
                  />
                </div>
              </div>
              <div className={fieldWrap}>
                <span className={labelClass}>Review date</span>
                <DatePicker
                  ariaLabel="Review date"
                  className={inputClass}
                  disabled={!editable}
                  value={review.reviewDate?.slice(0, 10) ?? ""}
                  onChange={(v) => setReview({ reviewDate: v || null })}
                />
              </div>
              <div className={fieldWrap}>
                <label htmlFor="review-comments" className={labelClass}>
                  Comments
                </label>
                <textarea
                  id="review-comments"
                  className={`${inputClass} min-h-[5.5rem] resize-y`}
                  disabled={!editable}
                  placeholder="Notes for the estimator…"
                  value={review.comments ?? ""}
                  onChange={(e) => setReview({ comments: e.target.value || null })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
