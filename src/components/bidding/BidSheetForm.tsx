"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  BidFormField,
  BidNumberInput,
  BidSelect,
} from "@/components/bidding/BidFormField";
import { BidSheetAlerts } from "@/components/bidding/BidSheetAlerts";
import { BidSheetHeaderSection } from "@/components/bidding/BidSheetHeaderSection";
import { BidSheetCompanyInfoSection } from "@/components/bidding/BidSheetCompanyInfoSection";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { BidSheetTabNav, type BidSheetTab } from "@/components/bidding/BidSheetTabNav";
import { BidSheetResultsRail } from "@/components/bidding/BidSheetResultsRail";
import { BidSheetToolbar } from "@/components/bidding/BidSheetToolbar";
import { BidSystemsInputTable } from "@/components/bidding/BidSystemsInputTable";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { formatMoneyPrecise, formatPercentDecimal } from "@/lib/bidding/format";
import { parseSystemsComputed, parseWarnings } from "@/lib/bidding/parse-computed";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { ProcessMeta } from "@/lib/bidding/process-types";

function BoolSelect({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <BidFormField label={label} htmlFor={id}>
      <BidSelect
        id={id}
        value={value ? "yes" : "no"}
        onChange={(v) => onChange(v === "yes")}
        disabled={disabled}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
      />
    </BidFormField>
  );
}

export function BidSheetForm() {
  const {
    bid,
    lookups,
    burdenedRate,
    initialLoading,
    saving,
    error,
    isEditable,
    canRead,
    dirty,
    lastSavedAt,
    serverVerifyWarnings,
    selectedTeam,
    setBidHeader,
    setJobId,
    setCompanyInfoField,
    prefillCompanyFromJob,
    setBaseBidField,
    setProjectState,
    updateSystemRow,
    selectWageRate,
    previewCalculate,
    verifyServerCalc,
    saveNow,
    saveCoverSheet,
    saveProcess,
    processDirty,
    markSubmitted,
    reopenAsDraft,
    uploadAttachment,
    deleteAttachment,
  } = useBidSheet();
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BidSheetTab>("sheet");
  const [processMeta, setProcessMeta] = useState<ProcessMeta | null>(null);
  const { canSummary } = useBiddingAccess();
  const canViewSummary = canSummary;

  useEffect(() => {
    void biddingApi
      .getProcessMeta()
      .then(setProcessMeta)
      .catch(() => setProcessMeta(null));
  }, []);

  // Proposal = output: copy intake identity into calc fields when empty.
  useEffect(() => {
    if (!bid || !isEditable) return;
    const impacted = bid.process?.impactedGsf;
    const addrState = bid.process?.projectAddress?.state;
    const gsf = bid.baseBid?.gsfOfBuilding;
    const projectState = bid.baseBid?.projectState as string | undefined;
    if (
      typeof impacted === "number" &&
      (gsf == null || gsf === undefined) &&
      Number.isFinite(impacted)
    ) {
      setBaseBidField("gsfOfBuilding", impacted);
    }
    if (addrState && !projectState) {
      setProjectState(String(addrState));
    }
  }, [
    bid,
    isEditable,
    setBaseBidField,
    setProjectState,
  ]);

  if (initialLoading || !bid) {
    return (
      <div className="mx-auto w-full max-w-3xl py-6">
        <FormSkeleton fields={8} />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view bid sheets."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  const b = bid.baseBid ?? {};
  const c = bid.computed ?? {};
  const systemsComputed = parseSystemsComputed(c);
  const warnings = parseWarnings(c);
  /** Proposal screen is output + calculator — identity is RO (process-meta.proposalEditor). */
  const identityLocked = processMeta?.proposalEditor?.isOutput !== false;
  /** Job, dates, wage, schedule, parking, and Mike grid are filled on earlier tabs. */
  const capturedEarlier = identityLocked;
  const assignment = bid.process?.assignment;
  const teamFromAssignment =
    selectedTeam ??
    (typeof assignment?.teamId === "number"
      ? lookups.teams.find((t) => t.id === assignment.teamId) ?? null
      : null);
  const teamLabel =
    teamFromAssignment?.teamName ||
    (assignment?.teamId != null ? `Team #${assignment.teamId}` : null) ||
    (b.teamName as string) ||
    "—";
  const aeLabel =
    assignment?.assistantEstimator ||
    teamFromAssignment?.assistantEstimator ||
    (b.assistantEstimator as string) ||
    "—";
  const captainLabel =
    assignment?.captain || teamFromAssignment?.captain || "—";
  const projectStateRo =
    (bid.process?.projectAddress?.state as string | undefined) ||
    (b.projectState as string | undefined) ||
    "";
  const stateTax =
    typeof b.stateSalesTaxRate === "number"
      ? b.stateSalesTaxRate
      : lookups.states.find((s) => s.stateCode === projectStateRo)?.salesTaxRate;
  const impactedGsf =
    bid.process?.impactedGsf != null
      ? Number(bid.process.impactedGsf)
      : typeof b.gsfOfBuilding === "number"
        ? (b.gsfOfBuilding as number)
        : null;

  const wageRateId =
    lookups.wageRates.find((w) => w.rateLabel === b.wageRateLabel)?.id ?? "";

  const entityOptions = [
    { value: "", label: "Select company…" },
    ...lookups.ourEntities.map((e) => ({
      value: String(e.id),
      label: e.name,
    })),
  ];

  const hoursPerWeek =
    typeof b.hoursPerDay === "number" && typeof b.daysPerWeek === "number"
      ? b.hoursPerDay * b.daysPerWeek
      : null;

  const hasComputed = Object.keys(c).length > 0;
  const attachmentCount = bid.attachments?.length ?? 0;
  const showResultsRail = canViewSummary && activeTab === "sheet";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 ui-animate-in">
      <header className="shrink-0">
        <h2 className="text-base font-semibold text-ink">Proposal</h2>
        <p className="mt-1 text-[13px] text-ink/45">
          Cover sheet + calculator. Identity and team are read-only here — edit
          on Intake / Assignment.
        </p>
      </header>

      <BidSheetAlerts
        error={error}
        warnings={warnings}
        isEditable={isEditable}
        status={bid.status}
        saving={saving}
        onReopen={() => void reopenAsDraft()}
      />

      {!isEditable && canRead && bid.status === "draft" ? (
        <div className="rounded-xl border border-ink/[0.08] bg-ink/[0.03] px-4 py-2.5 text-xs text-ink/60">
          View-only — you need{" "}
          <span className="font-mono">{PERMISSIONS.biddingWrite}</span> to edit
          this draft.
        </div>
      ) : null}

      <BidSheetTabNav
        active={activeTab}
        onChange={setActiveTab}
        attachmentCount={attachmentCount}
      />

      {!canViewSummary ? (
        <RestrictedState
          title="Totals restricted"
          message="You can edit this bid, but MIKE/PJ totals and calculation detail require additional access."
          permission="bidding:summary"
        />
      ) : null}

      <div
        className={
          showResultsRail ? "bid-workspace min-h-0 flex-1" : "min-h-0 flex-1"
        }
      >
        <div className="bid-workspace-form space-y-[18px] pb-8">
          {activeTab === "sheet" ? (
            <>
          <BidSheetHeaderSection
            bid={bid}
            isEditable={isEditable}
            identityLocked={identityLocked}
            entityOptions={entityOptions}
            jobs={lookups.jobs}
            onEstimateNumber={(v) => setBidHeader({ estimateNumber: v })}
            onBidName={(v) => setBidHeader({ bidName: v })}
            onBidDate={(v) => setBaseBidField("bidDate", v)}
            onSubmitDate={(v) => setBidHeader({ submitDate: v || null })}
            onTimeEstimate={(v) => setBidHeader({ timeEstimate: v ?? null })}
            onEntity={(v) => setBidHeader({ ourEntityId: v ? Number(v) : bid.ourEntityId })}
            onJobChange={(jobId, prefill) => void setJobId(jobId, { prefillCompany: prefill })}
          />

          <Card>
            <CardHeader
              title="Team"
              subtitle="From Assignment — crew auto-fills from team lookup. Not picked here."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <BidFormField label="Team" htmlFor="team-ro">
                <p
                  id="team-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {teamLabel}
                </p>
              </BidFormField>
              <BidFormField label="Captain" htmlFor="captain-ro">
                <p
                  id="captain-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {captainLabel}
                </p>
              </BidFormField>
              <BidFormField label="Assistant estimator" htmlFor="asst-ro">
                <p
                  id="asst-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {aeLabel}
                </p>
              </BidFormField>
            </div>
            {teamFromAssignment ? (
              <div className="mt-3 grid gap-2.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] p-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                {(
                  [
                    ["Duct 1", teamFromAssignment.duct1],
                    ["Duct 2", teamFromAssignment.duct2],
                    ["Hydronic 1", teamFromAssignment.hydronic1],
                    ["Hydronic 2", teamFromAssignment.hydronic2],
                    ["Plumbing 1", teamFromAssignment.plumbing1],
                    ["Plumbing 2", teamFromAssignment.plumbing2],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-ink/35">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-ink">
                      {val ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink/45">
                No assigned team yet — set captain / team on Assignment (or
                Settings → My team for the captain’s crew).
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Project identity"
              subtitle="From Intake — building / project type, impacted SF, state. Calculator fields stay below."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <BidFormField label="Building type" htmlFor="btype-ro">
                <p
                  id="btype-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {bid.process?.constructionType || "—"}
                </p>
              </BidFormField>
              <BidFormField label="Project type" htmlFor="ptype-ro">
                <p
                  id="ptype-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {bid.process?.constructionSubtype || "—"}
                </p>
              </BidFormField>
              <BidFormField label="Impacted SF (GSF)" htmlFor="gsf-ro">
                <p
                  id="gsf-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {impactedGsf != null ? impactedGsf.toLocaleString() : "—"}
                </p>
                <span className="mt-1 block text-[11px] text-ink/40">
                  Copied to baseBid.gsfOfBuilding for calc — edit on Intake
                </span>
              </BidFormField>
              <BidFormField label="Project state" htmlFor="state-ro">
                <p
                  id="state-ro"
                  className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 text-[15px] font-medium text-ink"
                >
                  {projectStateRo || "—"}
                </p>
              </BidFormField>
              {typeof stateTax === "number" ? (
                <BidFormField label="State sales tax" htmlFor="stax-ro">
                  <p
                    id="stax-ro"
                    className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-3 font-mono text-[15px] font-medium text-ink"
                  >
                    {formatPercentDecimal(stateTax)}
                  </p>
                </BidFormField>
              ) : null}
              <BidFormField
                label="MBE / preference"
                htmlFor="pref"
                hint="Also on Setup — kept in sync"
              >
                <BidSelect
                  id="pref"
                  value={
                    (b.preference as string) ||
                    bid.process?.mbePreference ||
                    ""
                  }
                  onChange={(v) => setBaseBidField("preference", v)}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "—" },
                    ...lookups.preferences.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })),
                  ]}
                />
              </BidFormField>
              <BoolSelect
                id="salestax"
                label="Sales tax applicable"
                value={b.salesTaxApplicable as boolean | undefined}
                onChange={(v) => setBaseBidField("salesTaxApplicable", v)}
                disabled={!isEditable || capturedEarlier}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Wage rate"
              subtitle="Set on Setup. Composite labor rate stays editable here (Excel D10)."
            />
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              <BidFormField label="Wage rate" htmlFor="wage">
                <BidSelect
                  id="wage"
                  value={wageRateId === "" ? "" : String(wageRateId)}
                  onChange={(v) => {
                    if (v) void selectWageRate(Number(v));
                  }}
                  disabled={!isEditable || capturedEarlier}
                  options={[
                    { value: "", label: "Select wage rate…" },
                    ...lookups.wageRates.map((w) => ({
                      value: String(w.id),
                      label: w.displayLabel || w.rateLabel,
                    })),
                  ]}
                />
              </BidFormField>
              {burdenedRate ? (
                <div className="col-span-full mt-1 rounded-xl border border-brand/20 bg-brand/[0.04] p-3">
                  <p className="text-[13px] font-semibold text-ink">
                    Burdened: {formatMoneyPrecise(burdenedRate.burdenedRate)}/hr
                  </p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div className="rounded-[10px] border border-ink/[0.07] bg-white px-2.5 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-ink/40">
                        Wage
                      </span>
                      <b className="mt-0.5 block font-mono text-sm font-semibold">
                        {formatMoneyPrecise(burdenedRate.wage)}
                      </b>
                    </div>
                    <div className="rounded-[10px] border border-ink/[0.07] bg-white px-2.5 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-ink/40">
                        Burden
                      </span>
                      <b className="mt-0.5 block font-mono text-sm font-semibold">
                        {formatMoneyPrecise(burdenedRate.totalBurden)}
                      </b>
                    </div>
                    <div className="rounded-[10px] border border-ink/[0.07] bg-white px-2.5 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-ink/40">
                        Total
                      </span>
                      <b className="mt-0.5 block font-mono text-sm font-semibold">
                        {formatMoneyPrecise(burdenedRate.burdenedRate)}
                      </b>
                    </div>
                  </div>
                  {burdenedRate.lines.length > 0 ? (
                    <div className="mt-2.5 overflow-x-auto">
                      <table className="w-full min-w-[280px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-ink/[0.07] text-[10px] uppercase tracking-[0.04em] text-ink/40">
                            <th className="py-1.5 pr-2 font-bold">Code</th>
                            <th className="py-1.5 pr-2 font-bold">Line</th>
                            <th className="py-1.5 text-right font-bold">$/hr</th>
                          </tr>
                        </thead>
                        <tbody>
                          {burdenedRate.lines.map((line) => (
                            <tr
                              key={line.code}
                              className="border-b border-ink/[0.05]"
                            >
                              <td className="py-1.5 pr-2 font-mono text-ink/60">
                                {line.code}
                              </td>
                              <td className="py-1.5 pr-2 text-ink/70">
                                {line.label}
                              </td>
                              <td className="py-1.5 text-right font-mono text-ink">
                                {formatMoneyPrecise(line.amountPerHour)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              <BidFormField
                label="Labor rate composite / hr"
                htmlFor="composite"
                hint="D10 — crew-weighted composite for PJ totals; not auto-filled from burdened rate (enter manually, e.g. 51.7 on IDC6098)."
              >
                <BidNumberInput
                  id="composite"
                  value={b.laborRateCompositePerHour as number | undefined}
                  onChange={(v) => setBaseBidField("laborRateCompositePerHour", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              {burdenedRate ? (
                <div className="flex items-end">
                  <p className="rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-4 py-3 text-xs leading-relaxed text-ink/55">
                    Single-tier burdened rate is{" "}
                    <span className="font-mono font-semibold text-ink">
                      {formatMoneyPrecise(burdenedRate.burdenedRate)}/hr
                    </span>
                    . Excel D10 may use a higher crew-weighted composite — adjust above if PJ totals
                    look low.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
              <BoolSelect
                id="citizen"
                label="Citizen project"
                value={b.citizenProject as boolean | undefined}
                onChange={(v) => setBaseBidField("citizenProject", v)}
                disabled={!isEditable || capturedEarlier}
              />
              <BoolSelect
                id="apprentice"
                label="Apprenticeable"
                value={b.apprenticeable as boolean | undefined}
                onChange={(v) => setBaseBidField("apprenticeable", v)}
                disabled={!isEditable || capturedEarlier}
              />
              <BoolSelect
                id="pla"
                label="PLA"
                value={
                  (b.pla as boolean | undefined) ??
                  (bid.process?.pla as boolean | undefined)
                }
                onChange={(v) => setBaseBidField("pla", v)}
                disabled={!isEditable}
              />
              <BoolSelect
                id="ccip"
                label="CCIP covers WC"
                value={
                  (b.ccipCoversWc as boolean | undefined) ??
                  (bid.process?.ocipCcip?.coversWc as boolean | undefined)
                }
                onChange={(v) => setBaseBidField("ccipCoversWc", v)}
                disabled={!isEditable}
              />
            </div>
            <p className="mt-2 text-[10px] text-ink/40">
              PLA / CCIP / preference also editable on Setup — wage rate here ≠
              Setup wage decision.
            </p>
          </Card>

          <Card>
            <CardHeader title="Schedule & margin" subtitle="Filled on Setup. Shown here for the calculator output." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BidFormField
                label="Margin"
                htmlFor="margin"
                hint="Decimal: 0.25 = 25%"
              >
                <BidNumberInput
                  id="margin"
                  value={b.marginPercent as number | undefined}
                  onChange={(v) => setBaseBidField("marginPercent", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Hours / day" htmlFor="hpd">
                <BidNumberInput
                  id="hpd"
                  value={b.hoursPerDay as number | undefined}
                  onChange={(v) => setBaseBidField("hoursPerDay", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Days / week" htmlFor="dpw">
                <BidNumberInput
                  id="dpw"
                  value={b.daysPerWeek as number | undefined}
                  onChange={(v) => setBaseBidField("daysPerWeek", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Duration (months)" htmlFor="dur">
                <BidNumberInput
                  id="dur"
                  value={b.durationMonths as number | undefined}
                  onChange={(v) => setBaseBidField("durationMonths", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Start in # months from bid" htmlFor="startmo">
                <BidNumberInput
                  id="startmo"
                  value={b.startInMonths as number | undefined}
                  onChange={(v) => setBaseBidField("startInMonths", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Backcheck hours" htmlFor="backcheck">
                <BidNumberInput
                  id="backcheck"
                  value={b.backcheckHours as number | undefined}
                  onChange={(v) => setBaseBidField("backcheckHours", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Average # people" htmlFor="avgpeople">
                <BidNumberInput
                  id="avgpeople"
                  value={b.averageNoPeople as number | undefined}
                  onChange={(v) => setBaseBidField("averageNoPeople", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField
                label="Material escalation / year"
                htmlFor="esc"
                hint="Decimal: 0.04 = 4%"
              >
                <BidNumberInput
                  id="esc"
                  value={b.materialEscalationPerYear as number | undefined}
                  onChange={(v) => setBaseBidField("materialEscalationPerYear", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
            </div>
          </Card>

          <Card>
            <CardHeader title="Parking & lifts" subtitle="Filled on Setup. Results still use these calculator inputs." />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <BoolSelect
                id="parking"
                label="Parking"
                value={b.parking as boolean | undefined}
                onChange={(v) => setBaseBidField("parking", v)}
                disabled={!isEditable || capturedEarlier}
              />
              <BidFormField
                label="% people that park"
                htmlFor="parkpct"
                hint="1 = 100% (not 0–100)"
              >
                <BidNumberInput
                  id="parkpct"
                  value={b.parkingPeoplePercent as number | undefined}
                  onChange={(v) => setBaseBidField("parkingPeoplePercent", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Parking cost / day" htmlFor="parkcost">
                <BidNumberInput
                  id="parkcost"
                  value={b.parkingCostPerDay as number | undefined}
                  onChange={(v) => setBaseBidField("parkingCostPerDay", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BoolSelect
                id="lifts"
                label="Lifts needed"
                value={b.liftsNeeded as boolean | undefined}
                onChange={(v) => setBaseBidField("liftsNeeded", v)}
                disabled={!isEditable || capturedEarlier}
              />
              <BidFormField
                label="Lift %"
                htmlFor="liftpct"
                hint="Decimal: 0.5 = 50%"
              >
                <BidNumberInput
                  id="liftpct"
                  value={b.liftPercentage as number | undefined}
                  onChange={(v) => setBaseBidField("liftPercentage", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
              <BidFormField label="Lift cost / 4 weeks" htmlFor="liftcost">
                <BidNumberInput
                  id="liftcost"
                  value={b.liftCostPer4Weeks as number | undefined}
                  onChange={(v) => setBaseBidField("liftCostPer4Weeks", v)}
                  disabled={!isEditable || capturedEarlier}
                />
              </BidFormField>
            </div>
          </Card>

          <BidSystemsInputTable
            systems={bid.systems}
            systemsComputed={systemsComputed}
            isEditable={isEditable && !capturedEarlier}
            onUpdateRow={updateSystemRow}
          />
            </>
          ) : null}

          {activeTab === "company" ? (
            <>
              {!bid.jobId ? (
                <p className="rounded-xl border border-ink/[0.08] bg-ink/[0.02] px-4 py-2.5 text-xs text-ink/55">
                  Link a job on{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("sheet")}
                    className="font-semibold text-brand hover:underline"
                  >
                    Bidding sheet
                  </button>{" "}
                  to enable Prefill from job.
                </p>
              ) : null}
              <BidSheetCompanyInfoSection
                bid={bid}
                jobLabel={
                  bid.jobId
                    ? (lookups.jobs.find((j) => j.id === bid.jobId)?.name ??
                      `Job #${bid.jobId}`)
                    : null
                }
                isEditable={isEditable}
                prefillLoading={prefillLoading}
                onFieldChange={(key, value) => setCompanyInfoField(key, value)}
                onPrefillFromJob={async () => {
                  setPrefillLoading(true);
                  try {
                    await prefillCompanyFromJob();
                  } finally {
                    setPrefillLoading(false);
                  }
                }}
              />
            </>
          ) : null}

          {activeTab === "files" ? (
            <BidAttachmentsSection
              attachments={(bid.attachments ?? []).filter((a) => a.label !== "drawings")}
              isEditable={isEditable}
              uploading={saving}
              onUpload={async (file, opts) => uploadAttachment(file, opts)}
              onDelete={async (id) => deleteAttachment(id)}
            />
          ) : null}
        </div>

        {showResultsRail ? (
          <BidSheetResultsRail
            computed={c}
            hasComputed={hasComputed}
            hoursPerWeek={hoursPerWeek}
          />
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-ink/[0.06] bg-canvas/95 pt-3 pb-1 backdrop-blur-md">
        <BidSheetToolbar
          isEditable={isEditable}
          saving={saving}
          dirty={dirty}
          lastSavedAt={lastSavedAt}
          status={bid.status}
          serverVerifyWarnings={serverVerifyWarnings}
          onPreview={previewCalculate}
          onSave={() =>
            void (async () => {
              if (!isEditable) {
                await saveCoverSheet();
                return;
              }
              // Match header Save + sheet calc: flush process draft then calculator.
              if (processDirty) await saveProcess();
              await saveNow();
            })()
          }
          onSubmit={() => void markSubmitted()}
          onVerifyServer={() => void verifyServerCalc()}
        />
      </div>
    </div>
  );
}
