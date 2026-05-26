"use client";

import Link from "next/link";
import { use, useCallback, useState } from "react";
import { ComputedField } from "@/components/bidding/ComputedField";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { formatMoney, formatPercent } from "@/lib/bidding/mock-data";

const TEAMS = [
  { value: "mike", label: "Mike Johnson team" },
  { value: "bil", label: "Bil Shams" },
  { value: "pj", label: "PJ Smith team" },
];

const WAGE_KEYS = [
  { value: "dc-citizen", label: "2026 - DC/Federal in DC / CITIZEN" },
  { value: "non-scale", label: "NON-SCALE" },
];

export default function BidBaseBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [team, setTeam] = useState("bil");
  const [margin, setMargin] = useState("0.25");
  const [wageKey, setWageKey] = useState("non-scale");
  const [recalc, setRecalc] = useState(false);

  const marginN = Number(margin) || 0;
  const wage = 30;
  const fringe = 7.29;
  const total = wage + fringe;
  const mikeEst = 43837.68;
  const pjEst = 47600;
  const costHrMike = 89.91;
  const costHrPj = 97.62;

  const simulateRecalc = useCallback(() => {
    setRecalc(true);
    setTimeout(() => setRecalc(false), 900);
  }, []);

  return (
    <div className="bid-animate-in space-y-6">
      <div
        className={`grid gap-4 lg:grid-cols-2 ${recalc ? "bid-recalc-pulse rounded-2xl p-1" : ""}`}
      >
        <ComputedField label="MIKE estimate" value={formatMoney(mikeEst)} emphasis />
        <ComputedField label="PJ estimate" value={formatMoney(pjEst)} emphasis />
        <ComputedField label="Cost / hour (MIKE)" value={formatMoney(costHrMike)} />
        <ComputedField label="Cost / hour (PJ)" value={formatMoney(costHrPj)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Team & schedule" subtitle="Selecting a team fills captain, clerk, and trade leads." />
          <div className="grid gap-4 sm:grid-cols-2">
            <BidFormField label="Team" htmlFor="team">
              <BidSelect
                id="team"
                value={team}
                onChange={(v) => {
                  setTeam(v);
                  simulateRecalc();
                }}
                options={TEAMS}
              />
            </BidFormField>
            <BidFormField label="Project state" htmlFor="st">
              <BidSelect
                id="st"
                value="DC"
                onChange={() => simulateRecalc()}
                options={[
                  { value: "DC", label: "DC" },
                  { value: "MD", label: "MD" },
                  { value: "VA", label: "VA" },
                ]}
              />
            </BidFormField>
            <BidFormField label="Margin" htmlFor="margin">
              <BidTextInput
                id="margin"
                value={margin}
                onChange={(v) => {
                  setMargin(v);
                  simulateRecalc();
                }}
              />
            </BidFormField>
            <BidFormField label="Hours / day · Days / week" htmlFor="hrs">
              <div className="mt-1.5 flex gap-2">
                <BidTextInput id="hrs" value="8" onChange={() => simulateRecalc()} />
                <BidTextInput id="dys" value="5" onChange={() => simulateRecalc()} />
              </div>
            </BidFormField>
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] p-4 sm:grid-cols-3">
            {[
              ["Captain", "Mike Johnson"],
              ["Bid clerk", "PJ Smith"],
              ["Duct 1", "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">{k}</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Wage rate" subtitle="XLOOKUP from wage list — wage + fringe = total." />
          <BidFormField label="Category" htmlFor="wage">
            <BidSelect
              id="wage"
              value={wageKey}
              onChange={(v) => {
                setWageKey(v);
                simulateRecalc();
              }}
              options={WAGE_KEYS}
            />
          </BidFormField>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ComputedField label="Wage" value={`$${wage.toFixed(2)}`} />
            <ComputedField label="Fringe" value={`$${fringe.toFixed(2)}`} />
            <ComputedField label="Total" value={`$${total.toFixed(2)}`} emphasis />
          </div>
          <p className="mt-3 rounded-lg bg-brand/[0.06] px-3 py-2 text-xs leading-relaxed text-ink/55">
            NON-SCALE — W: (${wage} + F: ${fringe}) = Total ${total.toFixed(2)}
          </p>
          <p className="mt-3 text-xs text-ink/40">Margin applied: {formatPercent(marginN)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Lifts & parking" />
        <div className="grid gap-4 sm:grid-cols-4">
          <BidFormField label="Lifts needed" htmlFor="lift">
            <BidSelect
              id="lift"
              value="yes"
              onChange={() => simulateRecalc()}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </BidFormField>
          <ComputedField label="Lift total" value={formatMoney(1815)} />
          <BidFormField label="Parking" htmlFor="park">
            <BidTextInput id="park" value="0" onChange={() => {}} />
          </BidFormField>
          <ComputedField label="Material escalation" value="0%" />
        </div>
      </Card>

      <div className="flex justify-between">
        <Link
          href={`/bidding/${id}/startup`}
          className="text-sm font-medium text-ink/50 hover:text-ink"
        >
          ← Startup
        </Link>
        <Link
          href={`/bidding/${id}/labor`}
          className="inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
        >
          Labor & burden →
        </Link>
      </div>
    </div>
  );
}
