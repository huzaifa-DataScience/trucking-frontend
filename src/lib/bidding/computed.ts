import type { BidComputed, BidDetail, BidInsights } from "./types";

export function num(computed: BidComputed, key: string, fallback = 0): number {
  const v = computed[key];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

export function insightsFromBid(
  bid: BidDetail,
  opts?: { isRecalculating?: boolean }
): BidInsights {
  const c = bid.computed ?? {};
  return {
    mikeEstimate: num(c, "baseBid.mikeEstimate"),
    pjEstimate: num(c, "baseBid.pjEstimate"),
    costPerHourMike: num(c, "baseBid.costPerHourMike"),
    costPerHourPj: num(c, "baseBid.costPerHourPj"),
    marginPercent:
      num(c, "baseBid.marginPercent") || (bid.baseBid?.marginPercent ?? 0),
    completionPercent: Math.round(num(c, "insights.completionPercent", 0)),
    isRecalculating: opts?.isRecalculating,
  };
}

export function mergeComputed(bid: BidDetail, computed: BidComputed): BidDetail {
  return { ...bid, computed: { ...bid.computed, ...computed } };
}
