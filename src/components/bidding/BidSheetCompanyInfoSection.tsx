"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidFormField, BidTextInput, BidSelect } from "@/components/bidding/BidFormField";
import type { BidCompanyInfo, BidDetail } from "@/lib/bidding/types";

export function BidSheetCompanyInfoSection({
  bid,
  isEditable,
  onFieldChange,
  onPrefillFromJob,
  prefillLoading,
}: {
  bid: BidDetail;
  isEditable: boolean;
  onFieldChange: (key: keyof BidCompanyInfo, value: string) => void;
  onPrefillFromJob: () => void;
  prefillLoading?: boolean;
}) {
  const info = bid.companyInfo ?? {};

  return (
    <Card>
      <CardHeader
        title="Client / GC"
        subtitle="Who this bid is for — separate from your company (GOEL / GOEL DC / DCB)."
        action={
          bid.jobId ? (
            <button
              type="button"
              onClick={() => void onPrefillFromJob()}
              disabled={!isEditable || prefillLoading}
              className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-50"
            >
              {prefillLoading ? "Loading…" : "Prefill from job"}
            </button>
          ) : null
        }
      />
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <BidFormField label="Company name" htmlFor="ci-name">
          <BidTextInput
            id="ci-name"
            value={info.companyName ?? ""}
            onChange={(v) => onFieldChange("companyName", v)}
            disabled={!isEditable}
            placeholder="ABC Mechanical"
          />
        </BidFormField>
        <BidFormField label="Contact name" htmlFor="ci-contact">
          <BidTextInput
            id="ci-contact"
            value={info.contactName ?? ""}
            onChange={(v) => onFieldChange("contactName", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <div className="col-span-full max-w-2xl">
          <BidFormField label="Address" htmlFor="ci-address">
            <BidTextInput
              id="ci-address"
              value={info.address ?? ""}
              onChange={(v) => onFieldChange("address", v)}
              disabled={!isEditable}
            />
          </BidFormField>
        </div>
        <BidFormField label="City" htmlFor="ci-city">
          <BidTextInput
            id="ci-city"
            value={info.city ?? ""}
            onChange={(v) => onFieldChange("city", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <div className="grid grid-cols-2 gap-4">
          <BidFormField label="State" htmlFor="ci-state">
            <BidTextInput
              id="ci-state"
              value={info.state ?? ""}
              onChange={(v) => onFieldChange("state", v)}
              disabled={!isEditable}
            />
          </BidFormField>
          <BidFormField label="ZIP" htmlFor="ci-zip">
            <BidTextInput
              id="ci-zip"
              value={info.zip ?? ""}
              onChange={(v) => onFieldChange("zip", v)}
              disabled={!isEditable}
            />
          </BidFormField>
        </div>
        <BidFormField label="Contact email" htmlFor="ci-email">
          <BidTextInput
            id="ci-email"
            type="email"
            value={info.contactEmail ?? ""}
            onChange={(v) => onFieldChange("contactEmail", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Contact phone" htmlFor="ci-phone">
          <BidTextInput
            id="ci-phone"
            value={info.contactPhone ?? ""}
            onChange={(v) => onFieldChange("contactPhone", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Contact cell" htmlFor="ci-cell">
          <BidTextInput
            id="ci-cell"
            value={info.contactCell ?? ""}
            onChange={(v) => onFieldChange("contactCell", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Contact fax" htmlFor="ci-fax">
          <BidTextInput
            id="ci-fax"
            value={info.contactFax ?? ""}
            onChange={(v) => onFieldChange("contactFax", v)}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Parent / Child" htmlFor="ci-parent-child">
          <BidSelect
            id="ci-parent-child"
            value={info.parentChild ?? ""}
            onChange={(v) => onFieldChange("parentChild", v)}
            disabled={!isEditable}
            options={[
              { value: "", label: "—" },
              { value: "parents_only", label: "Parents Only" },
              { value: "children_only", label: "Children Only" },
              { value: "both", label: "Both" },
              { value: "exclude", label: "Exclude" },
            ]}
          />
        </BidFormField>
        <div className="col-span-full max-w-2xl">
          <BidFormField label="Notes" htmlFor="ci-notes">
            <BidTextInput
              id="ci-notes"
              value={info.notes ?? ""}
              onChange={(v) => onFieldChange("notes", v)}
              disabled={!isEditable}
              placeholder="GC on this job, special terms…"
            />
          </BidFormField>
        </div>
      </div>
    </Card>
  );
}
