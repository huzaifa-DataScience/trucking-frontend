import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type { BidStatus } from "@/lib/bidding/types";

const TONES: Record<BidStatus, StatusTone> = {
  draft: "warning",
  submitted: "info",
  archived: "neutral",
};

const LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  archived: "Archived",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return <StatusPill tone={TONES[status]} label={LABELS[status]} />;
}
