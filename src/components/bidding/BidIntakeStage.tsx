"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import { PartyNameCombobox } from "@/components/bidding/PartyNameCombobox";
import { BidAdditionalDetailsSection } from "@/components/bidding/BidAdditionalDetailsSection";
import { BidAttachmentsSection } from "@/components/bidding/BidAttachmentsSection";
import { TimePicker } from "@/components/ui/TimePicker";
import { DatePicker } from "@/components/ui/DatePicker";
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

/** Jump targets for the Intake section index (right rail).
 *  `observe` lists DOM ids that count toward this nav item (side-by-side pairs share one). */
const INTAKE_JUMP_LINKS = [
  { id: "intake-bid", label: "Bid", observe: ["intake-bid"] },
  {
    id: "intake-address",
    label: "Address / Owner",
    observe: ["intake-address", "intake-owner"],
  },
  {
    id: "intake-architect",
    label: "Architect / Mech",
    observe: ["intake-architect", "intake-mechanical"],
  },
  { id: "intake-invitations", label: "Invitations", observe: ["intake-invitations"] },
  {
    id: "intake-who",
    label: "Who else / Documents",
    observe: ["intake-who", "intake-documents"],
  },
  { id: "intake-chain", label: "Contract chain", observe: ["intake-chain"] },
  { id: "intake-gcs", label: "GCs / mechanicals", observe: ["intake-gcs"] },
  {
    id: "intake-additional",
    label: "Additional details",
    observe: ["intake-additional"],
  },
  { id: "intake-sales", label: "Sales activities", observe: ["intake-sales"] },
  {
    id: "intake-attachments",
    label: "Attachments",
    observe: ["intake-attachments"],
  },
] as const;

/** App header (~3.75rem) + sticky stage tabs (~2.75rem). */
const INTAKE_SECTION_SCROLL_MT = "scroll-mt-28 sm:scroll-mt-[6.5rem]";

/** Matches intake-mockups.html option 2 (two-column sheet + right index). */
const INTAKE_CARD =
  "min-w-0 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:p-6";
const INTAKE_SHEET_WIDE = "lg:col-span-2";
const INTAKE_SECTION_TITLE = "text-[15px] font-semibold text-ink";
const INTAKE_SECTION_HINT = "text-xs font-normal text-ink/50";
const INTAKE_GHOST =
  "rounded-xl border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-brand/45 hover:text-orange-800";
const INTAKE_NESTED =
  "rounded-xl border border-ink/[0.06] bg-[#fafafa] p-4 sm:p-5";
const INTAKE_FIELD_GRID_4 = "grid gap-x-4 gap-y-5 lg:grid-cols-4";
const INTAKE_MINI =
  "mt-3 mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/45";

function scrollToIntakeSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
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
  const { setBidHeader, uploadAttachment, deleteAttachment } = useBidSheet();
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
    inputClass,
    labelClass,
  } = useProcessDraft();
  const selectClass = `${inputClass} appearance-none pr-9`;
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
  const [activeJump, setActiveJump] = useState<string>(INTAKE_JUMP_LINKS[0].id);

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

  useEffect(() => {
    if (!bid) return;
    const observeIds = INTAKE_JUMP_LINKS.flatMap((l) => [...l.observe]);
    const nodes = observeIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (nodes.length === 0 || typeof IntersectionObserver === "undefined") return;

    // Track all currently visible section ids — IO callbacks only include *changed*
    // entries. Side-by-side cards map to one nav item via `observe`.
    const visible = new Set<string>();
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = INTAKE_JUMP_LINKS.find((l) =>
          l.observe.some((id) => visible.has(id))
        );
        if (first) setActiveJump(first.id);
      },
      { root: null, rootMargin: "-120px 0px -55% 0px", threshold: [0, 0.1, 0.25] }
    );
    nodes.forEach((n) => spy.observe(n));
    return () => spy.disconnect();
  }, [bid]);

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

  const documentLinks: ProcessDocumentLink[] = draft.documentLinks ?? [];
  /** Optional — start empty; user adds layers as needed (not mandatory). */
  const tiers: ProcessContractTier[] = draft.contractTiers ?? [];
  const inviteCompanyOptions = companyOptionsFromParties(
    partiesByRole.invite_contact
  );
  const whoElse = draft.whoElseBidding ?? {};
  const needsWhoElseResearch = invitations.length < 2;

  const emptyTier = (): ProcessContractTier => ({
    sortOrder: tiers.length,
    role: tiers.length === 0 ? "owner" : null,
    company: null,
    hasTheJob: null,
    invitedUs: false,
    isPaying: tiers.length === 0,
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
    setField("contractTiers", next);
  };

  const patchTier = (index: number, patch: Partial<ProcessContractTier>) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const gcs: ProcessGcOrMech[] = draft.generalContractors ?? [];
  const mechs: ProcessGcOrMech[] = draft.mechanicals ?? [];

  const setGcs = (next: ProcessGcOrMech[]) => {
    setField("generalContractors", next);
  };
  const setMechs = (next: ProcessGcOrMech[]) => {
    setField("mechanicals", next);
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
    role: "owner" | "architect" | "mechanical",
    sectionId?: string
  ) {
    const p = party(draft[key] as ProcessParty);
    const isMechanical = key === "mechanicalEngineer";
    return (
      <section
        id={sectionId}
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_CARD} grid gap-x-4 gap-y-5 sm:grid-cols-2`}
      >
        <h3 className={`col-span-full ${INTAKE_SECTION_TITLE}`}>{title}</h3>
        <p className={`col-span-full ${INTAKE_SECTION_HINT}`}>
          {isMechanical
            ? "Pick from saved list — also fills the first invitation. Or type a new name."
            : "Pick from saved list, or type a new name."}
        </p>
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
          <label key={f} className="flex flex-col gap-1.5">
            <span className={labelClass}>{label}</span>
            <input
              className={inputClass}
              disabled={!editable}
              value={String(p[f] ?? "")}
              onChange={(e) => setParty(key, f, e.target.value)}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Preferred value</span>
          <input
            className={inputClass}
            disabled
            readOnly
            value={preferredContactValue(p)}
            placeholder="Matches email or phone above"
          />
        </label>
      </section>
    );
  }

  const intakeJumpNav = (
    <>
      {INTAKE_JUMP_LINKS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-current={activeJump === l.id ? "true" : undefined}
          className={`border-l-2 py-1.5 pl-3 text-left text-[13px] font-medium transition ${
            activeJump === l.id
              ? "border-brand font-semibold text-ink"
              : "border-transparent text-ink/40 hover:text-ink/70"
          }`}
          onClick={() => {
            setActiveJump(l.id);
            scrollToIntakeSection(l.id);
          }}
        >
          {l.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="w-full min-w-0">
      <nav
        className="mb-3 flex flex-row flex-wrap gap-x-3.5 gap-y-2 lg:hidden"
        aria-label="Intake sections"
      >
        {intakeJumpNav}
      </nav>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_9.25rem] lg:gap-7">
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
      <p className={`${INTAKE_SHEET_WIDE} mb-0 text-xs text-ink/50`}>
        {saving ? "Saving…" : editable ? (dirty ? "Unsaved changes" : "Save to keep changes") : "Read only"}
      </p>

      {error ? (
        <p className={`${INTAKE_SHEET_WIDE} rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger`}>
          {error}
        </p>
      ) : null}

      {dupHits.length > 0 ? (
        <div className={`${INTAKE_SHEET_WIDE} rounded-2xl border border-amber-500/30 bg-amber-50/60 px-4 py-3`}>
          <p className="text-sm font-semibold text-ink">
            Possible same opportunity
            {dupSearching ? "…" : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink/55">
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
                  className="text-sm font-medium text-brand hover:underline"
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
                    className="text-xs font-semibold text-ink/70 underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
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

      <section
        id="intake-bid"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_SHEET_WIDE} ${INTAKE_CARD} grid gap-x-4 gap-y-5 lg:grid-cols-4`}
      >
        <div className="col-span-full mb-0.5 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className={INTAKE_SECTION_TITLE}>Bid</h3>
            <p className={INTAKE_SECTION_HINT}>
              Incomplete save is OK. Bid type is required to hand off.
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Bid / estimate #</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={bid.estimateNumber ?? ""}
            onChange={(e) => setBidHeader({ estimateNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Bid type (mandatory)</span>
          <div className="relative">
            <select
              className={selectClass}
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
        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className={labelClass}>
            Bid name (architect name on drawings)
          </span>
          <input
            className={inputClass}
            disabled={!editable}
            value={draft.drawingName ?? bid.bidName ?? ""}
            onChange={(e) => setDrawingName(e.target.value)}
            placeholder="e.g. Weinberg USP 800 Pharmacy"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Drawing category</span>
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
              {(meta?.drawingCategories ?? []).map((id) => (
                <option key={id} value={id}>
                  {meta?.drawingCategoryLabels?.[id] ?? id}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
          {draft.drawingCategory && meta?.drawingCategoryPercents?.[draft.drawingCategory] ? (
            <p className="text-[10px] text-ink/40">
              {meta.drawingCategoryPercents[draft.drawingCategory]} design completeness
            </p>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Engineer of Record — mechanical</span>
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
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Due date</span>
          <DatePicker
            ariaLabel="Due date"
            className={inputClass}
            disabled={!editable}
            value={draft.dueDate ?? ""}
            onChange={(v) => setField("dueDate", v || null)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Due time</span>
          <TimePicker
            ariaLabel="Due time"
            className="w-full"
            disabled={!editable}
            value={draft.dueTime}
            onChange={(v) => setField("dueTime", v)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Impacted SF</span>
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
          <span className="text-[10px] text-ink/40">
            Life-safety renovated area — not whole-building GSF
          </span>
        </label>
        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className={labelClass}>Entity rule (suggests company)</span>
          <p className="flex min-h-12 items-center rounded-xl border border-[#D0D5DD] bg-surface px-4 text-[15px] text-ink/70 dark:border-ink/15">
            {draft.entityRule?.suggestedOurEntity
              ? `Suggests ${draft.entityRule.suggestedOurEntity.replace(/_/g, " ")}`
              : "Pick company on the bid header — rule only suggests"}
          </p>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Related / rebid bid ID</span>
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
                className="shrink-0 self-center text-sm font-medium text-brand hover:underline"
              >
                Open
              </Link>
            ) : null}
          </div>
        </label>
      </section>

        <section
          id="intake-address"
          className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_CARD} grid gap-x-4 gap-y-5 sm:grid-cols-2`}
        >
          <h3 className={`col-span-full ${INTAKE_SECTION_TITLE}`}>
            Project address
          </h3>
          <p className={`col-span-full ${INTAKE_SECTION_HINT}`}>
            Paste the full US line in Address line 1 — backend fills city / state /
            ZIP when those are empty. Do not clear line 1.
          </p>
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
              className={`flex flex-col gap-1.5 ${k === "line1" || k === "line2" ? "col-span-full" : ""}`}
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
        </section>
        {renderPartySection("owner", "Owner", "owner", "intake-owner")}
        {renderPartySection("architect", "Architect", "architect", "intake-architect")}
        {renderPartySection("mechanicalEngineer", "Mechanical", "mechanical", "intake-mechanical")}

      <section
        id="intake-invitations"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_SHEET_WIDE} ${INTAKE_CARD} flex flex-col gap-5`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className={INTAKE_SECTION_TITLE}>Invitations</h3>
            <p className={INTAKE_SECTION_HINT}>
              Company first, then contacts. Many vendors → many rows, one bid.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className={INTAKE_GHOST}
              onClick={() =>
                setInvitations([...invitations, emptyInvitation()])
              }
            >
              + Add invitation
            </button>
          ) : null}
        </div>
        {invitations.length === 0 ? (
          <p className="text-sm text-ink/45">No invitations yet.</p>
        ) : (
          invitations.map((inv, index) => {
            const company = inv.contact?.company ?? "";
            const contactOptions = contactsForCompany(
              partiesByRole.invite_contact,
              company
            );
            const addenda = inv.addenda ?? [];
            return (
              <article
                key={inv.id ?? index}
                className={`${INTAKE_NESTED} flex flex-col gap-5`}
              >
                <div className={INTAKE_FIELD_GRID_4}>
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
                  <label className="flex flex-col gap-1.5">
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
                  </label>
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
                  <label className="flex flex-col gap-1.5">
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
                  <label className="flex flex-col gap-1.5">
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
                  <label className="flex flex-col gap-1.5">
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
                  <label className="flex flex-col gap-1.5 lg:col-span-2">
                    <span className={labelClass}>Preferred value</span>
                    <input
                      className={inputClass}
                      disabled
                      readOnly
                      value={preferredContactValue(inv.contact ?? {})}
                      placeholder="Matches email or phone"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 lg:col-span-4">
                    <span className={labelClass}>
                      Invitation email (paste full)
                    </span>
                    <textarea
                      className={`${inputClass} min-h-[4.5rem] resize-y`}
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
                  <label className="flex flex-col gap-1.5 lg:col-span-2">
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
                  <label className="flex flex-col gap-1.5 lg:col-span-2">
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
                </div>

                <div className="rounded-xl border border-ink/[0.06] bg-canvas/40 p-2.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">
                      Addenda from this inviter
                    </span>
                    {editable ? (
                      <button
                        type="button"
                        className={INTAKE_GHOST}
                        onClick={() =>
                          patchInvitation(index, {
                            addenda: [...addenda, emptyAddendum()],
                          })
                        }
                      >
                        + Add addendum
                      </button>
                    ) : null}
                  </div>
                  {addenda.length === 0 ? (
                    <p className={INTAKE_SECTION_HINT}>No addenda yet.</p>
                  ) : (
                    addenda.map((ad, adIndex) => (
                      <div
                        key={adIndex}
                        className="mb-2 grid gap-x-4 gap-y-5 last:mb-0 lg:grid-cols-3"
                      >
                        <label className="flex flex-col gap-1.5">
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
                        <label className="flex flex-col gap-1.5">
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
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={labelClass}>Notes</span>
                            {editable ? (
                              <button
                                type="button"
                                aria-label="Remove addendum"
                                title="Remove addendum"
                                className="text-xs font-semibold text-red-700/80 hover:text-red-700"
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
                                Remove
                              </button>
                            ) : null}
                          </div>
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
                      </div>
                    ))
                  )}
                </div>

                {editable && invitations.length > 1 ? (
                  <button
                    type="button"
                    className="self-end text-xs font-semibold text-red-700/80 hover:text-red-700"
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
                    Remove invitation
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      <section
        id="intake-who"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_CARD} flex flex-col gap-5`}
      >
        <div>
          <h3 className={INTAKE_SECTION_TITLE}>Who else is bidding?</h3>
          <p className={INTAKE_SECTION_HINT}>
            Call GC / architect / ME. Do not ask the inviter. Researched is
            required to hand off when there are fewer than two invitations.
          </p>
        </div>
        {needsWhoElseResearch ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-50/50 px-3 py-2 text-xs text-ink/65">
            {bid.workflow?.completeBlockedReason ||
              "Researched is required to hand off when there are fewer than two invitations."}
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
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
          <span>
            Researched
            {needsWhoElseResearch ? " (required for handoff)" : ""}
          </span>
        </label>
        <label className="mt-1 flex flex-col gap-1.5">
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
      </section>

      <section
        id="intake-documents"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_CARD} flex flex-col gap-5`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className={INTAKE_SECTION_TITLE}>Project document hub</h3>
            <p className={INTAKE_SECTION_HINT}>
              Owner, federal, portal, and other links. Upload files in
              Attachments.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className={INTAKE_GHOST}
              onClick={() =>
                setField("documentLinks", [
                  ...documentLinks,
                  emptyDocLink(),
                ])
              }
            >
              + Add link
            </button>
          ) : null}
        </div>
        {documentLinks.length === 0 ? (
          <p className="text-sm text-ink/45">No owner links yet.</p>
        ) : (
          documentLinks.map((link, index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>URL</span>
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
                </label>
                <label className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={labelClass}>Label</span>
                    {editable ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-700/80 hover:text-red-700"
                        onClick={() => {
                          void (async () => {
                            const ok = await confirmDialog({
                              title: "Remove document link?",
                              message:
                                "Remove this owner / federal document link?",
                              confirmLabel: "Remove",
                              variant: "danger",
                            });
                            if (!ok) return;
                            setField(
                              "documentLinks",
                              documentLinks.filter((_, i) => i !== index)
                            );
                          })();
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
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
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
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
            </div>
          ))
        )}
      </section>

      <section
        id="intake-chain"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_SHEET_WIDE} ${INTAKE_CARD} flex flex-col gap-5`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className={INTAKE_SECTION_TITLE}>Contract chain</h3>
            <p className={INTAKE_SECTION_HINT}>
              Optional. Add only the layers you know (owner → … → us). Direct to
              owner is fine — mechanical not required.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className={INTAKE_GHOST}
              onClick={() => setTiers([...tiers, emptyTier()])}
            >
              + Add layer
            </button>
          ) : null}
        </div>
        {tiers.length === 0 ? (
          <p className="text-sm text-ink/45">
            No layers yet — not required to hand off.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink/45">
                  <th className="px-1.5 py-1.5 font-semibold">Role</th>
                  <th className="px-1.5 py-1.5 font-semibold">Company</th>
                  <th className="px-1.5 py-1.5 font-semibold">Has job?</th>
                  <th className="px-1.5 py-1.5 font-semibold">Invited us</th>
                  <th className="px-1.5 py-1.5 font-semibold">Paying</th>
                  {editable ? <th className="px-1.5 py-1.5" /> : null}
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
                    {editable ? (
                      <td className="px-1.5 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label="Remove row"
                          title="Remove row"
                          className="inline-flex shrink-0 items-center rounded-md p-1.5 text-danger/70 hover:text-danger"
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
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        id="intake-gcs"
        className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_SHEET_WIDE} ${INTAKE_CARD} flex flex-col gap-5`}
      >
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={INTAKE_SECTION_TITLE}>GCs / mechanicals</h3>
            <p className={`mt-0.5 ${INTAKE_SECTION_HINT}`}>
              Same opportunity. Company and flags. Deeper follow-up stays on
              Post-Bid.
            </p>
          </div>
        </div>
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
              title: "Mechanicals",
              list: mechs,
              setList: setMechs,
            },
          ] as const
        ).map(({ key, title, list, setList }) => (
          <div key={key}>
            <p className={`${INTAKE_MINI} flex flex-wrap items-center gap-2`}>
              {title}
              {editable ? (
                <button
                  type="button"
                  className={INTAKE_GHOST}
                  onClick={() => setList([...list, emptyGcOrMech()])}
                >
                  + Add
                </button>
              ) : null}
            </p>
            {list.length === 0 ? (
              <p className="text-sm text-ink/40">None yet.</p>
            ) : (
              <div className="space-y-3">
                {list.map((row, index) => (
                  <div key={`${key}-${index}`} className={INTAKE_FIELD_GRID_4}>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Company</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
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
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Contact name</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={row.contactName ?? ""}
                        onChange={(e) => {
                          const contactName = e.target.value || null;
                          setList(
                            list.map((r, i) =>
                              i === index ? { ...r, contactName } : r
                            )
                          );
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Email</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={row.email ?? ""}
                        onChange={(e) => {
                          const email = e.target.value || null;
                          setList(
                            list.map((r, i) =>
                              i === index ? { ...r, email } : r
                            )
                          );
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Phone</span>
                      <input
                        className={inputClass}
                        disabled={!editable}
                        value={row.phone ?? ""}
                        onChange={(e) => {
                          const phone = e.target.value || null;
                          setList(
                            list.map((r, i) =>
                              i === index ? { ...r, phone } : r
                            )
                          );
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Bid price</span>
                      <input
                        type="number"
                        className={inputClass}
                        disabled={!editable}
                        placeholder="Bid price"
                        value={row.bidPrice ?? ""}
                        onChange={(e) => {
                          const bidPrice =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          setList(
                            list.map((r, i) =>
                              i === index ? { ...r, bidPrice } : r
                            )
                          );
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Contractor status</span>
                      <div className="relative">
                        <select
                          className={selectClass}
                          disabled={!editable}
                          value={row.contractorStatus ?? ""}
                          onChange={(e) => {
                            const contractorStatus = (e.target.value ||
                              null) as ProcessGcOrMech["contractorStatus"];
                            setList(
                              list.map((r, i) =>
                                i === index ? { ...r, contractorStatus } : r
                              )
                            );
                          }}
                        >
                          <option value="">—</option>
                          {CONTRACTOR_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <SelectChevron />
                      </div>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Proposal status</span>
                      <div className="relative">
                        <select
                          className={selectClass}
                          disabled={!editable}
                          value={row.proposalStatus ?? ""}
                          onChange={(e) => {
                            const proposalStatus = (e.target.value ||
                              null) as ProcessGcOrMech["proposalStatus"];
                            setList(
                              list.map((r, i) =>
                                i === index ? { ...r, proposalStatus } : r
                              )
                            );
                          }}
                        >
                          <option value="">—</option>
                          {PROPOSAL_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <SelectChevron />
                      </div>
                    </label>
                    <div className="flex flex-col justify-end gap-2 pb-1">
                      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
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
                                      hasTheJob: e.target.checked
                                        ? true
                                        : null,
                                    }
                                  : r
                              )
                            )
                          }
                        />
                        Has the job
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
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
                      {editable ? (
                        <button
                          type="button"
                          className="self-start text-xs font-semibold text-red-700/80 hover:text-red-700"
                          onClick={() => {
                            void (async () => {
                              const ok = await confirmDialog({
                                title:
                                  key === "gc"
                                    ? "Remove GC?"
                                    : "Remove mechanical?",
                                message: `Remove this ${key === "gc" ? "GC" : "mechanical"}?`,
                                confirmLabel: "Remove",
                                variant: "danger",
                              });
                              if (!ok) return;
                              setList(list.filter((_, i) => i !== index));
                            })();
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className={`${INTAKE_SHEET_WIDE} flex flex-col gap-5`}>
        <BidAdditionalDetailsSection
          additionalDetails={draft.additionalDetails ?? {}}
          salesActivities={draft.salesActivities ?? {}}
          onAdditionalDetailsChange={(next) => setField("additionalDetails", next)}
          onSalesActivitiesChange={(next) => setField("salesActivities", next)}
          disabled={!editable}
          additionalSectionId="intake-additional"
          salesSectionId="intake-sales"
          sectionScrollClassName={INTAKE_SECTION_SCROLL_MT}
        />
      </div>

      <div id="intake-attachments" className={`${INTAKE_SECTION_SCROLL_MT} ${INTAKE_SHEET_WIDE}`}>
        <BidAttachmentsSection
          attachments={(bid.attachments ?? []).filter((a) => a.label !== "drawings")}
          isEditable={editable}
          uploading={saving}
          onUpload={async (file, opts) => uploadAttachment(file, opts)}
          onDelete={async (id) => deleteAttachment(id)}
          cardClassName="ui-shadow-none border-ink/[0.08] p-4"
        />
      </div>
        </div>

        <nav
          className="sticky top-28 z-[15] hidden max-h-[calc(100dvh-8rem)] flex-col items-start gap-0.5 self-start overflow-y-auto pt-0.5 sm:top-[6.5rem] sm:max-h-[calc(100dvh-7.5rem)] lg:flex"
          aria-label="Intake sections"
        >
          {intakeJumpNav}
        </nav>
      </div>
    </div>
  );
}
