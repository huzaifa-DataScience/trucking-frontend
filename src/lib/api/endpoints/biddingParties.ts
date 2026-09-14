/**
 * Intake party directory — FRONTEND_INTAKE.md (select existing or type new).
 * Backend: GET /lookups/bidding/parties
 */
import { get } from "../client";

export type BidPartyRole =
  | "owner"
  | "architect"
  | "mechanical"
  | "invite_contact";

export interface BidPartyLookup {
  id: number | string;
  /** Person / contact display name */
  name: string;
  company?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: BidPartyRole | string | null;
  /** Optional CRM flags — show in address book Name column */
  status?: string | null;
  inactive?: boolean | null;
  doNotContact?: boolean | null;
}

function asPartyArray(raw: unknown): BidPartyLookup[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.parties)) list = o.parties;
  }
  const out: BidPartyLookup[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = String(r.name ?? r.companyName ?? r.label ?? "").trim();
    if (!name) continue;
    out.push({
      id: (r.id as number | string) ?? name,
      name,
      company:
        r.company != null
          ? String(r.company)
          : r.companyName != null
            ? String(r.companyName)
            : null,
      contactName:
        r.contactName != null ? String(r.contactName) : null,
      email: r.email != null ? String(r.email) : null,
      phone: r.phone != null ? String(r.phone) : null,
      role: (r.role as BidPartyRole) ?? null,
      status: r.status != null ? String(r.status) : null,
      inactive:
        typeof r.inactive === "boolean"
          ? r.inactive
          : typeof r.isInactive === "boolean"
            ? r.isInactive
            : null,
      doNotContact:
        typeof r.doNotContact === "boolean"
          ? r.doNotContact
          : typeof r.do_not_contact === "boolean"
            ? r.do_not_contact
            : null,
    });
  }
  return out;
}

/**
 * Known Owner / Architect / Mechanical / invite contacts.
 * 404 / missing route → [] so FE still allows free-text new entry.
 *
 * Optional page/pageSize: when BE returns `{ items, total }`, server paging
 * is used; plain arrays still work (FE pages client-side in the modal).
 */
export async function getBiddingParties(params?: {
  role?: BidPartyRole | string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<BidPartyLookup[]> {
  try {
    const raw = await get<unknown>("/lookups/bidding/parties", {
      role: params?.role,
      q: params?.q,
      page: params?.page,
      pageSize: params?.pageSize,
    });
    return asPartyArray(raw);
  } catch {
    return [];
  }
}
