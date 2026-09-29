"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { BidFormField, BidTextInput, BidNumberInput, BidSelect } from "@/components/bidding/BidFormField";
import type { ProcessAdditionalDetails, ProcessSalesActivities } from "@/lib/bidding/process-types";

const TEXT_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["wbdUsername", "WBD username"],
  ["awl1Username", "AWL 1 username"],
  ["awl2Username", "AWL 2 username"],
  ["awl3Username", "AWL 3 username"],
];

const PASSWORD_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["wbdPassword", "WBD password"],
  ["awl1Password", "AWL 1 password"],
  ["awl2Password", "AWL 2 password"],
  ["awl3Password", "AWL 3 password"],
];

const NUMBER_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
  ["cashExpense", "Cash expense"],
  ["grossSqFootage", "Gross sq footage"],
  ["costPerEstimate", "Cost per estimate"],
  ["bidBondAmountRequested", "Bid bond amount requested"],
];

const DATE_FIELDS: [keyof ProcessAdditionalDetails, string][] = [
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

const SUB_BUILDING_TYPE_OPTIONS = [
  { value: "other", label: "Other" },
  { value: "parochial", label: "Parochial" },
  { value: "private_college", label: "Private - College" },
  { value: "public_college", label: "Public - College" },
  { value: "public_elementary_school", label: "Public - Elementary School" },
  { value: "public_high_school", label: "Public - High School" },
  { value: "public_middle_junior_high_school", label: "Public - Middle/Junior High School" },
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
  additionalSectionId,
  salesSectionId,
  sectionScrollClassName,
}: {
  additionalDetails: ProcessAdditionalDetails;
  salesActivities: ProcessSalesActivities;
  onAdditionalDetailsChange: (next: ProcessAdditionalDetails) => void;
  onSalesActivitiesChange: (next: ProcessSalesActivities) => void;
  disabled?: boolean;
  additionalSectionId?: string;
  salesSectionId?: string;
  sectionScrollClassName?: string;
}) {
  const setAd = <K extends keyof ProcessAdditionalDetails>(key: K, value: ProcessAdditionalDetails[K]) =>
    onAdditionalDetailsChange({ ...additionalDetails, [key]: value });

  const setSa = <K extends keyof ProcessSalesActivities>(key: K, value: ProcessSalesActivities[K]) =>
    onSalesActivitiesChange({ ...salesActivities, [key]: value });

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

  const cardClass = `ui-shadow-none border-ink/[0.08] p-4 ${sectionScrollClassName ?? ""}`.trim();

  return (
    <>
      <Card id={additionalSectionId} className={cardClass}>
        <CardHeader
          title="Additional details"
          subtitle="Fields that are not already on Intake, Assignment, Setup, Proposal, or Outcome."
        />
        <div className="grid gap-2.5 lg:grid-cols-4">
          {selectField("subBuildingType", "Sub building type", SUB_BUILDING_TYPE_OPTIONS)}
          {selectField("source", "Source", LEAD_SOURCE_OPTIONS)}

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

          {selectField("bidBondStatus", "Bid bond status", BID_BOND_STATUS_OPTIONS)}

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
        </div>
      </Card>

      <Card id={salesSectionId} className={cardClass}>
        <CardHeader
          title="Sales activities"
          subtitle="Pipeline dates that are not already on Follow Up, Technical, or Job Start/End."
        />
        <div className="grid gap-2.5 lg:grid-cols-4">
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
