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

export interface BidPartiesPage {
  items: BidPartyLookup[];
  total: number;
  page: number;
  pageSize: number;
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

function asPartiesPage(
  raw: unknown,
  page: number,
  pageSize: number
): BidPartiesPage {
  const items = asPartyArray(raw);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const total =
      typeof o.total === "number"
        ? o.total
        : typeof o.count === "number"
          ? o.count
          : items.length;
    return {
      items,
      total,
      page: typeof o.page === "number" ? o.page : page,
      pageSize: typeof o.pageSize === "number" ? o.pageSize : pageSize,
    };
  }
  return { items, total: items.length, page, pageSize };
}

/**
 * Known Owner / Architect / Mechanical / invite contacts.
 * 404 / missing route → empty page so FE still allows free-text new entry.
 */
export async function getBiddingPartiesPage(params?: {
  role?: BidPartyRole | string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<BidPartiesPage> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  try {
    const raw = await get<unknown>("/lookups/bidding/parties", {
      role: params?.role,
      q: params?.q,
      page,
      pageSize,
    });
    return asPartiesPage(raw, page, pageSize);
  } catch {
    return { items: [], total: 0, page, pageSize };
  }
}

/** Convenience — items only (typeahead). */
export async function getBiddingParties(params?: {
  role?: BidPartyRole | string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<BidPartyLookup[]> {
  const page = await getBiddingPartiesPage(params);
  return page.items;
}
