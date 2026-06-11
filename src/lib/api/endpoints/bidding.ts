/**
 * Bidding API — BIDDING_FRONTEND_API.md
 */
import { del, get, patch, post } from "../client";
import type {
  BidDetail,
  BidListItem,
  BidStateLookup,
  BidTeam,
  BidWageRate,
  BurdenedRateResult,
  CalcResult,
  CreateBidBody,
  LookupNameItem,
  CalculateBidBody,
  PatchBidBody,
} from "@/lib/bidding/types";

export async function listBids(params?: {
  status?: string;
  entityId?: number;
  search?: string;
}): Promise<BidListItem[]> {
  return get<BidListItem[]>("/bids", {
    status: params?.status,
    entityId: params?.entityId,
    search: params?.search,
  });
}

export async function getBid(id: string): Promise<BidDetail> {
  return get<BidDetail>(`/bids/${id}`);
}

export async function createBid(body: CreateBidBody): Promise<BidDetail> {
  return post<BidDetail>("/bids", body);
}

export async function patchBid(id: string, body: PatchBidBody): Promise<BidDetail> {
  return patch<BidDetail>(`/bids/${id}`, body);
}

export async function deleteBid(id: string): Promise<void> {
  await del(`/bids/${id}`);
}

/** Deprecated for normal saves — echoes stored client snapshot unless `forceServerCalc`. */
export async function calculateBid(
  id: string,
  body: CalculateBidBody = {}
): Promise<CalcResult> {
  return post<CalcResult>(`/bids/${id}/calculate`, body);
}

// --- Lookups ---

export async function getBiddingTeams(): Promise<BidTeam[]> {
  return get<BidTeam[]>("/lookups/bidding/teams");
}

export async function getBiddingWageRates(): Promise<BidWageRate[]> {
  return get<BidWageRate[]>("/lookups/bidding/wage-rates");
}

export async function getBiddingWageBurdenedRate(id: number): Promise<BurdenedRateResult> {
  return get<BurdenedRateResult>(`/lookups/bidding/wage-rates/${id}/burdened-rate`);
}

export async function getBiddingStates(): Promise<BidStateLookup[]> {
  return get<BidStateLookup[]>("/lookups/bidding/states");
}

export async function getBiddingProjectTypes(): Promise<LookupNameItem[]> {
  return get<LookupNameItem[]>("/lookups/bidding/project-types");
}

export async function getBiddingBuildingTypes(): Promise<LookupNameItem[]> {
  return get<LookupNameItem[]>("/lookups/bidding/building-types");
}

export async function getBiddingPreferences(): Promise<LookupNameItem[]> {
  return get<LookupNameItem[]>("/lookups/bidding/preferences");
}
