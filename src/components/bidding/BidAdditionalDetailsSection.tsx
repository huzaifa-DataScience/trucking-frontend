"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { BidFormField, BidTextInput, BidNumberInput, BidSelect } from "@/components/bidding/BidFormField";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { ProcessAdditionalDetails, ProcessSalesActivities } from "@/lib/bidding/process-types";

const nameInputClass =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand focus:ring-2 focus:ring-brand/20";

const TAKEOFF_PERSON_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["takeOffPerson", "Take off person"],
  ["takeOffPerson2", "Take off person 2"],
  ["takeOffPerson3", "Take off person 3"],
];

/** Free-text name field with a suggestion dropdown from the estimator/crew roster. */
function NameTypeahead({
  id,
  value,
  onChange,
  roster,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  roster: string[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = value.trim().toLowerCase();
  const hits = !q ? roster : roster.filter((n) => n.toLowerCase().includes(q));

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        autoComplete="off"
        className={nameInputClass}
      />
      {open && !disabled && hits.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-ink/[0.08] bg-white py-1 shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]">
          {hits.slice(0, 20).map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-brand/[0.06]"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const TEXT_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["bidNumber", "Bid number"],
  ["winningCompetitor", "Winning competitor"],
  ["mikeEstimateRef", "MIKE est. #"],
  ["websiteForBiddingDocs", "Website for bidding docs"],
  ["altWebLocation1", "Alternate web location 1"],
  ["altWebLocation2", "Alternate web location 2"],
  ["altWebLocation3", "Alternate web location 3"],
  ["wbdUsername", "WBD username"],
  ["awl1Username", "AWL 1 username"],
  ["awl2Username", "AWL 2 username"],
  ["awl3Username", "AWL 3 username"],
  ["projectNumberIfAwarded", "Project # (if awarded)"],
  ["engineerProjectNumber", "Engineer project #"],
];

const PASSWORD_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["wbdPassword", "WBD password"],
  ["awl1Password", "AWL 1 password"],
  ["awl2Password", "AWL 2 password"],
  ["awl3Password", "AWL 3 password"],
];

const NUMBER_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["wageRateAmount", "Wage rate amount"],
  ["grossSqFootage", "Gross sq footage"],
  ["fringe", "Fringe"],
  ["costPerEstimate", "Cost per estimate"],
  ["bidBondAmountRequested", "Bid bond amount requested"],
];

const DATE_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["preBidDate", "Pre bid"],
  ["estimatorBidDate", "Estimator bid date"],
  ["contractDate", "Contract date"],
  ["loginDate", "Login date"],
  ["deadDate", "Dead date"],
];

const SALES_ACTIVITY_DATE_FIELDS: [keyof ProcessSalesActivities, string][] = [
  ["initialContact", "Initial contact"],
  ["siteVisit", "Site visit"],
  ["bidDrafted", "Bid drafted"],
  ["bidDelivered", "Bid delivered"],
  ["frontEndDocs", "Front end docs"],
  ["heatTracingSubPricing", "Heat tracing sub pricing to be included"],
  ["prequalificationPackage", "Prequalification package"],
  ["mandatoryPreBid", "Mandatory pre-bid"],
];

const SALES_STATUS_OPTIONS = [
  { value: "evaluate_whether_to_bid", label: "Evaluate whether to bid" },
  { value: "not_pursued", label: "Not pursued" },
  { value: "bid_in_process", label: "Bid in process" },
  { value: "no_bid", label: "No Bid" },
  { value: "prospective_future_bid", label: "Prospective Future bid" },
  { value: "post_bid", label: "Post Bid" },
  { value: "rebid_budget", label: "Rebid- budget" },
  { value: "long_shot", label: "Long Shot" },
  { value: "in_the_running_to_win", label: "In the Running to win" },
  { value: "lost", label: "Lost" },
  { value: "won", label: "Won" },
];

const SUB_BUILDING_TYPE_OPTIONS = [
  { value: "other", label: "Other" },
  { value: "parochial", label: "Parochial" },
  { value: "private_college", label: "Private - College" },
  { value: "public_college", label: "Public - College" },
  { value: "public_elementary_school", label: "Public - Elementary School" },
  { value: "public_high_school", label: "Public - High School" },
  { value: "public_middle_junior_high_school", label: "Public - Middle/Junior High School" },
];

const TRADE_BID_TYPE_OPTIONS = [
  { value: "insulation_sub", label: "Insulation - Sub" },
  { value: "demolition_sub", label: "Demolition - Sub" },
  { value: "general_construction", label: "General Construction" },
  { value: "demolition_prime", label: "Demolition - Prime" },
  { value: "insulation_prime", label: "Insulation - Prime" },
  { value: "concrete", label: "Concrete" },
  { value: "masonry", label: "Masonry" },
  { value: "wastewater", label: "Wastewater" },
  { value: "pass_thru", label: "Pass-Thru" },
  { value: "other_services", label: "Other Services" },
];

const LEAD_SOURCE_OPTIONS = [
  { value: "dodge_data_analytics", label: "Dodge Data & Analytics" },
  { value: "the_blue_book", label: "The Blue Book" },
  { value: "smartsheet", label: "Smartsheet" },
  { value: "smartbid", label: "SmartBid.com" },
  { value: "procore", label: "ProCore" },
  { value: "planhub", label: "PlanHub" },
  { value: "pipeline", label: "PipeLine" },
  { value: "pantera", label: "Pantera" },
  { value: "isqft", label: "iSqFt" },
  { value: "government_construction_bids", label: "Government Construction Bids" },
  { value: "email_invites_only", label: "Email Invites Only" },
  { value: "e_builder", label: "e-Builder" },
  { value: "bid_central_canadian_construction", label: "Bid Central - Canadian Construction" },
  { value: "construction_bid_source", label: "Construction Bid Source" },
  { value: "coconstruct", label: "CoConstruct" },
  { value: "cmd_group_construction_market", label: "CMD Group - Construction Market" },
  { value: "building_radar", label: "Building Radar" },
  { value: "buildingconnected", label: "BuildingConnected" },
  { value: "buildertrend", label: "Buildertrend" },
  { value: "box_net", label: "Box.net" },
  { value: "bonfire", label: "Bonfire" },
  { value: "bidtracer", label: "BidTracer" },
  { value: "bidclerk", label: "BidClerk" },
];

const OCIP_CCIP_OPTIONS = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "yes_gl_workmans_comp", label: "Yes - GL & Workman Comp" },
  { value: "yes_gl_only", label: "Yes - GL Only" },
];

const WAGE_RATE_CATEGORY_OPTIONS = [
  { value: "wage_rate_pw_dba", label: "Wage Rate (PW/DBA)" },
  { value: "non_wage_scale", label: "Non-Wage Scale" },
];

const BID_BOND_STATUS_OPTIONS = [
  { value: "not_ordered", label: "Not Ordered - Estimator needs to do" },
  { value: "ordered_not_received", label: "Ordered - from Surety not received" },
  { value: "received", label: "Received" },
];

export function BidAdditionalDetailsSection({
  additionalDetails,
  salesActivities,
  onAdditionalDetailsChange,
  onSalesActivitiesChange,
  disabled,
}: {
  additionalDetails: ProcessAdditionalDetails;
  salesActivities: ProcessSalesActivities;
  onAdditionalDetailsChange: (next: ProcessAdditionalDetails) => void;
  onSalesActivitiesChange: (next: ProcessSalesActivities) => void;
  disabled?: boolean;
}) {
  const setAd = <K extends keyof ProcessAdditionalDetails>(key: K, value: ProcessAdditionalDetails[K]) =>
    onAdditionalDetailsChange({ ...additionalDetails, [key]: value });

  const setSa = <K extends keyof ProcessSalesActivities>(key: K, value: ProcessSalesActivities[K]) =>
    onSalesActivitiesChange({ ...salesActivities, [key]: value });

  const [estimatorRoster, setEstimatorRoster] = useState<string[]>([]);
  useEffect(() => {
    void biddingApi
      .getBiddingContacts()
      .then((contacts) => {
        const names = [...new Set(contacts.map((c) => c.name).filter((n): n is string => Boolean(n?.trim())))];
        names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setEstimatorRoster(names);
      })
      .catch(() => setEstimatorRoster([]));
  }, []);

  const selectField = (
    key: keyof ProcessAdditionalDetails,
    label: string,
    options: { value: string; label: string }[]
  ) => (
    <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
      <BidSelect
        id={`ad-${key}`}
        value={(additionalDetails[key] as string | null) ?? ""}
        onChange={(v) => setAd(key, (v || null) as ProcessAdditionalDetails[typeof key])}
        disabled={disabled}
        options={[{ value: "", label: "—" }, ...options]}
      />
    </BidFormField>
  );

  return (
    <>
      <Card>
        <CardHeader
          title="Additional details"
          subtitle="FollowupCRM-parity fields — Status, Bid Bond, Wage Rate, Source, and reporting details not covered elsewhere. Office is the bid's own Company (GOEL / GOEL DC / DCB)."
        />
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {selectField("salesStatus", "Status", SALES_STATUS_OPTIONS)}
          {selectField("subBuildingType", "Sub building type", SUB_BUILDING_TYPE_OPTIONS)}
          {selectField("source", "Source", LEAD_SOURCE_OPTIONS)}
          {selectField("tradeBidType", "Bid type", TRADE_BID_TYPE_OPTIONS)}

          {TEXT_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
              <BidTextInput
                id={`ad-${key}`}
                value={(additionalDetails[key] as string | null) ?? ""}
                onChange={(v) => setAd(key, (v || null) as ProcessAdditionalDetails[typeof key])}
                disabled={disabled}
                autoComplete="off"
              />
            </BidFormField>
          ))}

          {TAKEOFF_PERSON_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
              <NameTypeahead
                id={`ad-${key}`}
                value={(additionalDetails[key] as string | null) ?? ""}
                onChange={(v) => setAd(key, (v || null) as ProcessAdditionalDetails[typeof key])}
                roster={estimatorRoster}
                disabled={disabled}
              />
            </BidFormField>
          ))}

          {PASSWORD_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
              <BidTextInput
                id={`ad-${key}`}
                type="password"
                value={(additionalDetails[key] as string | null) ?? ""}
                onChange={(v) => setAd(key, (v || null) as ProcessAdditionalDetails[typeof key])}
                disabled={disabled}
                autoComplete="new-password"
              />
            </BidFormField>
          ))}

          {NUMBER_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
              <BidNumberInput
                id={`ad-${key}`}
                value={(additionalDetails[key] as number | null) ?? undefined}
                onChange={(v) => setAd(key, (v ?? null) as ProcessAdditionalDetails[typeof key])}
                disabled={disabled}
              />
            </BidFormField>
          ))}

          {selectField("wageRateCategory", "Wage rate category", WAGE_RATE_CATEGORY_OPTIONS)}
          {selectField("bidBondStatus", "Bid bond status", BID_BOND_STATUS_OPTIONS)}
          {selectField("ocipCcipStatus", "OCIP/CCIP", OCIP_CCIP_OPTIONS)}

          <BidFormField label="Budget bid" htmlFor="ad-budgetBid">
            <BidSelect
              id="ad-budgetBid"
              value={additionalDetails.budgetBid ?? ""}
              onChange={(v) => setAd("budgetBid", (v || null) as ProcessAdditionalDetails["budgetBid"])}
              disabled={disabled}
              options={[
                { value: "", label: "—" },
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
          </BidFormField>

          <BidFormField label="US citizen only" htmlFor="ad-usCitizenOnly">
            <BidSelect
              id="ad-usCitizenOnly"
              value={additionalDetails.usCitizenOnly == null ? "" : additionalDetails.usCitizenOnly ? "yes" : "no"}
              onChange={(v) => setAd("usCitizenOnly", v === "" ? null : v === "yes")}
              disabled={disabled}
              options={[
                { value: "", label: "—" },
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </BidFormField>

          <BidFormField label="Rebid" htmlFor="ad-rebid">
            <BidSelect
              id="ad-rebid"
              value={additionalDetails.rebid == null ? "" : additionalDetails.rebid ? "yes" : "no"}
              onChange={(v) => setAd("rebid", v === "" ? null : v === "yes")}
              disabled={disabled}
              options={[
                { value: "", label: "—" },
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </BidFormField>

          {DATE_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`ad-${key}`}>
              <DatePicker
                ariaLabel={label}
                value={(additionalDetails[key] as string | null) ?? ""}
                onChange={(v) => setAd(key, (v || null) as ProcessAdditionalDetails[typeof key])}
                disabled={disabled}
                className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
            </BidFormField>
          ))}

          <div className="col-span-full max-w-2xl">
            <BidFormField label="Comments" htmlFor="ad-comments">
              <BidTextInput
                id="ad-comments"
                value={additionalDetails.comments ?? ""}
                onChange={(v) => setAd("comments", v || null)}
                disabled={disabled}
              />
            </BidFormField>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Sales activities"
          subtitle="Follow Up, Technical, and Job Start/End live with their existing sections above — these are the remaining pipeline dates."
        />
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {SALES_ACTIVITY_DATE_FIELDS.map(([key, label]) => (
            <BidFormField key={key} label={label} htmlFor={`sa-${key}`}>
              <DatePicker
                ariaLabel={label}
                value={(salesActivities[key] as string | null) ?? ""}
                onChange={(v) => setSa(key, (v || null) as ProcessSalesActivities[typeof key])}
                disabled={disabled}
                className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
            </BidFormField>
          ))}
        </div>
      </Card>
    </>
  );
}
