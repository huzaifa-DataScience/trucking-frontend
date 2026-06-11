import { calculateBaseBid, type EngineLookups } from "./engine";
import type { BidComputed, BidDetail } from "./types";

/** Bump when client formula logic changes (backend stores this on the snapshot). */
export const CLIENT_ENGINE_VERSION = "1.2.0";

export function buildLookupsFromBiddingHook(
  states: { stateCode: string; salesTaxRate: number }[]
): EngineLookups {
  return {
    salesTaxRateByState: Object.fromEntries(
      states.map((s) => [s.stateCode, s.salesTaxRate])
    ),
  };
}

/** Run Base Bid engine and shape payload for PATCH /bids/:id. */
export function buildClientComputedSnapshot(
  bid: BidDetail,
  lookups?: EngineLookups
): BidComputed {
  const result = calculateBaseBid(bid, lookups);
  return {
    ...result.computed,
    engineVersion: CLIENT_ENGINE_VERSION,
    calculatedAt: new Date().toISOString(),
    laborBuildUp: result.laborBuildUp,
    systemsComputed: result.systemsComputed,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/** Apply engine result to bid for immediate UI update (before save). */
export function applyEngineToBid(
  bid: BidDetail,
  lookups?: EngineLookups
): BidDetail {
  return {
    ...bid,
    computed: buildClientComputedSnapshot(bid, lookups),
  };
}
