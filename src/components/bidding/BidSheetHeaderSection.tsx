"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidFormField, BidNumberInput, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import type { BidDetail } from "@/lib/bidding/types";
import type { LookupItem } from "@/lib/api/types";

export function BidSheetHeaderSection({
  bid,
  isEditable,
  identityLocked = false,
  entityOptions,
  jobs,
  onEstimateNumber,
  onBidName,
  onBidDate,
  onSubmitDate,
  onTimeEstimate,
  onEntity,
  onJobChange,
}: {
  bid: BidDetail;
  isEditable: boolean;
  /** Proposal output mode — estimate #, bid name, company from Intake (read-only). */
  identityLocked?: boolean;
  entityOptions: { value: string; label: string }[];
  jobs: LookupItem[];
  onEstimateNumber: (v: string) => void;
  onBidName: (v: string) => void;
  onBidDate: (v: string) => void;
  onSubmitDate: (v: string) => void;
  onTimeEstimate: (v: number | undefined) => void;
  onEntity: (v: string) => void;
  onJobChange: (jobId: number | null, prefillCompany: boolean) => void;
}) {
  const bidDate =
    (typeof bid.baseBid?.bidDate === "string"
      ? String(bid.baseBid.bidDate).slice(0, 10)
      : "") ||
    bid.bidDate?.slice(0, 10) ||
    "";
  const submitDate = bid.submitDate?.slice(0, 10) ?? "";
  const identityDisabled = !isEditable || identityLocked;

  const jobOptions = [
    { value: "", label: "No job linked" },
    ...jobs.map((j) => ({
      value: String(j.id),
      label: j.name || `Job #${j.id}`,
    })),
  ];

  const companyLabel =
    entityOptions.find((o) => o.value === String(bid.ourEntityId))?.label ||
    `Entity #${bid.ourEntityId}`;

  return (
    <Card>
      <CardHeader
        title="Cover sheet"
        subtitle={
          identityLocked
            ? "Proposal output — company / estimate # / bid name from Intake. Dates & hours stay editable."
            : "Estimate header — job link, bid date, submit date, and time estimate (hours)."
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BidFormField
          label="Linked job"
          htmlFor="job"
          hint="Change anytime while draft — Trimble / Qty Received follow the new job."
        >
          <BidSelect
            id="job"
            value={bid.jobId ? String(bid.jobId) : ""}
            onChange={(v) => {
              const jobId = v ? Number(v) : null;
              const prefill = Boolean(jobId && jobId !== bid.jobId);
              onJobChange(jobId, prefill);
            }}
            options={jobOptions}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Estimate number" htmlFor="est-num">
          {identityLocked ? (
            <p
              id="est-num"
              className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-2.5 font-mono text-sm text-ink"
            >
              {bid.estimateNumber || "—"}
            </p>
          ) : (
            <BidTextInput
              id="est-num"
              value={bid.estimateNumber}
              onChange={onEstimateNumber}
              disabled={identityDisabled}
            />
          )}
        </BidFormField>
        <BidFormField label="Bid / project name" htmlFor="bid-name">
          {identityLocked ? (
            <p
              id="bid-name"
              className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink"
            >
              {bid.bidName || bid.process?.drawingName || "—"}
            </p>
          ) : (
            <BidTextInput
              id="bid-name"
              value={bid.bidName ?? ""}
              onChange={onBidName}
              disabled={identityDisabled}
            />
          )}
        </BidFormField>
        <BidFormField
          label="Company bidding (us)"
          htmlFor="entity"
          hint={
            identityLocked
              ? "From Intake — ourEntityId / entityRule"
              : "GOEL / GOEL DC / DCB"
          }
        >
          {identityLocked ? (
            <p
              id="entity"
              className="mt-1.5 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink"
            >
              {companyLabel}
            </p>
          ) : (
            <BidSelect
              id="entity"
              value={String(bid.ourEntityId)}
              onChange={onEntity}
              options={entityOptions}
              disabled={identityDisabled}
            />
          )}
        </BidFormField>
        <BidFormField label="Bid date" htmlFor="bid-date">
          <BidTextInput
            id="bid-date"
            type="date"
            value={bidDate}
            onChange={onBidDate}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField
          label="Submit date"
          htmlFor="submit-date"
          hint="Auto-filled when you submit if left empty."
        >
          <BidTextInput
            id="submit-date"
            type="date"
            value={submitDate}
            onChange={onSubmitDate}
            disabled={false}
          />
        </BidFormField>
        <BidFormField label="Time estimate (hrs)" htmlFor="time-est">
          <BidNumberInput
            id="time-est"
            value={bid.timeEstimate ?? undefined}
            onChange={onTimeEstimate}
            disabled={false}
          />
        </BidFormField>
      </div>
    </Card>
  );
}
