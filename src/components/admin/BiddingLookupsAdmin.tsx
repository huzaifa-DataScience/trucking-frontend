"use client";

import { Fragment, useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidTeam, BidWageRate, PayrollBurdenItem, PayrollBurdenRateType } from "@/lib/bidding/types";
import type { TeamCrewSlot } from "@/lib/api/endpoints/bidding";

const CREW_SLOTS: { key: TeamCrewSlot; label: string }[] = [
  { key: "bidClerk", label: "Bid clerk" },
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

function TeamCrewEditor({
  team,
  onSaved,
  onCancel,
}: {
  team: BidTeam;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<TeamCrewSlot, string>>(() => {
    const init = {} as Record<TeamCrewSlot, string>;
    for (const { key } of CREW_SLOTS) init[key] = (team[key] as string | null) ?? "";
    return init;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await biddingApi.updateBiddingTeamCrew(team.id, draft);
      await onSaved();
      showToast("Crew updated.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to update crew"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/30">
      <td colSpan={4} className="px-3 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CREW_SLOTS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {label}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="— Unassigned —"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
                />
                {draft[key] ? (
                  <button
                    type="button"
                    title="Remove"
                    onClick={() => setDraft((prev) => ({ ...prev, [key]: "" }))}
                    className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
          >
            {saving ? "Saving…" : "Save crew"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
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
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = async () => {
    const name = teamName.trim();
    if (!name) {
      showToast("Team name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      await biddingApi.createBiddingTeam({ teamName: name });
      await onReload();
      setTeamName("");
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
      await onReload();
      showToast("Team removed.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to delete team"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">Team name</th>
              <th className="px-3 py-2">Captain</th>
              <th className="px-3 py-2">Bid clerk</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-stone-500">
                  No teams — add one below.
                </td>
              </tr>
            ) : (
              teams.map((t) => (
                <Fragment key={t.id}>
                  <tr className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-3 py-2 font-medium text-stone-900 dark:text-stone-100">
                      {t.teamName}
                    </td>
                    <td className="px-3 py-2 text-stone-700 dark:text-stone-300">
                      {t.captain || "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-700 dark:text-stone-300">
                      {t.bidClerk || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                        className="mr-3 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        {editingId === t.id ? "Close" : "Edit crew"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDelete(t.id)}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editingId === t.id ? (
                    <TeamCrewEditor
                      key={`${t.id}-editor`}
                      team={t}
                      onSaved={async () => {
                        await onReload();
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

      <div className="grid gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Team name (e.g. Team 3)"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 sm:col-span-3"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
        >
          Add team
        </button>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Click &ldquo;Edit crew&rdquo; on a team to assign or remove bid clerk / duct / hydronic /
        plumbing seats directly. Captain is set separately from Assignment.
      </p>
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
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Wage</th>
              <th className="px-3 py-2">Fringe</th>
              <th className="px-3 py-2">Total</th>
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
              wageRates.map((r) => (
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
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Rate</th>
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
              payrollBurden.map((item) => (
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
            {(Object.keys(RATE_TYPE_LABELS) as PayrollBurdenRateType[]).map((t) => (
              <option key={t} value={t}>
                {RATE_TYPE_LABELS[t]}
              </option>
            ))}
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

export function BiddingLookupsAdmin() {
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
