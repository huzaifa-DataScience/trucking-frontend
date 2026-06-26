"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidFormField, BidNumberInput, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import type { BidDetail } from "@/lib/bidding/types";
import type { LookupItem } from "@/lib/api/types";

export function BidSheetHeaderSection({
  bid,
  isEditable,
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
    bid.bidDate?.slice(0, 10) ??
    (typeof bid.baseBid?.bidDate === "string" ? String(bid.baseBid.bidDate).slice(0, 10) : "");
  const submitDate = bid.submitDate?.slice(0, 10) ?? "";

  const jobOptions = [
    { value: "", label: "No job linked" },
    ...jobs.map((j) => ({
      value: String(j.id),
      label: j.name || `Job #${j.id}`,
    })),
  ];

  return (
    <Card>
      <CardHeader
        title="Cover sheet"
        subtitle="Estimate header — job link, bid date, submit date, and time estimate (hours)."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BidFormField
          label="Linked job"
          htmlFor="job"
          hint="Optional — links Ref_Jobs for company prefill."
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
          <BidTextInput
            id="est-num"
            value={bid.estimateNumber}
            onChange={onEstimateNumber}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Bid / project name" htmlFor="bid-name">
          <BidTextInput
            id="bid-name"
            value={bid.bidName ?? ""}
            onChange={onBidName}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Company bidding (us)" htmlFor="entity" hint="GOEL / GOEL DC / DCB">
          <BidSelect
            id="entity"
            value={String(bid.ourEntityId)}
            onChange={onEntity}
            options={entityOptions}
            disabled={!isEditable}
          />
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
