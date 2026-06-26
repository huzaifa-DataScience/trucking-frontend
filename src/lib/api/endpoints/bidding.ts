/**
 * Bidding API — docs/BIDDING_FRONTEND_API.md
 */
import { del, get, getBlob, patch, post } from "../client";
import type {
  BidAttachment,
  BidCompanyInfo,
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
  CreatePayrollBurdenBody,
  CreateWageRateBody,
  PayrollBurdenItem,
  UpdatePayrollBurdenBody,
  UpdateWageRateBody,
} from "@/lib/bidding/types";
import { getApiUrl } from "../config";
import { getAccessToken } from "@/lib/auth/store";

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

export async function createBiddingWageRate(body: CreateWageRateBody): Promise<BidWageRate> {
  return post<BidWageRate>("/lookups/bidding/wage-rates", body);
}

export async function updateBiddingWageRate(
  id: number,
  body: UpdateWageRateBody
): Promise<BidWageRate> {
  return patch<BidWageRate>(`/lookups/bidding/wage-rates/${id}`, body);
}

export async function deleteBiddingWageRate(id: number): Promise<void> {
  await del(`/lookups/bidding/wage-rates/${id}`);
}

export async function getBiddingPayrollBurden(): Promise<PayrollBurdenItem[]> {
  return get<PayrollBurdenItem[]>("/lookups/bidding/payroll-burden");
}

export async function createBiddingPayrollBurden(
  body: CreatePayrollBurdenBody
): Promise<PayrollBurdenItem> {
  return post<PayrollBurdenItem>("/lookups/bidding/payroll-burden", body);
}

export async function updateBiddingPayrollBurden(
  id: number,
  body: UpdatePayrollBurdenBody
): Promise<PayrollBurdenItem> {
  return patch<PayrollBurdenItem>(`/lookups/bidding/payroll-burden/${id}`, body);
}

export async function deleteBiddingPayrollBurden(id: number): Promise<void> {
  await del(`/lookups/bidding/payroll-burden/${id}`);
}

export async function createBiddingTeam(body: { teamName: string }): Promise<BidTeam> {
  return post<BidTeam>("/lookups/bidding/teams", body);
}

export async function deleteBiddingTeam(id: number): Promise<void> {
  await del(`/lookups/bidding/teams/${id}`);
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

/** Suggested client/GC fields from Ref_Jobs (does not save). */
export async function getCompanyInfoPrefillFromJob(
  jobId: number
): Promise<BidCompanyInfo> {
  return get<BidCompanyInfo>(`/bids/prefill/company-from-job/${jobId}`);
}

/** Fetch attachment bytes for preview (JWT required — cannot use raw img src). */
export async function fetchBidAttachmentBlob(downloadPath: string): Promise<Blob> {
  return getBlob(downloadPath);
}

/** Upload image/PDF — draft bids only. Field name must be `file`. */
export async function uploadBidAttachment(
  bidId: string,
  file: File,
  label?: string
): Promise<BidAttachment> {
  const url = getApiUrl(`/bids/${bidId}/attachments`);
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);
  if (label?.trim()) form.append("label", label.trim());

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* use raw text */
    }
    throw new Error(message);
  }

  return response.json() as Promise<BidAttachment>;
}

export async function deleteBidAttachment(
  bidId: string,
  attachmentId: number
): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`/bids/${bidId}/attachments/${attachmentId}`);
}
