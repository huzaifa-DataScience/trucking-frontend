"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import type { BidDetail } from "@/lib/bidding/types";

export function BidSheetHeaderSection({
  bid,
  isEditable,
  entityOptions,
  onEstimateNumber,
  onBidName,
  onBidDate,
  onEntity,
}: {
  bid: BidDetail;
  isEditable: boolean;
  entityOptions: { value: string; label: string }[];
  onEstimateNumber: (v: string) => void;
  onBidName: (v: string) => void;
  onBidDate: (v: string) => void;
  onEntity: (v: string) => void;
}) {
  const bidDate =
    bid.bidDate?.slice(0, 10) ??
    (typeof bid.baseBid?.bidDate === "string" ? String(bid.baseBid.bidDate).slice(0, 10) : "");

  return (
    <Card>
      <CardHeader title="Estimate header" subtitle="B1 / D1 / B2 / D2 — saved with the bid record." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <BidFormField label="Bid date" htmlFor="bid-date">
          <BidTextInput
            id="bid-date"
            type="date"
            value={bidDate}
            onChange={onBidDate}
            disabled={!isEditable}
          />
        </BidFormField>
        <BidFormField label="Company bidding" htmlFor="entity">
          <BidSelect
            id="entity"
            value={String(bid.ourEntityId)}
            onChange={onEntity}
            options={entityOptions}
            disabled={!isEditable}
          />
        </BidFormField>
      </div>
    </Card>
  );
}
