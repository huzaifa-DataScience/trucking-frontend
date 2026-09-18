"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type {
  ProcessAssignment,
  ProcessTakeoffAssignment,
  TakeoffRole,
} from "@/lib/bidding/process-types";
import type { BidCaptainLookup, BidContactLookup, BidTeam } from "@/lib/bidding/types";
import { DatePicker } from "@/components/ui/DatePicker";

const TAKEOFF_ROLES: TakeoffRole[] = [
  "duct1",
  "duct2",
  "hydronic1",
  "hydronic2",
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
  const router = useRouter();
  const {
    bid,
    draft,
    setField,
    saving,
    dirty,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();
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
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Assignment</h2>
        <p className="mt-1 text-xs text-ink/40">
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
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <label className="flex items-center gap-2 col-span-full">
          <input
            type="checkbox"
            disabled={!editable}
            checked={a.pursue !== false}
            onChange={(e) => setAssignment({ pursue: e.target.checked })}
          />
          <span className="text-sm text-ink/80">
            Pursue this bid (uncheck = no bid)
          </span>
        </label>
        <label className="flex max-w-2xl flex-col gap-1 col-span-full">
          <span className={labelClass}>Captain (pick first)</span>
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
          <span className="text-[10px] text-ink/40">
            App users with role captain. teamId null is OK — crew set later in
            Settings → My team. Save captainUserId; backend fills team + name when
            they have a crew.
          </span>
        </label>
        <label className="flex max-w-2xl flex-col gap-1 col-span-full">
          <span className={labelClass}>Team</span>
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
          <span className="text-[10px] text-ink/40">
            Captain first. Changing team sets captain only if that crew has a
            login captain.
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Priority</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={a.priority ?? ""}
            onChange={(e) => setAssignment({ priority: e.target.value || null })}
            placeholder="e.g. high / normal"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Captain name</span>
          <input
            className={inputClass}
            disabled
            readOnly
            value={a.captain ?? ""}
            placeholder="Filled from captain pick"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Assistant estimator</span>
          <select
            className={inputClass}
            disabled={!editable}
            value={a.assistantEstimator ?? ""}
            onChange={(e) =>
              setAssignment({ assistantEstimator: e.target.value || null })
            }
          >
            <option value="">—</option>
            {/* Keep current value if not in list */}
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
          <span className="text-[10px] text-ink/40">
            Assistant estimators from contacts — not the captain list.
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Bid clerk</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={a.bidClerk ?? ""}
            onChange={(e) => setAssignment({ bidClerk: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Internal estimate due</span>
          <DatePicker
            ariaLabel="Internal estimate due"
            className={inputClass}
            disabled={!editable}
            value={a.internalEstimateDue?.slice(0, 10) ?? ""}
            onChange={(v) => setAssignment({ internalEstimateDue: v || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Internal review due</span>
          <DatePicker
            ariaLabel="Internal review due"
            className={inputClass}
            disabled={!editable}
            value={a.internalReviewDue?.slice(0, 10) ?? ""}
            onChange={(v) => setAssignment({ internalReviewDue: v || null })}
          />
        </label>
      </section>

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink">Takeoff assignments</h3>
        <p className="mt-0.5 mb-3 text-xs text-ink/45">
          1 or 2 people per scope. Team/captain pick prefills blank roles.
        </p>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {TAKEOFF_ROLES.map((role) => (
            <label key={role} className="flex flex-col gap-1">
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
  );
}
