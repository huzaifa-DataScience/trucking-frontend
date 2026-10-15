"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  BidCaptainLookup,
  BidContactLookup,
  BidTeam,
  BidWageRate,
  PayrollBurdenItem,
  PayrollBurdenRateType,
} from "@/lib/bidding/types";
import type { TeamCrewSlot } from "@/lib/api/endpoints/bidding";

import { SortedOptions } from "@/components/ui/SortedOptions";
import { useTableSort } from "@/hooks/useTableSort";
const CREW_SLOTS: { key: TeamCrewSlot; label: string }[] = [
  { key: "bidClerk", label: "Assistant Estimator" },
  { key: "assistantManager", label: "Assistant manager" },
  { key: "duct1", label: "Duct 1" },
  { key: "duct2", label: "Duct 2" },
  { key: "hydronic1", label: "Hydronic 1" },
  { key: "hydronic2", label: "Hydronic 2" },
  { key: "plumbing1", label: "Plumbing 1" },
  { key: "plumbing2", label: "Plumbing 2" },
];

const RATE_TYPE_LABELS: Record<PayrollBurdenRateType, string> = {
  pct_wage: "% of wage",
  capped_annual: "Capped annual",
  per_hour: "Per hour",
};

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
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

type CrewDraft = Record<TeamCrewSlot, string>;

const emptyCrew = (): CrewDraft => {
  const d = {} as CrewDraft;
  for (const { key } of CREW_SLOTS) d[key] = "";
  return d;
};

const fieldClass =
  "h-9 w-full cursor-pointer appearance-none rounded-lg border border-[var(--border-subtle)] bg-white pl-3 pr-8 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60";

/** People already sitting in some team's crew seats → that team's name (to flag them in pickers). */
function seatOwners(teams: BidTeam[], exceptTeamId?: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of teams) {
    if (t.id === exceptTeamId) continue;
    for (const { key } of CREW_SLOTS) {
      const n = (t[key] as string | null)?.trim();
      if (n && !out.has(n.toLowerCase())) out.set(n.toLowerCase(), t.teamName);
    }
  }
  return out;
}

/** Captain picker: captain users; shows which team each one leads today. */
function CaptainSelect({
  captains,
  value,
  onChange,
  currentTeamId,
  disabled,
}: {
  captains: BidCaptainLookup[];
  value: number | null;
  onChange: (userId: number | null) => void;
  currentTeamId?: number;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Captain"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={fieldClass}
      >
        <option value="">— No captain —</option>
        <SortedOptions>
          {captains.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name}
              {c.teamId != null && c.teamId !== currentTeamId ? ` · leads ${c.teamName ?? "another team"}` : ""}
            </option>
          ))}
        </SortedOptions>
      </select>
      <SelectChevron />
    </div>
  );
}

/** Seat picker: anyone from the people directory; flags people already on another team. */
function PersonSelect({
  label,
  people,
  value,
  onChange,
  takenBy,
  disabled,
}: {
  label: string;
  people: BidContactLookup[];
  value: string;
  onChange: (name: string) => void;
  takenBy: Map<string, string>;
  disabled?: boolean;
}) {
  const names = Array.from(new Set(people.map((p) => p.name.trim()).filter(Boolean)));
  // Keep a legacy free-text name selectable even if it isn't in the directory.
  if (value && !names.some((n) => n.toLowerCase() === value.toLowerCase())) names.push(value);
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      <div className="relative">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
          <option value="">— Unassigned —</option>
          <SortedOptions>
            {names.map((n) => {
              const team = takenBy.get(n.toLowerCase());
              return (
                <option key={n} value={n}>
                  {n}
                  {team ? ` · on ${team}` : ""}
                </option>
              );
            })}
          </SortedOptions>
        </select>
        <SelectChevron />
      </div>
    </label>
  );
}

/** Make `captainId` this team's captain: link them, unlink whoever led it before. */
async function setTeamCaptain(teamId: number, captainId: number | null, previousId: number | null) {
  if (captainId === previousId) return;
  if (previousId != null) await adminApi.updateUser(previousId, { teamId: null });
  if (captainId != null) await adminApi.updateUser(captainId, { teamId });
}

function TeamCrewEditor({
  team,
  teams,
  captains,
  people,
  onSaved,
  onCancel,
}: {
  team: BidTeam;
  teams: BidTeam[];
  captains: BidCaptainLookup[];
  people: BidContactLookup[];
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [captainId, setCaptainId] = useState<number | null>(team.captainUserId ?? null);
  const [draft, setDraft] = useState<CrewDraft>(() => {
    const init = emptyCrew();
    for (const { key } of CREW_SLOTS) init[key] = (team[key] as string | null) ?? "";
    return init;
  });
  const takenBy = seatOwners(teams, team.id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setTeamCaptain(team.id, captainId, team.captainUserId ?? null);
      await biddingApi.updateBiddingTeamCrew(team.id, draft);
      await onSaved();
      showToast("Team updated.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to update team"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-[#f0f1f3] bg-[#fafbfc]">
      <td colSpan={4} className="px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-muted">Captain</span>
            <CaptainSelect captains={captains} value={captainId} onChange={setCaptainId} currentTeamId={team.id} disabled={saving} />
          </label>
          {CREW_SLOTS.map(({ key, label }) => (
            <PersonSelect
              key={key}
              label={label}
              people={people}
              value={draft[key]}
              onChange={(name) => setDraft((prev) => ({ ...prev, [key]: name }))}
              takenBy={takenBy}
              disabled={saving}
            />
          ))}
        </div>
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white hover:bg-brand-secondary disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : null}
            {saving ? "Saving…" : "Save team"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="h-[34px] cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-[#f9fafb] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

function TeamsSection({
  teams,
  onReload,
}: {
  teams: BidTeam[];
  onReload: () => Promise<unknown>;
}) {
  const { showToast } = useToast();
  const teamSort = useTableSort(teams, {
    teamName: (t) => t.teamName,
    captain: (t) => t.captain,
    asstEstimator: (t) => t.bidClerk,
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [captains, setCaptains] = useState<BidCaptainLookup[]>([]);
  const [people, setPeople] = useState<BidContactLookup[]>([]);

  // New team form
  const [adding, setAdding] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [newCaptain, setNewCaptain] = useState<number | null>(null);
  const [newCrew, setNewCrew] = useState<CrewDraft>(emptyCrew);

  const loadPeople = useCallback(() => {
    void biddingApi
      .getBiddingCaptains()
      .then(setCaptains)
      .catch(() => setCaptains([]));
    void biddingApi
      .getBiddingContacts()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const reloadAll = async () => {
    await onReload();
    loadPeople();
  };

  const resetNew = () => {
    setTeamName("");
    setNewCaptain(null);
    setNewCrew(emptyCrew());
    setAdding(false);
  };

  const handleAdd = async () => {
    const name = teamName.trim();
    if (!name) {
      showToast("Team name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await biddingApi.createBiddingTeam({ teamName: name });
      const seats = Object.fromEntries(Object.entries(newCrew).filter(([, v]) => v)) as Partial<CrewDraft>;
      if (Object.keys(seats).length) await biddingApi.updateBiddingTeamCrew(created.id, seats);
      // A captain who led another team moves here (their option says which team they lead).
      if (newCaptain != null) await adminApi.updateUser(newCaptain, { teamId: created.id });
      await reloadAll();
      resetNew();
      showToast("Team added.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to add team"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this team?")) return;
    setSaving(true);
    try {
      await biddingApi.deleteBiddingTeam(id);
      await reloadAll();
      showToast("Team removed.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to delete team"), "error");
    } finally {
      setSaving(false);
    }
  };

  const takenForNew = seatOwners(teams);
  const th = "px-4 py-2.5 text-left text-[11.5px] font-semibold text-ink-muted";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white hover:bg-brand-secondary"
          >
            + New team
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="rounded-xl border border-[#b9d8f6] bg-[#f5faff] p-4">
          <p className="text-[14px] font-semibold text-ink">New team</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] font-medium text-ink-muted">Team name</span>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Team 4"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] font-medium text-ink-muted">Captain</span>
              <CaptainSelect captains={captains} value={newCaptain} onChange={setNewCaptain} disabled={saving} />
            </label>
            {CREW_SLOTS.map(({ key, label }) => (
              <PersonSelect
                key={key}
                label={label}
                people={people}
                value={newCrew[key]}
                onChange={(name) => setNewCrew((prev) => ({ ...prev, [key]: name }))}
                takenBy={takenForNew}
                disabled={saving}
              />
            ))}
          </div>
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              disabled={saving || !teamName.trim()}
              onClick={() => void handleAdd()}
              className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : null}
              {saving ? "Creating…" : "Create team"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetNew}
              className="h-[34px] cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full min-w-[480px] text-left text-[13.5px]">
          <thead className="bg-[#fafbfc]">
            <tr className="border-b border-[var(--border-subtle)]">
              <th className={th}>{teamSort.header("teamName", "Team")}</th>
              <th className={th}>{teamSort.header("captain", "Captain")}</th>
              <th className={th}>{teamSort.header("asstEstimator", "Assistant estimator")}</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-ink-muted">
                  No teams yet — click “New team”.
                </td>
              </tr>
            ) : (
              teamSort.sorted.map((t) => (
                <Fragment key={t.id}>
                  <tr className="border-t border-[#f0f1f3]">
                    <td className="px-4 py-2.5 font-semibold text-ink">{t.teamName}</td>
                    <td className="px-4 py-2.5 text-ink">{t.captain || <span className="text-ink-soft">No captain</span>}</td>
                    <td className="px-4 py-2.5 text-ink">{t.bidClerk || <span className="text-ink-soft">—</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                        className="mr-3 cursor-pointer text-[12.5px] font-medium text-brand hover:underline disabled:opacity-50"
                      >
                        {editingId === t.id ? "Close" : "Edit team"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDelete(t.id)}
                        className="cursor-pointer text-[12.5px] font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editingId === t.id ? (
                    <TeamCrewEditor
                      key={`${t.id}-editor`}
                      team={t}
                      teams={teams}
                      captains={captains}
                      people={people}
                      onSaved={async () => {
                        await reloadAll();
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WageRatesSection({
  wageRates,
  onReload,
}: {
  wageRates: BidWageRate[];
  onReload: () => Promise<unknown>;
}) {
  const { showToast } = useToast();
  const wageSort = useTableSort(wageRates, {
    label: (r) => r.displayLabel || r.rateLabel,
    wage: (r) => r.wage,
    fringe: (r) => r.fringe,
    total: (r) => r.total,
  });
  const [saving, setSaving] = useState(false);
  const [rateLabel, setRateLabel] = useState("");
  const [wage, setWage] = useState("");
  const [fringe, setFringe] = useState("");

  const handleAdd = async () => {
    const label = rateLabel.trim();
    const w = Number(wage);
    const f = Number(fringe);
    if (!label || Number.isNaN(w)) {
      showToast("Rate label and wage are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await biddingApi.createBiddingWageRate({
        rateLabel: label,
        wage: w,
        fringe: Number.isNaN(f) ? 0 : f,
      });
      await onReload();
      setRateLabel("");
      setWage("");
      setFringe("");
      showToast("Wage rate added.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to add wage rate"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this wage rate?")) return;
    setSaving(true);
    try {
      await biddingApi.deleteBiddingWageRate(id);
      await onReload();
      showToast("Wage rate removed.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to delete wage rate"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700 table-scroll">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">{wageSort.header("label", "Label")}</th>
              <th className="px-3 py-2">{wageSort.header("wage", "Wage")}</th>
              <th className="px-3 py-2">{wageSort.header("fringe", "Fringe")}</th>
              <th className="px-3 py-2">{wageSort.header("total", "Total")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {wageRates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-stone-500">
                  No wage rates — add one below or run backend seed.
                </td>
              </tr>
            ) : (
              wageSort.sorted.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-3 py-2 font-medium text-stone-900 dark:text-stone-100">
                    {r.displayLabel || r.rateLabel}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-700 dark:text-stone-300">
                    {r.wage.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-700 dark:text-stone-300">
                    {r.fringe.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-700 dark:text-stone-300">
                    {r.total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(r.id)}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Rate label (e.g. Journeyman)"
          value={rateLabel}
          onChange={(e) => setRateLabel(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Wage"
          value={wage}
          onChange={(e) => setWage(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Fringe"
          value={fringe}
          onChange={(e) => setFringe(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
        >
          Add wage rate
        </button>
      </div>
    </div>
  );
}

function PayrollBurdenSection({
  payrollBurden,
  onReload,
}: {
  payrollBurden: PayrollBurdenItem[];
  onReload: () => Promise<unknown>;
}) {
  const { showToast } = useToast();
  const burdenSort = useTableSort(payrollBurden, {
    code: (i) => i.code,
    label: (i) => i.label,
    type: (i) => RATE_TYPE_LABELS[i.rateType],
    rate: (i) => i.rate,
  });
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [rateType, setRateType] = useState<PayrollBurdenRateType>("pct_wage");
  const [rate, setRate] = useState("");

  const handleAdd = async () => {
    const c = code.trim();
    const l = label.trim();
    const r = Number(rate);
    if (!c || !l || Number.isNaN(r)) {
      showToast("Code, label, and rate are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await biddingApi.createBiddingPayrollBurden({
        code: c,
        label: l,
        rateType,
        rate: r,
        includeInBaseRate: true,
      });
      await onReload();
      setCode("");
      setLabel("");
      setRate("");
      showToast("Payroll burden line added.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to add burden line"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this burden line?")) return;
    setSaving(true);
    try {
      await biddingApi.deleteBiddingPayrollBurden(id);
      await onReload();
      showToast("Burden line removed.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to delete burden line"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700 table-scroll">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">{burdenSort.header("code", "Code")}</th>
              <th className="px-3 py-2">{burdenSort.header("label", "Label")}</th>
              <th className="px-3 py-2">{burdenSort.header("type", "Type")}</th>
              <th className="px-3 py-2">{burdenSort.header("rate", "Rate")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {payrollBurden.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-stone-500">
                  No payroll burden lines configured.
                </td>
              </tr>
            ) : (
              burdenSort.sorted.map((item) => (
                <tr key={item.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-3 py-2 font-mono text-stone-700 dark:text-stone-300">
                    {item.code}
                  </td>
                  <td className="px-3 py-2 text-stone-900 dark:text-stone-100">{item.label}</td>
                  <td className="px-3 py-2 text-stone-600 dark:text-stone-400">
                    {RATE_TYPE_LABELS[item.rateType]}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-700 dark:text-stone-300">
                    {item.rate}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(item.id)}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <input
          type="text"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <input
          type="text"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <div className="relative">
          <select
            value={rateType}
            onChange={(e) => setRateType(e.target.value as PayrollBurdenRateType)}
            className="w-full appearance-none rounded-lg border border-stone-300 px-3 py-2 pr-9 text-sm dark:border-stone-600 dark:bg-stone-900"
          >
            <SortedOptions>
              {(Object.keys(RATE_TYPE_LABELS) as PayrollBurdenRateType[]).map((t) => (
                <option key={t} value={t}>
                  {RATE_TYPE_LABELS[t]}
                </option>
              ))}
            </SortedOptions>
          </select>
          <SelectChevron />
        </div>
        <input
          type="number"
          step="0.0001"
          placeholder="Rate"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
        >
          Add burden line
        </button>
      </div>
    </div>
  );
}

/** No section: all three lists stacked (legacy). With a section: just that list, for its own Settings page. */
export function BiddingLookupsAdmin({ section }: { section?: "teams" | "wages" | "burden" } = {}) {
  const { teams, wageRates, payrollBurden, loading, reloadTeams, reloadWageRates, reloadPayrollBurden } =
    useBiddingLookups();

  const reloadTeamsList = useCallback(() => reloadTeams(), [reloadTeams]);
  const reloadWages = useCallback(() => reloadWageRates(), [reloadWageRates]);
  const reloadBurden = useCallback(() => reloadPayrollBurden(), [reloadPayrollBurden]);

  if (loading) {
    return (
      <Card>
        <TableSkeleton rows={6} toolbar={false} />
      </Card>
    );
  }

  if (section) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {section === "teams" ? <TeamsSection teams={teams} onReload={reloadTeamsList} /> : null}
        {section === "wages" ? <WageRatesSection wageRates={wageRates} onReload={reloadWages} /> : null}
        {section === "burden" ? <PayrollBurdenSection payrollBurden={payrollBurden} onReload={reloadBurden} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Teams
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Bidding crew teams — captain / bid clerk picked in Assignment auto-fill from these.
            </p>
          </div>
          <TeamsSection teams={teams} onReload={reloadTeamsList} />
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Wage rates
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Bidding wage lookup — used on the Base Bid sheet (B8) and burdened-rate API.
            </p>
          </div>
          <WageRatesSection wageRates={wageRates} onReload={reloadWages} />
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Payroll burden
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Lines that roll into burdened hourly rate — shown per wage on the bid sheet.
            </p>
          </div>
          <PayrollBurdenSection payrollBurden={payrollBurden} onReload={reloadBurden} />
        </div>
      </Card>
    </div>
  );
}
