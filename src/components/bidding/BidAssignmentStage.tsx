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
import type { BidTeam } from "@/lib/bidding/types";

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

/** Stage 2 — Assignment (FRONTEND_INTAKE.md). Nick + PJ. */
export function BidAssignmentStage() {
  const router = useRouter();
  const {
    bid,
    draft,
    setField,
    saving,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();
  const [teams, setTeams] = useState<BidTeam[]>([]);

  useEffect(() => {
    void biddingApi
      .getBiddingTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  if (!bid) return null;

  const a: ProcessAssignment = { ...(draft.assignment ?? {}) };
  const rows: ProcessTakeoffAssignment[] = [
    ...(draft.takeoffAssignments ?? []),
  ];

  const setAssignment = (patch: Partial<ProcessAssignment>) => {
    const next = { ...a, ...patch };
    setField("assignment", next);
    // No-bid → Outcome tab with no_bid pre-selected (§0 / CONTEXT)
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

  const pickTeam = (teamIdRaw: string) => {
    if (!teamIdRaw) {
      setAssignment({ teamId: null });
      return;
    }
    const teamId = Number(teamIdRaw);
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      setAssignment({ teamId });
      return;
    }
    setAssignment({
      teamId: team.id,
      captain: team.captain,
      assistantEstimator: team.assistantEstimator ?? a.assistantEstimator ?? null,
      bidClerk: team.bidClerk,
    });
    // Prefill takeoff names from team roster when blank
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Assignment</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Nick + PJ — pick team, pursue / no-bid, takeoff owners. Uncheck pursue
          → Outcome (no_bid), still changeable.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Draft autosaves" : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 sm:col-span-2">
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
        <label className="flex flex-col gap-1 sm:col-span-2">
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
          <span className={labelClass}>Captain</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={a.captain ?? ""}
            onChange={(e) => setAssignment({ captain: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Assistant estimator</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={a.assistantEstimator ?? ""}
            onChange={(e) =>
              setAssignment({ assistantEstimator: e.target.value || null })
            }
          />
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
          <input
            type="date"
            className={inputClass}
            disabled={!editable}
            value={a.internalEstimateDue?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setAssignment({ internalEstimateDue: e.target.value || null })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Internal review due</span>
          <input
            type="date"
            className={inputClass}
            disabled={!editable}
            value={a.internalReviewDue?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setAssignment({ internalReviewDue: e.target.value || null })
            }
          />
        </label>
      </section>

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">Takeoff assignments</h3>
        <p className="mt-0.5 mb-3 text-xs text-ink/45">
          1 or 2 people per scope. Team pick prefills blank roles.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TAKEOFF_ROLES.map((role) => (
            <label key={role} className="flex flex-col gap-1">
              <span className={labelClass}>{role}</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={assigneeFor(role)}
                onChange={(e) => upsertRole(role, e.target.value)}
                placeholder="Assignee name"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
