"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidWageRate, PayrollBurdenItem, PayrollBurdenRateType } from "@/lib/bidding/types";

const RATE_TYPE_LABELS: Record<PayrollBurdenRateType, string> = {
  pct_wage: "% of wage",
  capped_annual: "Capped annual",
  per_hour: "Per hour",
};

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
        <select
          value={rateType}
          onChange={(e) => setRateType(e.target.value as PayrollBurdenRateType)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        >
          {(Object.keys(RATE_TYPE_LABELS) as PayrollBurdenRateType[]).map((t) => (
            <option key={t} value={t}>
              {RATE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
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
  const { wageRates, payrollBurden, loading, reloadWageRates, reloadPayrollBurden } =
    useBiddingLookups();

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
