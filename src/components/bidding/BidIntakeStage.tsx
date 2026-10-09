"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import { PartyNameCombobox } from "@/components/bidding/PartyNameCombobox";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  bidKindOptionsFromMeta,
  tierRoleOptionsFromMeta,
  workTypeOptionsFromMeta,
  type ProcessContractTier,
  type ProcessDocumentLink,
  type ProcessGcOrMech,
  type ProcessInvitation,
  type ProcessInvitationAddendum,
  type ProcessMeta,
  type ProcessParty,
} from "@/lib/bidding/process-types";
import type { BidListItem, LookupNameItem } from "@/lib/bidding/types";
import { newId } from "@/lib/bidding/newId";
import {
  INTAKE_ADD_BTN,
  INTAKE_REMOVE_BTN,
  PlusIcon,
  TrashIcon,
} from "@/components/bidding/intakeIcons";

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function party(p: ProcessParty | null | undefined): ProcessParty {
  return {
    name: p?.name ?? "",
    company: p?.company ?? "",
    contactName: p?.contactName ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    preferredContact: p?.preferredContact ?? null,
  };
}

function preferredContactValue(p: {
  preferredContact?: "email" | "phone" | null;
  email?: string | null;
  phone?: string | null;
}): string {
  if (p.preferredContact === "phone") return (p.phone ?? "").trim();
  if (p.preferredContact === "email") return (p.email ?? "").trim();
  return ((p.email || p.phone) ?? "").trim();
}

function emptyAddendum(): ProcessInvitationAddendum {
  return {
    number: null,
    receivedAt: null,
    attachmentIds: [],
    notes: null,
  };
}

function emptyInvitation(): ProcessInvitation {
  return {
    id: newId(),
    receivedAt: null,
    contact: {
      name: null,
      email: null,
      phone: null,
      company: null,
      preferredContact: null,
    },
    links: [],
    attachmentIds: [],
    addenda: [],
    inviteBody: null,
    notes: null,
  };
}

function emptyDocLink(): ProcessDocumentLink {
  return { url: "", label: null, source: "owner", checkAddenda: false };
}

function defaultOwnerTier(): ProcessContractTier {
  return {
    sortOrder: 0,
    role: "owner",
    company: null,
    hasTheJob: null,
    invitedUs: false,
    isPaying: true,
  };
}

function emptyGcOrMech(): ProcessGcOrMech {
  return {
    name: null,
    company: "",
    contactName: null,
    email: null,
    phone: null,
    preferredContact: null,
    hasTheJob: null,
    stillBidding: null,
    bidPrice: null,
    contractorStatus: null,
    proposalStatus: null,
  };
}

const CONTRACTOR_STATUS_OPTIONS: { value: NonNullable<ProcessGcOrMech["contractorStatus"]>; label: string }[] = [
  { value: "invited", label: "Invited" },
  { value: "bidding", label: "Bidding" },
  { value: "declined_to_bid", label: "Declined to bid" },
  { value: "no_response", label: "No response" },
  { value: "awarded", label: "Awarded the job" },
  { value: "not_awarded", label: "Not awarded" },
];

const PROPOSAL_STATUS_OPTIONS: { value: NonNullable<ProcessGcOrMech["proposalStatus"]>; label: string }[] = [
  { value: "not_submitted", label: "Not submitted" },
  { value: "submitted", label: "Submitted" },
  { value: "revised", label: "Revised" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

/** Unique companies from invite_contact parties for company-first typeahead. */
function companyOptionsFromParties(
  parties: BidPartyLookup[]
): BidPartyLookup[] {
  const seen = new Set<string>();
  const out: BidPartyLookup[] = [];
  for (const p of parties) {
    const company = (p.company || p.name || "").trim();
    if (!company) continue;
    const key = company.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `company:${key}`,
      name: company,
      company,
      contactName: null,
      email: null,
      phone: null,
      role: "invite_contact",
    });
  }
  return out;
}

function contactsForCompany(
  parties: BidPartyLookup[],
  company: string | null | undefined
): BidPartyLookup[] {
  const c = company?.trim().toLowerCase();
  if (!c) return parties;
  return parties.filter((p) => {
    const pc = (p.company ?? "").trim().toLowerCase();
    const pn = (p.name ?? "").trim().toLowerCase();
    return pc === c || (!pc && pn === c);
  });
}

/** Stage 1 — Intake (FRONTEND_INTAKE.md). Bid clerk. Incomplete OK. */
export function BidIntakeStage() {
  const router = useRouter();
  const {
    setBidHeader,
    patchOurEntityId,
    setJobId,
    setBaseBidField,
    lookups,
    uploadAttachment,
    uploadAttachments,
    deleteAttachment,
  } = useBidSheet();
  const confirmDialog = useConfirmDialog();
  const {
    bid,
    draft,
    setDraft,
    setField,
    saving,
    dirty,
    error,
    editable,
  } = useProcessDraft();
  /** Compact CRM-style fields (shared visual system with Assignment). */
  const inputClass =
    "intake-field w-full appearance-none";
  const labelClass = "intake-label";
  const selectClass = `${inputClass} appearance-none pr-8`;
  const sectionHead = "intake-section-head";
  const sectionBody = "intake-section-body";
  const addBtnClass = INTAKE_ADD_BTN;
  const removeBtnClass = INTAKE_REMOVE_BTN
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [dupHits, setDupHits] = useState<BidListItem[]>([]);
  const [dupSearching, setDupSearching] = useState(false);
  const [linkingDupId, setLinkingDupId] = useState<string | null>(null);
  const [linkDupError, setLinkDupError] = useState<string | null>(null);
  const [buildingTypes, setBuildingTypes] = useState<LookupNameItem[]>([]);
  const [projectTypes, setProjectTypes] = useState<LookupNameItem[]>([]);
  const [partiesByRole, setPartiesByRole] = useState<{
    owner: BidPartyLookup[];
    architect: BidPartyLookup[];
    mechanical: BidPartyLookup[];
    invite_contact: BidPartyLookup[];
  }>({
    owner: [],
    architect: [],
    mechanical: [],
    invite_contact: [],
  });
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
    void biddingApi
      .getBiddingBuildingTypes()
      .then(setBuildingTypes)
      .catch(() => setBuildingTypes([]));
    void biddingApi
      .getBiddingProjectTypes()
      .then(setProjectTypes)
      .catch(() => setProjectTypes([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      biddingPartiesApi.getBiddingParties({ role: "owner" }),
      biddingPartiesApi.getBiddingParties({ role: "architect" }),
      biddingPartiesApi.getBiddingParties({ role: "mechanical" }),
      biddingPartiesApi.getBiddingParties({ role: "invite_contact" }),
    ]).then(([owner, architect, mechanical, invite_contact]) => {
      if (cancelled) return;
      setPartiesByRole({ owner, architect, mechanical, invite_contact });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bid) return null;

  const workTypes = workTypeOptionsFromMeta(meta);
  const bidKinds = bidKindOptionsFromMeta(meta);
  const tierRoles = tierRoleOptionsFromMeta(meta);

  const invitations: ProcessInvitation[] =
    draft.invitations?.length
      ? draft.invitations
      : draft.invitationReceivedAt || draft.inviteContact
        ? [
            {
              id: newId(),
              receivedAt: draft.invitationReceivedAt ?? null,
              contact: draft.inviteContact ?? null,
              links: [],
              attachmentIds: [],
              addenda: [],
              notes: null,
            },
          ]
        : [];

  /** Always show at least one row so the section is never an empty shell. */
  const documentLinks: ProcessDocumentLink[] = draft.documentLinks?.length
    ? draft.documentLinks
    : [emptyDocLink()];
  /** Always show at least one contract-chain layer (default Owner / paying). */
  const tiers: ProcessContractTier[] = draft.contractTiers?.length
    ? draft.contractTiers
    : [defaultOwnerTier()];
  const inviteCompanyOptions = companyOptionsFromParties(
    partiesByRole.invite_contact
  );
  const whoElse = draft.whoElseBidding ?? {};
  const needsWhoElseResearch = invitations.length < 2;

  const emptyTier = (): ProcessContractTier => ({
    sortOrder: tiers.length,
    role: null,
    company: null,
    hasTheJob: null,
    invitedUs: false,
    isPaying: false,
  });

  const setParty = (
    key: "owner" | "architect" | "mechanicalEngineer",
    field: keyof ProcessParty,
    value: string
  ) => {
    const cur = party(draft[key] as ProcessParty);
    setField(key, { ...cur, [field]: value || null });
  };

  const setAddress = (field: string, value: string) => {
    setDraft({
      ...draft,
      projectAddress: { ...(draft.projectAddress ?? {}), [field]: value || null },
    });
  };

  /** Bid name = drawing name (architect name on drawings). */
  const setDrawingName = (value: string) => {
    const v = value || null;
    setField("drawingName", v);
    setBidHeader({ bidName: v ?? "" });
    scheduleDupSearch({ search: value });
  };

  const scheduleDupSearch = (params: {
    search?: string;
    ownerProjectNumber?: string;
    mechanicalEngineerProjectNumber?: string;
  }) => {
    if (dupTimer.current) clearTimeout(dupTimer.current);
    const q =
      params.search?.trim() ||
      params.ownerProjectNumber?.trim() ||
      params.mechanicalEngineerProjectNumber?.trim();
    if (!q || q.length < 2) {
      setDupHits([]);
      return;
    }
    dupTimer.current = setTimeout(() => {
      setDupSearching(true);
      void biddingApi
        .listBids({
          search: params.search?.trim() || undefined,
          ownerProjectNumber: params.ownerProjectNumber?.trim() || undefined,
          mechanicalEngineerProjectNumber:
            params.mechanicalEngineerProjectNumber?.trim() || undefined,
        })
        .then((rows) =>
          setDupHits(rows.filter((r) => String(r.id) !== String(bid.id)).slice(0, 8))
        )
        .catch(() => setDupHits([]))
        .finally(() => setDupSearching(false));
    }, 350);
  };

  const setInvitations = (next: ProcessInvitation[]) => {
    setField("invitations", next);
  };

  const patchInvitation = (index: number, patch: Partial<ProcessInvitation>) => {
    const next = invitations.map((inv, i) =>
      i === index ? { ...inv, ...patch } : inv
    );
    setInvitations(next);
  };

  /** Invitation contact ↔ Mechanical party (bidirectional on select). */
  const partyFromInviteContact = (
    contact: ProcessInvitation["contact"] | null | undefined
  ): ProcessParty => ({
    name: contact?.name || contact?.company || null,
    company: contact?.company || null,
    contactName: contact?.name || null,
    email: contact?.email || null,
    phone: contact?.phone || null,
  });

  const inviteContactFromParty = (
    p: ProcessParty,
    prev?: ProcessInvitation["contact"] | null
  ): NonNullable<ProcessInvitation["contact"]> => ({
    name: p.contactName || p.name || prev?.name || null,
    company: p.company || p.name || prev?.company || null,
    email: p.email || prev?.email || null,
    phone: p.phone || prev?.phone || null,
  });

  /** Pick Mechanical → fill first invitation row (create one if needed). */
  const pickMechanical = (picked: ProcessParty) => {
    const me: ProcessParty = {
      name: picked.name ?? null,
      company: picked.company ?? null,
      contactName: picked.contactName ?? null,
      email: picked.email ?? null,
      phone: picked.phone ?? null,
    };
    const base = invitations.length > 0 ? invitations : [emptyInvitation()];
    const nextInvs = base.map((inv, i) =>
      i === 0
        ? {
            ...inv,
            contact: inviteContactFromParty(me, inv.contact),
          }
        : inv
    );
    setDraft({
      ...draft,
      mechanicalEngineer: me,
      invitations: nextInvs,
    });
  };

  /** Pick invitation company/contact → fill Mechanical. */
  const pickInvitationContact = (
    index: number,
    contact: NonNullable<ProcessInvitation["contact"]>
  ) => {
    const base = invitations.length > 0 ? invitations : [emptyInvitation()];
    const nextInvs = base.map((inv, i) =>
      i === index ? { ...inv, contact } : inv
    );
    setDraft({
      ...draft,
      invitations: nextInvs,
      mechanicalEngineer: partyFromInviteContact(contact),
    });
  };

  const setTiers = (next: ProcessContractTier[]) => {
    setField("contractTiers", next.length > 0 ? next : [defaultOwnerTier()]);
  };

  const patchTier = (index: number, patch: Partial<ProcessContractTier>) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const gcs: ProcessGcOrMech[] = draft.generalContractors ?? [];
  /** Always show at least one mechanical-contractor row (default empty shell). */
  const mechs: ProcessGcOrMech[] =
    draft.mechanicals && draft.mechanicals.length > 0
      ? draft.mechanicals
      : [emptyGcOrMech()];

  const setGcs = (next: ProcessGcOrMech[]) => {
    setField("generalContractors", next);
  };
  const setMechs = (next: ProcessGcOrMech[]) => {
    setField("mechanicals", next.length > 0 ? next : [emptyGcOrMech()]);
  };

  const linkIntoKeeper = async (keep: BidListItem) => {
    if (!bid || !editable) return;
    const ok = await confirmDialog({
      title: "Merge duplicate bid?",
      message: `Merge this bid into ${keep.estimateNumber}? Invites and links move to the keeper; this bid is cancelled.`,
      confirmLabel: "Merge",
      variant: "danger",
    });
    if (!ok) return;
    setLinkingDupId(keep.id);
    setLinkDupError(null);
    try {
      await biddingApi.linkDuplicateBid(bid.id, {
        keepBidId: keep.id,
        notes: "same drawings",
      });
      router.push(`/bidding/${keep.id}?stage=intake`);
    } catch (e) {
      setLinkDupError(
        getApiErrorMessage(e, "Could not link duplicate bids")
      );
    } finally {
      setLinkingDupId(null);
    }
  };

  function renderPartySection(
    key: "owner" | "architect" | "mechanicalEngineer",
    title: string,
    role: "owner" | "architect" | "mechanical"
  ) {
    const p = party(draft[key] as ProcessParty);
    const isMechanical = key === "mechanicalEngineer";
    return (
      <section className="intake-section flex h-full min-h-0 min-w-0 flex-col">
        <h3 className={sectionHead}>{title}</h3>
        <div className={`${sectionBody} intake-stack min-h-0 flex-1 overflow-auto`}>
        <PartyNameCombobox
          label="Name"
          value={p.name ?? ""}
          options={partiesByRole[role]}
          partyRole={role}
          disabled={!editable}
          inputClass={inputClass}
          labelClass={labelClass}
          showPicker
          addressBookTitle="Company Address Book"
          onChangeName={(name) => setParty(key, "name", name)}
          onPickExisting={(picked) => {
            if (isMechanical) {
              pickMechanical(picked);
              return;
            }
            setField(key, {
              name: picked.name ?? null,
              company: picked.company ?? null,
              contactName: picked.contactName ?? null,
              email: picked.email ?? null,
              phone: picked.phone ?? null,
            });
          }}
        />
        <PartyNameCombobox
          label="Company"
          value={p.company ?? ""}
          options={companyOptionsFromParties(partiesByRole[role])}
          addressBookOptions={partiesByRole[role]}
          partyRole={role}
          disabled={!editable}
          inputClass={inputClass}
          labelClass={labelClass}
          showPicker
          addressBookTitle="Company Address Book"
          placeholder="Search or type company…"
          inputValueFromParty={(picked) =>
            picked.company || picked.name || ""
          }
          onChangeName={(name) => setParty(key, "company", name)}
          onPickExisting={(picked) => {
            if (isMechanical) {
              pickMechanical({
                ...picked,
                company: picked.company || picked.name || null,
              });
              return;
            }
            setField(key, {
              ...p,
              company: picked.company || picked.name || null,
              contactName:
                picked.contactName || picked.name || p.contactName || null,
              email: picked.email ?? p.email ?? null,
              phone: picked.phone ?? p.phone ?? null,
            });
          }}
        />
        <PartyNameCombobox
          label="Contact name"
          value={p.contactName ?? ""}
          options={partiesByRole[role]}
          partyRole={role}
          disabled={!editable}
          inputClass={inputClass}
          labelClass={labelClass}
          showPicker
          addressBookTitle="Company Address Book"
          placeholder="Search or type contact…"
          inputValueFromParty={(picked) =>
            picked.contactName || picked.name || ""
          }
          onChangeName={(name) => setParty(key, "contactName", name)}
          onPickExisting={(picked) => {
            const contact =
              picked.contactName || picked.name || null;
            if (isMechanical) {
              pickMechanical({
                ...picked,
                contactName: contact,
                name: p.name || picked.name || null,
              });
              return;
            }
            setField(key, {
              ...p,
              contactName: contact,
              company: picked.company ?? p.company ?? null,
              email: picked.email ?? p.email ?? null,
              phone: picked.phone ?? p.phone ?? null,
            });
          }}
        />
        {(
          [
            ["email", "Email"],
            ["phone", "Phone"],
          ] as const
        ).map(([f, label]) => (
          <label key={f} className="intake-row">
            <span className={labelClass}>{label}</span>
            <input
              className={inputClass}
              disabled={!editable}
              value={String(p[f] ?? "")}
              onChange={(e) => setParty(key, f, e.target.value)}
            />
          </label>
        ))}
        <label className="intake-row">
          <span className={labelClass}>Preferred contact</span>
          <div className="relative">
            <select
              className={selectClass}
              disabled={!editable}
              value={p.preferredContact ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setField(key, {
                  ...p,
                  preferredContact: v === "email" || v === "phone" ? v : null,
                });
              }}
            >
              <option value="">—</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Preferred value</span>
          <input
            className={inputClass}
            disabled
            readOnly
            value={preferredContactValue(p)}
            placeholder="Matches email or phone above"
          />
        </label>
        </div>
      </section>
    );
  }

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-4 overflow-auto sm:gap-6">
      <header>
        <h2 className="intake-title">Intake</h2>
        <p className="intake-sub">
          {saving ? "Saving…" : editable ? (dirty ? "Unsaved changes" : "Save to keep changes") : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      {dupHits.length > 0 ? (
        <div className="rounded border border-amber-500/25 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-[#1f2937]">
            Possible same opportunity
            {dupSearching ? "…" : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-[#6b7280]">
            Same drawings? Open that bid and Add invitation — do not create a
            second bid. If this bid was created by mistake, merge it into the
            keeper.
          </p>
          {linkDupError ? (
            <p className="mt-2 text-xs text-danger">{linkDupError}</p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {dupHits.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <Link
                  href={`/bidding/${h.id}?stage=intake`}
                  className="text-[12.5px] font-medium text-[#4b5563] hover:underline"
                >
                  {h.estimateNumber}
                  {" · "}
                  {h.drawingName || h.bidName || "Untitled"}
                  {h.ownerProjectNumber
                    ? ` · Owner ${h.ownerProjectNumber}`
                    : ""}
                  {h.mechanicalEngineerProjectNumber
                    ? ` · EOR Mech # ${h.mechanicalEngineerProjectNumber}`
                    : ""}
                </Link>
                {editable && bid && String(h.id) !== String(bid.id) ? (
                  <button
                    type="button"
                    disabled={linkingDupId != null}
                    className="text-[11px] font-semibold text-[#4b5563] underline-offset-2 hover:text-[#1f2937] hover:underline disabled:opacity-50"
                    onClick={() => void linkIntoKeeper(h)}
                  >
                    {linkingDupId === h.id
                      ? "Merging…"
                      : "Merge this bid into keeper"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 1 col until 2xl — with dual sidebars, lg 3-col crushes fields */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 2xl:grid-cols-3 2xl:gap-6">
      <section className="intake-section flex h-full min-w-0 flex-col 2xl:row-span-2">
        <h3 className={sectionHead}>Bid identity</h3>
        <div className={`${sectionBody} intake-stack flex-1`}>
        <label className="intake-row">
          <span className={labelClass}>Bid / estimate #</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={bid.estimateNumber ?? ""}
            onChange={(e) => setBidHeader({ estimateNumber: e.target.value })}
          />
        </label>
        <label className="intake-row !items-start">
          <span className={labelClass}>Company bidding (us)</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="relative min-w-0">
              <select
                className={selectClass}
                disabled={!editable}
                value={String(bid.ourEntityId ?? "")}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n) || n <= 0) return;
                  void patchOurEntityId(n);
                }}
              >
                {(lookups.ourEntities.length
                  ? lookups.ourEntities
                  : [
                      { id: 1, name: "GOEL" },
                      { id: 2, name: "GOEL DC" },
                      { id: 3, name: "DCB" },
                    ]
                ).map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
            <span className="text-[10px] leading-tight text-[#9ca3af]">
              {draft.entityRule?.suggestedOurEntity
                ? `Rule suggests ${draft.entityRule.suggestedOurEntity.replace(/_/g, " ")} — change anytime on Intake`
                : "GOEL / GOEL DC / DCB — change anytime on Intake"}
            </span>
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Bid type (mandatory)</span>
          <div className="relative">
            <select
              className={selectClass + " !bg-[#eef2f7]"}
              disabled={!editable}
              value={draft.bidKind ?? ""}
              onChange={(e) =>
                setField(
                  "bidKind",
                  (e.target.value || null) as typeof draft.bidKind
                )
              }
            >
              <option value="">—</option>
              {bidKinds.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Bid name</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.drawingName ?? bid.bidName ?? ""}
            onChange={(e) => setDrawingName(e.target.value)}
            placeholder="e.g. Weinberg USP 800 Pharmacy"
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Drawing number</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.drawingNumber ?? ""}
            onChange={(e) => setField("drawingNumber", e.target.value || null)}
            placeholder="Sheet / set number"
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Drawing category</span>
          <div className="min-w-0">
            <div className="relative">
              <select
                className={selectClass}
                disabled={!editable}
                value={draft.drawingCategory ?? ""}
                onChange={(e) =>
                  setField(
                    "drawingCategory",
                    (e.target.value || null) as typeof draft.drawingCategory
                  )
                }
              >
                <option value="">—</option>
                {(meta?.drawingCategories?.includes("cd")
                  ? meta.drawingCategories
                  : [...(meta?.drawingCategories ?? ["sd", "dd", "ifb", "ifp", "ifc", "ifr"]), "cd"]
                ).map((id) => (
                  <option key={id} value={id}>
                    {meta?.drawingCategoryLabels?.[id] ?? (id === "cd" ? "CD" : id)}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
            {draft.drawingCategory && meta?.drawingCategoryPercents?.[draft.drawingCategory] ? (
              <p className="mt-0.5 text-[10px] text-[#9ca3af]">
                {meta.drawingCategoryPercents[draft.drawingCategory]} design completeness
              </p>
            ) : null}
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Owner / architect</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.ownerProjectNumber ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setField("ownerProjectNumber", v);
              scheduleDupSearch({ ownerProjectNumber: e.target.value });
            }}
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>EOR mechanical #</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.mechanicalEngineerProjectNumber ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setField("mechanicalEngineerProjectNumber", v);
              scheduleDupSearch({
                mechanicalEngineerProjectNumber: e.target.value,
              });
            }}
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Bid price</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            disabled={!editable}
            value={draft.baseBidPrice ?? ""}
            onChange={(e) =>
              setField(
                "baseBidPrice",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </label>
        {/* PJ: no jobId on intake — link when awarded. Opt-in via intakeEditor.jobIdOnIntake. */}
        {meta?.intakeEditor?.jobIdOnIntake === true &&
        meta?.intakeEditor?.hideJobIdOnIntake !== true ? (
          <label className="intake-row">
            <span className={labelClass}>Linked job</span>
            <div className="relative">
              <select
                className={selectClass}
                disabled={!editable}
                value={bid.jobId ? String(bid.jobId) : ""}
                onChange={(e) => {
                  const jobId = e.target.value ? Number(e.target.value) : null;
                  void setJobId(jobId, {
                    prefillCompany: Boolean(jobId && jobId !== bid.jobId),
                  });
                }}
              >
                <option value="">No job linked</option>
                {lookups.jobs.map((j) => (
                  <option key={j.id} value={String(j.id)}>
                    {j.name || `Job #${j.id}`}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        ) : null}
        <div className="intake-row">
          <span className={labelClass}>Bid date</span>
          <DatePicker
            ariaLabel="Bid date"
            className={inputClass}
            disabled={!editable}
            value={
              typeof bid.baseBid?.bidDate === "string"
                ? String(bid.baseBid.bidDate).slice(0, 10)
                : bid.bidDate?.slice(0, 10) ?? ""
            }
            onChange={(v) => {
              setBaseBidField("bidDate", v);
              const date = v?.slice(0, 10) || null;
              if (date && !draft.dueDate) {
                setField("dueDate", date);
              }
            }}
          />
        </div>
        <label className="intake-row">
          <span className={labelClass}>Bid time</span>
          <TimePicker
            ariaLabel="Bid time"
            className={inputClass}
            disabled={!editable}
            value={draft.dueTime ?? ""}
            onChange={(v) => setField("dueTime", v || null)}
          />
        </label>
        <label className="intake-row">
          <span className={labelClass}>Work type</span>
          <div className="relative">
            <select
              className={selectClass}
              disabled={!editable}
              value={draft.workType ?? ""}
              onChange={(e) =>
                setField(
                  "workType",
                  (e.target.value || null) as typeof draft.workType
                )
              }
            >
              <option value="">—</option>
              {workTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Building type</span>
          <div className="relative">
            <select
              className={selectClass}
              disabled={!editable}
              value={draft.constructionType ?? ""}
              onChange={(e) =>
                setField("constructionType", e.target.value || null)
              }
            >
              <option value="">—</option>
              {buildingTypes.map((o) => (
                <option key={o.id ?? o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Project type</span>
          <div className="relative">
            <select
              className={selectClass}
              disabled={!editable}
              value={draft.constructionSubtype ?? ""}
              onChange={(e) =>
                setField("constructionSubtype", e.target.value || null)
              }
            >
              <option value="">—</option>
              {projectTypes.map((o) => (
                <option key={o.id ?? o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Impacted SF</span>
          <div className="min-w-0">
            <input
              type="number"
              min={0}
              step={1}
              className={inputClass}
              disabled={!editable}
              value={draft.impactedGsf ?? ""}
              onChange={(e) =>
                setField(
                  "impactedGsf",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="Renovated / impacted area"
            />
            <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
              Life-safety renovated area — not whole-building GSF
            </span>
          </div>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Entity rule</span>
          <p className="rounded border border-[#e5e7eb] bg-[#f3f4f6] px-2.5 py-1.5 text-[12.5px] text-[#4b5563]">
            {draft.entityRule?.suggestedOurEntity
              ? `Suggests ${draft.entityRule.suggestedOurEntity.replace(/_/g, " ")} — pick above, not locked`
              : "Suggests GOEL / GOEL DC / DCB from state. Actual company is the dropdown above."}
          </p>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Related bid ID</span>
          <div className="flex gap-2">
            <input
              className={inputClass}
              disabled={!editable}
              value={
                draft.relatedBidId != null ? String(draft.relatedBidId) : ""
              }
              onChange={(e) =>
                setField(
                  "relatedBidId",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="Prior generation"
            />
            {draft.relatedBidId != null ? (
              <Link
                href={`/bidding/${draft.relatedBidId}?stage=intake`}
                className="shrink-0 self-center text-[12.5px] font-medium text-[#4b5563] hover:underline"
              >
                Open
              </Link>
            ) : null}
          </div>
        </label>
        </div>
      </section>

        <section className="intake-section flex h-full min-w-0 flex-col">
          <h3 className={sectionHead}>Project address</h3>
          <div className={`${sectionBody} intake-stack flex-1`}>
          {(
            [
              ["line1", "Address line 1 (paste full)"],
              ["line2", "Address line 2"],
              ["city", "City"],
              ["state", "State"],
              ["zip", "ZIP"],
            ] as const
          ).map(([k, label]) => (
            <label
              key={k}
              className="intake-row"
            >
              <span className={labelClass}>{label}</span>
              <input
                className={inputClass}
                disabled={!editable}
                value={String(draft.projectAddress?.[k] ?? "")}
                onChange={(e) => setAddress(k, e.target.value)}
              />
            </label>
          ))}
          <label className="intake-row">
            <span className={labelClass}>Sales tax applicable</span>
            <div className="relative">
              <select
                className={selectClass}
                disabled={!editable}
                value={
                  bid.baseBid?.salesTaxApplicable === true
                    ? "yes"
                    : bid.baseBid?.salesTaxApplicable === false
                      ? "no"
                      : ""
                }
                onChange={(e) =>
                  setBaseBidField(
                    "salesTaxApplicable",
                    e.target.value === "" ? undefined : e.target.value === "yes"
                  )
                }
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <SelectChevron />
            </div>
          </label>
          </div>
        </section>
        {renderPartySection("owner", "Owner", "owner")}
        <div className="min-w-0 2xl:col-span-2">
          {renderPartySection("architect", "Architect", "architect")}
        </div>
      </div>

      <div className="intake-trio-row grid grid-cols-1 items-start gap-4 sm:gap-5 2xl:grid-cols-3 2xl:items-stretch 2xl:gap-6">
      <section className="intake-section flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className={`${sectionHead} shrink-0`}>
          GCs / mechanical contractors
          <span className="intake-head-count">{gcs.length + mechs.length}</span>
        </div>
        <div className={`${sectionBody} intake-trio-scroll flex min-h-0 flex-1 flex-col gap-3`}>
        {(
          [
            {
              key: "gc" as const,
              title: "General contractors",
              list: gcs,
              setList: setGcs,
            },
            {
              key: "mech" as const,
              title: "Mechanical contractors",
              list: mechs,
              setList: setMechs,
            },
          ] as const
        ).map(({ key, title, list, setList }) => (
          <div key={key}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                {title}
              </p>
              <div className="flex items-center gap-2">
                {editable ? (
                  <button
                    type="button"
                    className={addBtnClass}
                    aria-label={`Add ${title.toLowerCase().replace(/s$/, "")}`}
                    title={`Add ${title.toLowerCase().replace(/s$/, "")}`}
                    onClick={() => setList([...list, emptyGcOrMech()])}
                  >
                    <PlusIcon />
                  </button>
                ) : null}
                <span className="intake-head-count">{list.length}</span>
              </div>
            </div>
            <div className="mt-2">
            {list.length === 0 ? (
              <p className="text-[12.5px] text-[#9ca3af]">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((row, index) => (
                  <li
                    key={`${key}-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8ecf1] bg-[#f8fafc] px-2.5 py-1.5"
                  >
                    <input
                      className={`${inputClass} min-w-[10rem] flex-1`}
                      disabled={!editable}
                      placeholder="Company"
                      value={row.company ?? row.name ?? ""}
                      onChange={(e) => {
                        const company = e.target.value;
                        setList(
                          list.map((r, i) =>
                            i === index
                              ? { ...r, company, name: company || null }
                              : r
                          )
                        );
                      }}
                    />
                    <input
                      className={`${inputClass} min-w-[8rem] flex-1`}
                      disabled={!editable}
                      placeholder="Contact name"
                      value={row.contactName ?? ""}
                      onChange={(e) => {
                        const contactName = e.target.value || null;
                        setList(list.map((r, i) => (i === index ? { ...r, contactName } : r)));
                      }}
                    />
                    <input
                      className={`${inputClass} min-w-[10rem] flex-1`}
                      disabled={!editable}
                      placeholder="Email"
                      value={row.email ?? ""}
                      onChange={(e) => {
                        const email = e.target.value || null;
                        setList(list.map((r, i) => (i === index ? { ...r, email } : r)));
                      }}
                    />
                    <input
                      className={`${inputClass} min-w-[7rem] flex-1`}
                      disabled={!editable}
                      placeholder="Bid price"
                      inputMode="decimal"
                      value={row.bidPrice ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim().replace(/[$,\s]/g, "");
                        const bidPrice =
                          raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : row.bidPrice;
                        setList(list.map((r, i) => (i === index ? { ...r, bidPrice } : r)));
                      }}
                    />
                    <input
                      className={`${inputClass} min-w-[8rem] flex-1`}
                      disabled={!editable}
                      placeholder="Phone"
                      value={row.phone ?? ""}
                      onChange={(e) => {
                        const phone = e.target.value || null;
                        setList(list.map((r, i) => (i === index ? { ...r, phone } : r)));
                      }}
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-[#4b5563]">
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={row.hasTheJob === true}
                        onChange={(e) =>
                          setList(
                            list.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    hasTheJob: e.target.checked ? true : null,
                                  }
                                : r
                            )
                          )
                        }
                      />
                      Has the job
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#4b5563]">
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={row.stillBidding === true}
                        onChange={(e) =>
                          setList(
                            list.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    stillBidding: e.target.checked
                                      ? true
                                      : null,
                                  }
                                : r
                            )
                          )
                        }
                      />
                      Still bidding
                    </label>
                    <select
                      className={`${inputClass} w-40`}
                      disabled={!editable}
                      value={row.contractorStatus ?? ""}
                      onChange={(e) => {
                        const contractorStatus = (e.target.value || null) as ProcessGcOrMech["contractorStatus"];
                        setList(list.map((r, i) => (i === index ? { ...r, contractorStatus } : r)));
                      }}
                    >
                      <option value="">Contractor status</option>
                      {CONTRACTOR_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={`${inputClass} w-40`}
                      disabled={!editable}
                      value={row.proposalStatus ?? ""}
                      onChange={(e) => {
                        const proposalStatus = (e.target.value || null) as ProcessGcOrMech["proposalStatus"];
                        setList(list.map((r, i) => (i === index ? { ...r, proposalStatus } : r)));
                      }}
                    >
                      <option value="">Proposal status</option>
                      {PROPOSAL_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {editable ? (
                      <button
                        type="button"
                        className={removeBtnClass}
                        aria-label={
                          key === "gc"
                            ? "Remove GC"
                            : "Remove mechanical contractor"
                        }
                        title={
                          key === "gc"
                            ? "Remove GC"
                            : "Remove mechanical contractor"
                        }
                        onClick={() => {
                          void (async () => {
                            const ok = await confirmDialog({
                              title:
                                key === "gc"
                                  ? "Remove GC?"
                                  : "Remove mechanical contractor?",
                              message: `Remove this ${key === "gc" ? "GC" : "mechanical contractor"}?`,
                              confirmLabel: "Remove",
                              variant: "danger",
                            });
                            if (!ok) return;
                            setList(list.filter((_, i) => i !== index));
                          })();
                        }}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            </div>
          </div>
        ))}
        </div>
      </section>

      <section className="intake-section flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="intake-section-head-bar shrink-0">
          <div>
            <h3>Invitations</h3>
          </div>
          <span className="intake-head-count">{invitations.length}</span>
          {editable ? (
            <button
              type="button"
              className={addBtnClass}
              aria-label="Add invitation"
              title="Add invitation"
              onClick={() =>
                setInvitations([...invitations, emptyInvitation()])
              }
            >
              <PlusIcon />
            </button>
          ) : null}
        </div>
        <div className={`${sectionBody} intake-trio-scroll flex min-h-0 flex-1 flex-col gap-2`}>
        {invitations.length === 0 ? (
          <p className="text-[12.5px] text-[#6b7280]">No invitations yet.</p>
        ) : (
          invitations.map((inv, index) => {
            const company = inv.contact?.company ?? "";
            const contactOptions = contactsForCompany(
              partiesByRole.invite_contact,
              company
            );
            const addenda = inv.addenda ?? [];
            return (
              <div
                key={inv.id ?? index}
                className="intake-stack shrink-0 rounded border border-[#e5e7eb] bg-[#f8fafc] p-2.5"
              >
                <PartyNameCombobox
                  label="Company"
                  value={company}
                  options={inviteCompanyOptions}
                  addressBookOptions={partiesByRole.invite_contact}
                  partyRole="invite_contact"
                  disabled={!editable}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  showPicker
                  addressBookTitle="Company Address Book"
                  placeholder="Which company sent the invite…"
                  inputValueFromParty={(picked) =>
                    picked.company || picked.name || ""
                  }
                  onChangeName={(name) =>
                    patchInvitation(index, {
                      contact: {
                        ...(inv.contact ?? {}),
                        company: name || null,
                      },
                    })
                  }
                  onPickExisting={(picked) =>
                    pickInvitationContact(index, {
                      ...(inv.contact ?? {}),
                      company: picked.company || picked.name || null,
                      name:
                        inv.contact?.name ||
                        picked.contactName ||
                        picked.name ||
                        null,
                      email: picked.email ?? inv.contact?.email ?? null,
                      phone: picked.phone ?? inv.contact?.phone ?? null,
                    })
                  }
                />
                <div className="intake-row">
                  <span className={labelClass}>Received</span>
                  <DatePicker
                    ariaLabel="Received"
                    className={inputClass}
                    disabled={!editable}
                    value={inv.receivedAt?.slice(0, 10) ?? ""}
                    onChange={(v) =>
                      patchInvitation(index, {
                        receivedAt: v || null,
                      })
                    }
                  />
                </div>
                <PartyNameCombobox
                  label="Contact name"
                  value={inv.contact?.name ?? ""}
                  options={contactOptions}
                  addressBookOptions={
                    company
                      ? contactOptions
                      : partiesByRole.invite_contact
                  }
                  partyRole="invite_contact"
                  disabled={!editable}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  showPicker
                  addressBookTitle="Company Address Book"
                  placeholder={
                    company
                      ? "Search contacts at this company…"
                      : "Search or type new contact…"
                  }
                  inputValueFromParty={(picked) =>
                    picked.contactName || picked.name || ""
                  }
                  onChangeName={(name) =>
                    patchInvitation(index, {
                      contact: {
                        ...(inv.contact ?? {}),
                        name: name || null,
                      },
                    })
                  }
                  onPickExisting={(picked) =>
                    pickInvitationContact(index, {
                      name: picked.name ?? null,
                      company:
                        picked.company ||
                        inv.contact?.company ||
                        null,
                      email: picked.email ?? null,
                      phone: picked.phone ?? null,
                    })
                  }
                />
                <label className="intake-row">
                  <span className={labelClass}>Email</span>
                  <input
                    className={inputClass}
                    disabled={!editable}
                    value={inv.contact?.email ?? ""}
                    onChange={(e) =>
                      patchInvitation(index, {
                        contact: {
                          ...(inv.contact ?? {}),
                          email: e.target.value || null,
                        },
                      })
                    }
                  />
                </label>
                <label className="intake-row">
                  <span className={labelClass}>Phone</span>
                  <input
                    className={inputClass}
                    disabled={!editable}
                    value={inv.contact?.phone ?? ""}
                    onChange={(e) =>
                      patchInvitation(index, {
                        contact: {
                          ...(inv.contact ?? {}),
                          phone: e.target.value || null,
                        },
                      })
                    }
                  />
                </label>
                <label className="intake-row">
                  <span className={labelClass}>Preferred contact</span>
                  <div className="relative">
                    <select
                      className={selectClass}
                      disabled={!editable}
                      value={inv.contact?.preferredContact ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchInvitation(index, {
                          contact: {
                            ...(inv.contact ?? {}),
                            preferredContact:
                              v === "email" || v === "phone" ? v : null,
                          },
                        });
                      }}
                    >
                      <option value="">—</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                    <SelectChevron />
                  </div>
                </label>
                <label className="intake-row">
                  <span className={labelClass}>Preferred value</span>
                  <input
                    className={inputClass}
                    disabled
                    readOnly
                    value={preferredContactValue(inv.contact ?? {})}
                    placeholder="Matches email or phone"
                  />
                </label>
                <label className="intake-row col-span-full">
                  <span className={labelClass}>
                    Invitation email (paste full)
                  </span>
                  <textarea
                    className={`${inputClass} min-h-[6rem] resize-y`}
                    disabled={!editable}
                    value={inv.inviteBody ?? ""}
                    placeholder="Paste the full invite email / portal dump…"
                    maxLength={50000}
                    onChange={(e) =>
                      patchInvitation(index, {
                        inviteBody: e.target.value.slice(0, 50000) || null,
                      })
                    }
                  />
                </label>
                <label className="intake-row col-span-full">
                  <span className={labelClass}>Clerk notes</span>
                  <textarea
                    className={`${inputClass} min-h-[3.5rem] resize-y`}
                    disabled={!editable}
                    value={inv.notes ?? ""}
                    placeholder="Internal notes (not the invite paste)"
                    onChange={(e) =>
                      patchInvitation(index, {
                        notes: e.target.value || null,
                      })
                    }
                  />
                </label>
                <label className="intake-row col-span-full">
                  <span className={labelClass}>Inviter drawing link</span>
                  <input
                    className={inputClass}
                    disabled={!editable}
                    value={inv.links?.[0]?.url ?? ""}
                    placeholder="https://…"
                    onChange={(e) => {
                      const url = e.target.value;
                      const links: ProcessDocumentLink[] = url
                        ? [
                            {
                              url,
                              label: inv.links?.[0]?.label ?? "Invite set",
                              source: "inviter",
                            },
                          ]
                        : [];
                      patchInvitation(index, { links });
                    }}
                  />
                </label>

                <div className="col-span-full flex flex-col gap-2 rounded-xl border border-[#e8ecf1] bg-[#fff] p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#6b7280]">
                      Addenda from this inviter
                    </span>
                    <div className="flex items-center gap-2">
                      {editable ? (
                        <button
                          type="button"
                          className={addBtnClass}
                          aria-label="Add addendum"
                          title="Add addendum"
                          onClick={() =>
                            patchInvitation(index, {
                              addenda: [...addenda, emptyAddendum()],
                            })
                          }
                        >
                          <PlusIcon />
                        </button>
                      ) : null}
                      <span className="intake-head-count">{addenda.length}</span>
                    </div>
                  </div>
                  <div className="intake-rows-scroll flex flex-col gap-2">
                  {addenda.length === 0 ? (
                    <p className="text-[11px] text-[#9ca3af]">No addenda yet.</p>
                  ) : (
                    addenda.map((ad, adIndex) => (
                      <div
                        key={adIndex}
                        className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr_auto]"
                      >
                        <label className="intake-row">
                          <span className={labelClass}>#</span>
                          <input
                            className={inputClass}
                            disabled={!editable}
                            value={ad.number ?? ""}
                            placeholder="2"
                            onChange={(e) => {
                              const next = addenda.map((row, i) =>
                                i === adIndex
                                  ? {
                                      ...row,
                                      number: e.target.value || null,
                                    }
                                  : row
                              );
                              patchInvitation(index, { addenda: next });
                            }}
                          />
                        </label>
                        <div className="intake-row">
                          <span className={labelClass}>Received</span>
                          <DatePicker
                            ariaLabel="Received"
                            className={inputClass}
                            disabled={!editable}
                            value={ad.receivedAt?.slice(0, 10) ?? ""}
                            onChange={(v) => {
                              const next = addenda.map((row, i) =>
                                i === adIndex
                                  ? {
                                      ...row,
                                      receivedAt: v || null,
                                    }
                                  : row
                              );
                              patchInvitation(index, { addenda: next });
                            }}
                          />
                        </div>
                        <label className="intake-row">
                          <span className={labelClass}>Notes</span>
                          <input
                            className={inputClass}
                            disabled={!editable}
                            value={ad.notes ?? ""}
                            onChange={(e) => {
                              const next = addenda.map((row, i) =>
                                i === adIndex
                                  ? {
                                      ...row,
                                      notes: e.target.value || null,
                                    }
                                  : row
                              );
                              patchInvitation(index, { addenda: next });
                            }}
                          />
                        </label>
                        {editable ? (
                          <button
                            type="button"
                            aria-label="Remove addendum"
                            title="Remove addendum"
                            className={`${removeBtnClass} ml-auto self-end`}
                            onClick={() => {
                              void (async () => {
                                const ok = await confirmDialog({
                                  title: "Remove addendum?",
                                  message:
                                    "Remove this addendum from the invitation?",
                                  confirmLabel: "Remove",
                                  variant: "danger",
                                });
                                if (!ok) return;
                                patchInvitation(index, {
                                  addenda: addenda.filter(
                                    (_, i) => i !== adIndex
                                  ),
                                });
                              })();
                            }}
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                  </div>
                </div>

                {editable && invitations.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Remove invitation"
                    title="Remove invitation"
                    className={`${removeBtnClass} col-span-full justify-self-end`}
                    onClick={() => {
                      void (async () => {
                        const ok = await confirmDialog({
                          title: "Remove invitation?",
                          message: "Remove this invitation row?",
                          confirmLabel: "Remove",
                          variant: "danger",
                        });
                        if (!ok) return;
                        setInvitations(
                          invitations.filter((_, i) => i !== index)
                        );
                      })();
                    }}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
        </div>
      </section>

      <div className="flex h-full max-h-full min-h-0 min-w-0 flex-col gap-6 overflow-hidden">
      <section className="intake-section min-w-0 shrink-0">
        <div className={sectionHead}>
          Who else is bidding?
        </div>
        <div className={`${sectionBody} flex flex-col gap-2`}>
        {needsWhoElseResearch ? (
          <p className="rounded border border-amber-500/30 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-[#4b5563]">
            {bid.workflow?.completeBlockedReason ||
              "Researched is required to hand off when there are fewer than two invitations."}
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
          <input
            type="checkbox"
            disabled={!editable}
            checked={whoElse.researched === true}
            onChange={(e) =>
              setField("whoElseBidding", {
                ...whoElse,
                researched: e.target.checked,
              })
            }
          />
          <span className="font-medium">
            Researched
            {needsWhoElseResearch ? " (required for handoff)" : ""}
          </span>
        </label>
        <label className="intake-row">
          <span className={labelClass}>Notes</span>
          <textarea
            className={`${inputClass} min-h-[4.5rem] resize-y`}
            disabled={!editable}
            value={whoElse.notes ?? ""}
            placeholder="e.g. Called Clark — two other mechanicals"
            onChange={(e) =>
              setField("whoElseBidding", {
                ...whoElse,
                notes: e.target.value || null,
              })
            }
          />
        </label>
        </div>
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {renderPartySection("mechanicalEngineer", "Mechanical", "mechanical")}
      </div>
      </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-2 xl:gap-6">
      <section className="intake-section min-w-0">
        <div className="intake-section-head-bar">
          <div>
            <h3>Project document hub</h3>
          </div>
          <span className="intake-head-count">{documentLinks.length}</span>
          {editable ? (
            <button
              type="button"
              className={addBtnClass}
              aria-label="Add document link"
              title="Add document link"
              onClick={() =>
                setField("documentLinks", [
                  ...documentLinks,
                  emptyDocLink(),
                ])
              }
            >
              <PlusIcon />
            </button>
          ) : null}
        </div>
        <div className={`${sectionBody} intake-layer-scroll flex flex-col gap-2`}>
          {documentLinks.map((link, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <input
                className={inputClass}
                disabled={!editable}
                placeholder="O-drive / portal / document URL"
                value={link.url}
                onChange={(e) => {
                  const next = documentLinks.map((l, i) =>
                    i === index ? { ...l, url: e.target.value } : l
                  );
                  setField("documentLinks", next);
                }}
              />
              <input
                className={inputClass}
                disabled={!editable}
                placeholder="Label"
                value={link.label ?? ""}
                onChange={(e) => {
                  const next = documentLinks.map((l, i) =>
                    i === index
                      ? { ...l, label: e.target.value || null }
                      : l
                  );
                  setField("documentLinks", next);
                }}
              />
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#4b5563]">
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={link.checkAddenda === true}
                  onChange={(e) => {
                    const next = documentLinks.map((l, i) =>
                      i === index
                        ? { ...l, checkAddenda: e.target.checked }
                        : l
                    );
                    setField("documentLinks", next);
                  }}
                />
                Check addenda
              </label>
              {editable && documentLinks.length > 1 ? (
                <button
                  type="button"
                  aria-label="Remove link"
                  title="Remove link"
                  className={`${removeBtnClass} ml-auto justify-self-end`}
                  onClick={() => {
                    void (async () => {
                      const ok = await confirmDialog({
                        title: "Remove document link?",
                        message: "Remove this owner / federal document link?",
                        confirmLabel: "Remove",
                        variant: "danger",
                      });
                      if (!ok) return;
                      const next = documentLinks.filter((_, i) => i !== index);
                      setField(
                        "documentLinks",
                        next.length > 0 ? next : [emptyDocLink()]
                      );
                    })();
                  }}
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="intake-section min-w-0">
        <div className="intake-section-head-bar">
          <div>
            <h3>Contract chain</h3>
          </div>
          <span className="intake-head-count">{tiers.length}</span>
          {editable ? (
            <button
              type="button"
              className={addBtnClass}
              aria-label="Add contract layer"
              title="Add contract layer"
              onClick={() => setTiers([...tiers, emptyTier()])}
            >
              <PlusIcon />
            </button>
          ) : null}
        </div>
        <div className={`${sectionBody} intake-layer-scroll flex flex-col gap-2`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-[#6b7280]">
                  <th className="px-2 py-1.5 font-semibold">Role</th>
                  <th className="px-2 py-1.5 font-semibold">Company</th>
                  <th className="px-2 py-1.5 font-semibold">Has job?</th>
                  <th className="px-2 py-1.5 font-semibold">Invited us</th>
                  <th className="px-2 py-1.5 font-semibold">Paying</th>
                  {editable ? <th className="px-2 py-1.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, index) => (
                  <tr
                    key={`${t.sortOrder}-${index}`}
                    className="border-t border-ink/[0.06]"
                  >
                    <td className="px-1.5 py-1.5">
                      <div className="relative">
                        <select
                          className={selectClass}
                          disabled={!editable}
                          value={t.role ?? ""}
                          onChange={(e) =>
                            patchTier(index, { role: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {tierRoles.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <SelectChevron />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={t.company ?? ""}
                        onChange={(e) =>
                          patchTier(index, {
                            company: e.target.value || null,
                          })
                        }
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="relative">
                        <select
                          className={selectClass}
                          disabled={!editable}
                          value={
                            t.hasTheJob == null
                              ? ""
                              : t.hasTheJob
                                ? "yes"
                                : "no"
                          }
                          onChange={(e) =>
                            patchTier(index, {
                              hasTheJob:
                                e.target.value === ""
                                  ? null
                                  : e.target.value === "yes",
                            })
                          }
                        >
                          <option value="">?</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                        <SelectChevron />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={Boolean(t.invitedUs)}
                        onChange={(e) =>
                          patchTier(index, { invitedUs: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={Boolean(t.isPaying)}
                        onChange={(e) =>
                          patchTier(index, { isPaying: e.target.checked })
                        }
                      />
                    </td>
                    {editable && tiers.length > 1 ? (
                      <td className="px-1.5 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label="Remove row"
                          title="Remove row"
                          className={removeBtnClass}
                          onClick={() => {
                            void (async () => {
                              const ok = await confirmDialog({
                                title: "Remove contract layer?",
                                message: "Remove this contract chain layer?",
                                confirmLabel: "Remove",
                                variant: "danger",
                              });
                              if (!ok) return;
                              setTiers(
                                tiers
                                  .filter((_, i) => i !== index)
                                  .map((row, i) => ({ ...row, sortOrder: i }))
                              );
                            })();
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    ) : editable ? (
                      <td className="px-1.5 py-1.5" />
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      </div>

      <BidAttachmentsSection
        title="Plans, specs, and invitation"
        labels={["drawings", "specifications", "invitation"]}
        attachments={(bid.attachments ?? []).filter(
          (a) =>
            a.category !== "takeoff_markup" &&
            (a.label === "drawings" || a.label === "specifications" || a.label === "invitation" || !a.label)
        )}
        isEditable={editable}
        uploading={saving}
        onUpload={async (file, opts) => uploadAttachment(file, opts)}
        onUploadMany={async (files, opts) => uploadAttachments(files, opts)}
        onDelete={async (id) => deleteAttachment(id)}
      />
      <BidAttachmentsSection
        title="Addenda"
        labels={["addenda"]}
        attachments={(bid.attachments ?? []).filter((a) => a.label === "addenda")}
        isEditable={editable}
        uploading={saving}
        onUpload={async (file, opts) => uploadAttachment(file, opts)}
        onUploadMany={async (files, opts) => uploadAttachments(files, opts)}
        onDelete={async (id) => deleteAttachment(id)}
      />
    </div>
  );
}
