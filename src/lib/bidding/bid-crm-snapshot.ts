import type { BidCompanyInfo, BidDetail } from "@/lib/bidding/types";
import type {
  ProcessCompetitor,
  ProcessFollowUpCompany,
  ProcessGcOrMech,
  ProcessInviteContact,
  ProcessParty,
} from "@/lib/bidding/process-types";
import { formatMoney } from "@/lib/bidding/format";
import { newId } from "@/lib/bidding/newId";

export type CrmContact = {
  label: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type BidCrmSnapshot = {
  estimateNumber: string;
  bidName: string;
  workType?: string | null;
  location: string | null;
  bidDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  clientCompany: BidCompanyInfo | null;
  owner: ProcessParty | null;
  architect: ProcessParty | null;
  mechanicalEngineer: ProcessParty | null;
  generalContractors: ProcessGcOrMech[];
  mechanicals: ProcessGcOrMech[];
  invitations: { company?: string | null; contact?: ProcessInviteContact | null }[];
  submittedTo: CrmContact[];
  keyContacts: CrmContact[];
  teamCaptain: string | null;
  assistantEstimator: string | null;
  teamId: number | null;
  competitors: ProcessCompetitor[];
  followUpWhy: string | null;
  whatWasBid: string | null;
  baseBidAmount: number | null;
};

function partyContact(label: string, p?: ProcessParty | null): CrmContact | null {
  if (!p) return null;
  const name = p.contactName || p.name || null;
  const company = p.company || null;
  if (!name && !company && !p.phone && !p.email) return null;
  return {
    label,
    name,
    company,
    phone: p.phone ?? null,
    email: p.email ?? null,
  };
}

function formatLocation(bid: BidDetail): string | null {
  const addr = bid.process?.projectAddress;
  const parts = [
    addr?.line1,
    addr?.city,
    addr?.state,
    addr?.zip,
  ]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  const legacy = [bid.address, bid.city, bid.state, bid.zip]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return legacy.length ? legacy.join(", ") : null;
}

/** Project existing bid fields into a call-ready CRM view — does not copy into locked FollowupCRM blobs. */
export function buildBidCrmSnapshot(bid: BidDetail): BidCrmSnapshot {
  const process = bid.process;
  const companyInfo = bid.companyInfo ?? null;
  const invitations = process?.invitations ?? [];
  const gcs = process?.generalContractors ?? [];
  const mechanicals = process?.mechanicals ?? [];
  const intel = process?.intelligence;

  const submittedTo: CrmContact[] = [];
  for (const inv of invitations) {
    const c = inv.contact;
    if (!c) continue;
    submittedTo.push({
      label: "Invite",
      name: c.name ?? null,
      company: c.company ?? null,
      phone: c.phone ?? null,
      email: c.email ?? null,
    });
  }
  if (companyInfo?.companyName || companyInfo?.contactName) {
    submittedTo.push({
      label: "Client / GC",
      name: companyInfo.contactName ?? null,
      company: companyInfo.companyName ?? null,
      phone: companyInfo.contactPhone || companyInfo.contactCell || null,
      email: companyInfo.contactEmail ?? null,
    });
  }

  const keyContacts: CrmContact[] = [];
  const push = (c: CrmContact | null) => {
    if (c) keyContacts.push(c);
  };
  push(partyContact("Owner", process?.owner));
  push(partyContact("Architect", process?.architect));
  push(partyContact("Mechanical engineer", process?.mechanicalEngineer));
  for (const g of gcs) push(partyContact("GC", g));
  for (const m of mechanicals) push(partyContact("Mechanical", m));

  const amount =
    bid.baseBidAmount ??
    (typeof process?.amountSubmitted === "number" ? process.amountSubmitted : null) ??
    (typeof process?.baseBidPrice === "number" ? process.baseBidPrice : null);

  let whatWasBid: string | null = null;
  if (amount != null) whatWasBid = formatMoney(amount);
  else if (process?.workType) whatWasBid = String(process.workType);

  return {
    estimateNumber: bid.estimateNumber,
    bidName: bid.bidName || "Untitled estimate",
    workType: process?.workType ?? bid.workType ?? null,
    location: formatLocation(bid),
    bidDate: bid.bidDate ?? null,
    dueDate: process?.dueDate ?? bid.dueDate ?? null,
    dueTime: process?.dueTime ?? bid.dueTime ?? null,
    clientCompany: companyInfo,
    owner: process?.owner ?? null,
    architect: process?.architect ?? null,
    mechanicalEngineer: process?.mechanicalEngineer ?? null,
    generalContractors: gcs,
    mechanicals,
    invitations: invitations.map((i) => ({
      company: i.contact?.company ?? null,
      contact: i.contact ?? null,
    })),
    submittedTo,
    keyContacts,
    teamCaptain: process?.assignment?.captain ?? bid.captain ?? null,
    assistantEstimator:
      process?.assignment?.assistantEstimator ?? bid.assistantEstimator ?? null,
    teamId: process?.assignment?.teamId ?? bid.teamId ?? null,
    competitors: intel?.competitors ?? [],
    followUpWhy:
      intel?.customerFeedback ||
      intel?.currentProjectStatus ||
      intel?.notes ||
      companyInfo?.notes ||
      null,
    whatWasBid,
    baseBidAmount: amount,
  };
}

/** Seed one follow-up company from Base Bid companyInfo when intel list is empty. */
export function seedFollowUpFromCompanyInfo(
  companyInfo: BidCompanyInfo | null | undefined
): ProcessFollowUpCompany | null {
  if (!companyInfo) return null;
  const companyName = companyInfo.companyName?.trim() || null;
  const contactName = companyInfo.contactName?.trim() || null;
  const phone =
    companyInfo.contactPhone?.trim() ||
    companyInfo.contactCell?.trim() ||
    null;
  if (!companyName && !contactName && !phone) return null;
  return {
    id: newId(),
    companyName,
    contactName,
    phone,
    callAttempts: [],
  };
}
