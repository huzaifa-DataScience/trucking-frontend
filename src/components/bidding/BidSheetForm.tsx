"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { ComputedField } from "@/components/bidding/ComputedField";
import {
  BidFormField,
  BidNumberInput,
  BidSelect,
  BidTextInput,
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
import { LogoLoader } from "@/components/ui/LogoLoader";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { PERMISSIONS } from "@/lib/auth/permissions";

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
    markSubmitted,
    reopenAsDraft,
    uploadAttachment,
    deleteAttachment,
  } = useBidSheet();
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BidSheetTab>("sheet");
  const { canSummary } = useBiddingAccess();
  const canViewSummary = canSummary;

  if (initialLoading || !bid) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
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
      <nav aria-label="Breadcrumb" className="text-xs text-ink/45">
        <Link href="/bidding" className="font-medium transition-colors hover:text-ink">
          Bidding
        </Link>
        <span aria-hidden className="mx-1.5 text-ink/25">
          /
        </span>
        <span className="font-mono font-medium text-ink/60">
          {bid.estimateNumber || "Estimate"}
        </span>
      </nav>

      <BidSheetAlerts
        error={error}
        warnings={warnings}
        hasComputed={hasComputed}
        isEditable={isEditable}
        status={bid.status}
        saving={saving}
        onReopen={() => void reopenAsDraft()}
      />

      {!isEditable && canRead && bid.status === "draft" ? (
        <div className="rounded-xl border border-ink/[0.08] bg-ink/[0.03] px-4 py-2.5 text-xs text-ink/60">
          View-only — you need <span className="font-mono">{PERMISSIONS.biddingWrite}</span> to edit
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
        <div
          className={`bid-workspace-form space-y-5 pb-8 ${
            showResultsRail ? "" : "mx-auto w-full max-w-[960px]"
          }`}
        >
          {activeTab === "sheet" ? (
            <>
          <BidSheetHeaderSection
            bid={bid}
            isEditable={isEditable}
            entityOptions={entityOptions}
            jobs={lookups.jobs}
            onEstimateNumber={(v) => setBidHeader({ estimateNumber: v })}
            onBidName={(v) => setBidHeader({ bidName: v })}
            onBidDate={(v) => setBidHeader({ bidDate: v })}
            onSubmitDate={(v) => setBidHeader({ submitDate: v || null })}
            onTimeEstimate={(v) => setBidHeader({ timeEstimate: v ?? null })}
            onEntity={(v) => setBidHeader({ ourEntityId: v ? Number(v) : bid.ourEntityId })}
            onJobChange={(jobId, prefill) => void setJobId(jobId, { prefillCompany: prefill })}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void (isEditable ? saveNow() : saveCoverSheet())}
              disabled={saving}
              className="rounded-xl border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditable ? "Save cover sheet + bid" : "Save cover sheet"}
            </button>
          </div>

          <Card>
            <CardHeader title="Team" subtitle="F2 — crew leads fill from the team lookup." />
            <div className="grid gap-4 sm:grid-cols-2">
              <BidFormField label="Team" htmlFor="team">
                <BidSelect
                  id="team"
                  value={(b.teamName as string) ?? ""}
                  onChange={(v) => setBaseBidField("teamName", v)}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "Select team…" },
                    ...lookups.teams.map((t) => ({ value: t.teamName, label: t.teamName })),
                  ]}
                />
              </BidFormField>
              <BidFormField label="Assistant estimator" htmlFor="asst">
                <BidTextInput
                  id="asst"
                  value={(b.assistantEstimator as string) ?? ""}
                  onChange={(v) => setBaseBidField("assistantEstimator", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
            </div>
            {selectedTeam ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] p-4 sm:grid-cols-3 lg:grid-cols-4">
                {(
                  [
                    ["Captain", selectedTeam.captain],
                    ["Bid clerk", selectedTeam.bidClerk],
                    ["Duct 1", selectedTeam.duct1],
                    ["Duct 2", selectedTeam.duct2],
                    ["Hydronic 1", selectedTeam.hydronic1],
                    ["Hydronic 2", selectedTeam.hydronic2],
                    ["Plumbing 1", selectedTeam.plumbing1],
                    ["Plumbing 2", selectedTeam.plumbing2],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                      {label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{val ?? "—"}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Project" subtitle="State, type, and tax — B5 / D5 / G5." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BidFormField label="Project state" htmlFor="state">
                <BidSelect
                  id="state"
                  value={(b.projectState as string) ?? ""}
                  onChange={setProjectState}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "—" },
                    ...lookups.states.map((s) => ({ value: s.stateCode, label: s.stateCode })),
                  ]}
                />
              </BidFormField>
              {typeof b.stateSalesTaxRate === "number" ? (
                <BidFormField label="State sales tax" htmlFor="stax-ro">
                  <p
                    id="stax-ro"
                    className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-2.5 font-mono text-sm text-ink"
                  >
                    {formatPercentDecimal(b.stateSalesTaxRate)}
                  </p>
                </BidFormField>
              ) : null}
              <BidFormField label="Project type" htmlFor="ptype">
                <BidSelect
                  id="ptype"
                  value={(b.projectType as string) ?? ""}
                  onChange={(v) => setBaseBidField("projectType", v)}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "—" },
                    ...lookups.projectTypes.map((p) => ({ value: p.name, label: p.name })),
                  ]}
                />
              </BidFormField>
              <BidFormField label="Building type" htmlFor="btype">
                <BidSelect
                  id="btype"
                  value={(b.buildingType as string) ?? ""}
                  onChange={(v) => setBaseBidField("buildingType", v)}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "—" },
                    ...lookups.buildingTypes.map((p) => ({ value: p.name, label: p.name })),
                  ]}
                />
              </BidFormField>
              <BidFormField label="Preference" htmlFor="pref">
                <BidSelect
                  id="pref"
                  value={(b.preference as string) ?? ""}
                  onChange={(v) => setBaseBidField("preference", v)}
                  disabled={!isEditable}
                  options={[
                    { value: "", label: "—" },
                    ...lookups.preferences.map((p) => ({ value: p.name, label: p.name })),
                  ]}
                />
              </BidFormField>
              <BidFormField label="GSF of building" htmlFor="gsf">
                <BidNumberInput
                  id="gsf"
                  value={b.gsfOfBuilding as number | undefined}
                  onChange={(v) => setBaseBidField("gsfOfBuilding", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BoolSelect
                id="salestax"
                label="Sales tax applicable"
                value={b.salesTaxApplicable as boolean | undefined}
                onChange={(v) => setBaseBidField("salesTaxApplicable", v)}
                disabled={!isEditable}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Wage rate"
              subtitle="B8 wage → F9–F11; composite labor rate is Excel D10 (TOTAL BIDDING LABOR RATE)."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <BidFormField label="Wage rate" htmlFor="wage">
                <BidSelect
                  id="wage"
                  value={wageRateId === "" ? "" : String(wageRateId)}
                  onChange={(v) => {
                    if (v) void selectWageRate(Number(v));
                  }}
                  disabled={!isEditable}
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
                <div className="rounded-xl border border-brand/20 bg-brand/[0.04] p-4 lg:col-span-2">
                  <p className="text-sm font-semibold text-ink">
                    Burdened: {formatMoneyPrecise(burdenedRate.burdenedRate)}/hr
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <ComputedField label="Wage" value={formatMoneyPrecise(burdenedRate.wage)} />
                    <ComputedField
                      label="Burden"
                      value={formatMoneyPrecise(burdenedRate.totalBurden)}
                    />
                    <ComputedField
                      label="Total"
                      value={formatMoneyPrecise(burdenedRate.burdenedRate)}
                      emphasis
                    />
                  </div>
                  {burdenedRate.lines.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[280px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-ink/10 text-ink/45">
                            <th className="py-1.5 pr-2 font-medium">Code</th>
                            <th className="py-1.5 pr-2 font-medium">Line</th>
                            <th className="py-1.5 text-right font-medium">$/hr</th>
                          </tr>
                        </thead>
                        <tbody>
                          {burdenedRate.lines.map((line) => (
                            <tr key={line.code} className="border-b border-ink/[0.05]">
                              <td className="py-1.5 pr-2 font-mono text-ink/60">{line.code}</td>
                              <td className="py-1.5 pr-2 text-ink/70">{line.label}</td>
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BoolSelect
                id="citizen"
                label="Citizen project"
                value={b.citizenProject as boolean | undefined}
                onChange={(v) => setBaseBidField("citizenProject", v)}
                disabled={!isEditable}
              />
              <BoolSelect
                id="apprentice"
                label="Apprenticeable"
                value={b.apprenticeable as boolean | undefined}
                onChange={(v) => setBaseBidField("apprenticeable", v)}
                disabled={!isEditable}
              />
              <BoolSelect
                id="pla"
                label="PLA"
                value={b.pla as boolean | undefined}
                onChange={(v) => setBaseBidField("pla", v)}
                disabled={!isEditable}
              />
              <BoolSelect
                id="ccip"
                label="CCIP covers WC"
                value={b.ccipCoversWc as boolean | undefined}
                onChange={(v) => setBaseBidField("ccipCoversWc", v)}
                disabled={!isEditable}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Schedule & margin" subtitle="Hours, duration, and margin (D4, F4–F5, B12–B13)." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BidFormField label="Margin" htmlFor="margin" hint="Decimal: 0.15 = 15%">
                <BidNumberInput
                  id="margin"
                  value={b.marginPercent as number | undefined}
                  onChange={(v) => setBaseBidField("marginPercent", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Hours / day" htmlFor="hpd">
                <BidNumberInput
                  id="hpd"
                  value={b.hoursPerDay as number | undefined}
                  onChange={(v) => setBaseBidField("hoursPerDay", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Days / week" htmlFor="dpw">
                <BidNumberInput
                  id="dpw"
                  value={b.daysPerWeek as number | undefined}
                  onChange={(v) => setBaseBidField("daysPerWeek", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Duration (months)" htmlFor="dur">
                <BidNumberInput
                  id="dur"
                  value={b.durationMonths as number | undefined}
                  onChange={(v) => setBaseBidField("durationMonths", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Start in # months from bid" htmlFor="startmo">
                <BidNumberInput
                  id="startmo"
                  value={b.startInMonths as number | undefined}
                  onChange={(v) => setBaseBidField("startInMonths", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Backcheck hours" htmlFor="backcheck">
                <BidNumberInput
                  id="backcheck"
                  value={b.backcheckHours as number | undefined}
                  onChange={(v) => setBaseBidField("backcheckHours", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Average # people" htmlFor="avgpeople">
                <BidNumberInput
                  id="avgpeople"
                  value={b.averageNoPeople as number | undefined}
                  onChange={(v) => setBaseBidField("averageNoPeople", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Material escalation / year" htmlFor="esc">
                <BidNumberInput
                  id="esc"
                  value={b.materialEscalationPerYear as number | undefined}
                  onChange={(v) => setBaseBidField("materialEscalationPerYear", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
            </div>
          </Card>

          <Card>
            <CardHeader title="Parking & lifts" subtitle="Parking/lift $/hr shown in results panel." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BoolSelect
                id="parking"
                label="Parking"
                value={b.parking as boolean | undefined}
                onChange={(v) => setBaseBidField("parking", v)}
                disabled={!isEditable}
              />
              <BidFormField label="% people that park" htmlFor="parkpct">
                <BidNumberInput
                  id="parkpct"
                  value={b.parkingPeoplePercent as number | undefined}
                  onChange={(v) => setBaseBidField("parkingPeoplePercent", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Parking cost / day" htmlFor="parkcost">
                <BidNumberInput
                  id="parkcost"
                  value={b.parkingCostPerDay as number | undefined}
                  onChange={(v) => setBaseBidField("parkingCostPerDay", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BoolSelect
                id="lifts"
                label="Lifts needed"
                value={b.liftsNeeded as boolean | undefined}
                onChange={(v) => setBaseBidField("liftsNeeded", v)}
                disabled={!isEditable}
              />
              <BidFormField label="Lift %" htmlFor="liftpct">
                <BidNumberInput
                  id="liftpct"
                  value={b.liftPercentage as number | undefined}
                  onChange={(v) => setBaseBidField("liftPercentage", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
              <BidFormField label="Lift cost / 4 weeks" htmlFor="liftcost">
                <BidNumberInput
                  id="liftcost"
                  value={b.liftCostPer4Weeks as number | undefined}
                  onChange={(v) => setBaseBidField("liftCostPer4Weeks", v)}
                  disabled={!isEditable}
                />
              </BidFormField>
            </div>
          </Card>

          <BidSystemsInputTable
            systems={bid.systems}
            systemsComputed={systemsComputed}
            isEditable={isEditable}
            onUpdateRow={updateSystemRow}
          />
            </>
          ) : null}

          {activeTab === "company" ? (
            <div className="space-y-4">
              {!bid.jobId ? (
                <p className="rounded-xl border border-ink/[0.08] bg-ink/[0.02] px-4 py-3 text-xs text-ink/55">
                  Link a job on the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("sheet")}
                    className="font-semibold text-brand hover:underline"
                  >
                    Bidding sheet
                  </button>{" "}
                  tab to enable &ldquo;Prefill from job&rdquo;.
                </p>
              ) : null}
              <BidSheetCompanyInfoSection
                bid={bid}
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
            </div>
          ) : null}

          {activeTab === "files" ? (
            <BidAttachmentsSection
              attachments={bid.attachments ?? []}
              isEditable={isEditable}
              uploading={saving}
              onUpload={async (file, label) => uploadAttachment(file, label)}
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
          onSave={() => void saveNow()}
          onSubmit={() => void markSubmitted()}
          onVerifyServer={() => void verifyServerCalc()}
        />
      </div>
    </div>
  );
}
