"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import { PartyNameCombobox } from "@/components/bidding/PartyNameCombobox";
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
import type { BidListItem } from "@/lib/bidding/types";
import { newId } from "@/lib/bidding/newId";

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
  };
}

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
  const { setBidHeader } = useBidSheet();
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
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [dupHits, setDupHits] = useState<BidListItem[]>([]);
  const [dupSearching, setDupSearching] = useState(false);
  const [linkingDupId, setLinkingDupId] = useState<string | null>(null);
  const [linkDupError, setLinkDupError] = useState<string | null>(null);
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
    role: "owner" | "architect" | "mechanical"
  ) {
    const p = party(draft[key] as ProcessParty);
    const isMechanical = key === "mechanicalEngineer";
    return (
      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-semibold text-ink">{title}</h3>
        <p className="sm:col-span-2 -mt-1 text-xs text-ink/45">
          {isMechanical
            ? "Pick from saved list — also fills the first invitation. Or type a new name."
            : "Pick from saved list, or type a new name."}
        </p>
        <PartyNameCombobox
          label="Name"
          value={p.name ?? ""}
          options={partiesByRole[role]}
          disabled={!editable}
          inputClass={inputClass}
          labelClass={labelClass}
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
        {(
          [
            ["company", "Company"],
            ["contactName", "Contact name"],
            ["email", "Email"],
            ["phone", "Phone"],
          ] as const
        ).map(([f, label]) => (
          <label key={f} className="flex flex-col gap-1">
            <span className={labelClass}>{label}</span>
            <input
              className={inputClass}
              disabled={!editable}
              value={String(p[f] ?? "")}
              onChange={(e) => setParty(key, f, e.target.value)}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Preferred contact</span>
          <select
            className={inputClass}
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
        </label>
        <label className="flex flex-col gap-1">
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Intake</h2>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? (dirty ? "Unsaved changes" : "Save to keep changes") : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {dupHits.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/60 px-4 py-3">
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

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Bid / estimate #</span>
          <input
            className={inputClass}
            disabled
            value={bid.estimateNumber ?? ""}
            readOnly
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Bid type (mandatory)</span>
          <select
            className={inputClass}
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
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
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
        <label className="flex flex-col gap-1">
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
        <label className="flex flex-col gap-1">
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
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Due date</span>
          <input
            type="date"
            className={inputClass}
            disabled={!editable}
            value={draft.dueDate ?? ""}
            onChange={(e) => setField("dueDate", e.target.value || null)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Due time</span>
          <input
            type="time"
            className={inputClass}
            disabled={!editable}
            value={draft.dueTime ?? ""}
            onChange={(e) => setField("dueTime", e.target.value || null)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Work type</span>
          <select
            className={inputClass}
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
        </label>
        <label className="flex flex-col gap-1">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-sm font-semibold text-ink">
            Project address
          </h3>
          <p className="sm:col-span-2 -mt-1 text-xs text-ink/45">
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
              className={`flex flex-col gap-1 ${k === "line1" ? "sm:col-span-2" : ""}`}
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
        {renderPartySection("owner", "Owner", "owner")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderPartySection("architect", "Architect", "architect")}
        {renderPartySection("mechanicalEngineer", "Mechanical", "mechanical")}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Invitations</h3>
            <p className="text-xs text-ink/45">
              Company first, then contacts. Selecting a contact also fills
              Mechanical. Many vendors → many rows, one bid.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand/40 hover:text-brand"
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
              <div
                key={inv.id ?? index}
                className="grid gap-3 rounded-xl border border-ink/[0.06] bg-canvas/30 p-3 sm:grid-cols-2"
              >
                <PartyNameCombobox
                  label="Company"
                  value={company}
                  options={inviteCompanyOptions}
                  disabled={!editable}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  placeholder="Which company sent the invite…"
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
                    })
                  }
                />
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Received</span>
                  <input
                    type="date"
                    className={inputClass}
                    disabled={!editable}
                    value={inv.receivedAt?.slice(0, 10) ?? ""}
                    onChange={(e) =>
                      patchInvitation(index, {
                        receivedAt: e.target.value || null,
                      })
                    }
                  />
                </label>
                <PartyNameCombobox
                  label="Contact name"
                  value={inv.contact?.name ?? ""}
                  options={contactOptions}
                  disabled={!editable}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  showPicker
                  placeholder={
                    company
                      ? "Search contacts at this company…"
                      : "Search or type new contact…"
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
                <label className="flex flex-col gap-1">
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
                <label className="flex flex-col gap-1">
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
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Preferred contact</span>
                  <select
                    className={inputClass}
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
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Preferred value</span>
                  <input
                    className={inputClass}
                    disabled
                    readOnly
                    value={preferredContactValue(inv.contact ?? {})}
                    placeholder="Matches email or phone"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
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
                <label className="flex flex-col gap-1 sm:col-span-2">
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
                <label className="flex flex-col gap-1 sm:col-span-2">
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

                <div className="sm:col-span-2 flex flex-col gap-2 rounded-lg border border-ink/[0.05] bg-surface/60 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink/60">
                      Addenda from this inviter
                    </span>
                    {editable ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand hover:underline"
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
                    <p className="text-xs text-ink/40">No addenda yet.</p>
                  ) : (
                    addenda.map((ad, adIndex) => (
                      <div
                        key={adIndex}
                        className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr_auto]"
                      >
                        <label className="flex flex-col gap-1">
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
                        <label className="flex flex-col gap-1">
                          <span className={labelClass}>Received</span>
                          <input
                            type="date"
                            className={inputClass}
                            disabled={!editable}
                            value={ad.receivedAt?.slice(0, 10) ?? ""}
                            onChange={(e) => {
                              const next = addenda.map((row, i) =>
                                i === adIndex
                                  ? {
                                      ...row,
                                      receivedAt: e.target.value || null,
                                    }
                                  : row
                              );
                              patchInvitation(index, { addenda: next });
                            }}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
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
                            className="ml-auto flex shrink-0 items-center self-end rounded-md p-1.5 pb-2 text-danger/70 hover:text-danger"
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

                {editable && invitations.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Remove invitation"
                    title="Remove invitation"
                    className="flex shrink-0 items-center justify-self-end rounded-md p-1.5 text-danger/70 hover:text-danger sm:col-span-2"
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
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Who else is bidding?
          </h3>
          <p className="text-xs text-ink/45">
            Call GC / architect / ME. Do not ask the inviter.
          </p>
        </div>
        {needsWhoElseResearch ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-50/50 px-3 py-2 text-xs text-ink/65">
            {bid.workflow?.completeBlockedReason ||
              "Researched is required to hand off when there are fewer than two invitations."}
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-ink">
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
        <label className="flex flex-col gap-1">
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

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Owner / federal links
            </h3>
            <p className="text-xs text-ink/45">
              Public owner set + extras — more than one OK.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand/40 hover:text-brand"
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
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <input
                className={inputClass}
                disabled={!editable}
                placeholder="URL"
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
              <label className="inline-flex items-center gap-1.5 text-xs text-ink/70">
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
              {editable ? (
                <button
                  type="button"
                  aria-label="Remove link"
                  title="Remove link"
                  className="ml-auto flex shrink-0 items-center justify-self-end rounded-md p-1.5 text-danger/70 hover:text-danger"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirmDialog({
                        title: "Remove document link?",
                        message: "Remove this owner / federal document link?",
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
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Contract chain</h3>
            <p className="text-xs text-ink/45">
              Optional. Add only the layers you know (owner → … → us). Direct to
              owner is fine — mechanical not required.
            </p>
          </div>
          {editable ? (
            <button
              type="button"
              className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-brand/40 hover:text-brand"
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
                <tr className="text-xs text-ink/50">
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
                      <select
                        className={inputClass}
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
                      <select
                        className={inputClass}
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

      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              GCs / mechanicals
            </h3>
            <p className="mt-0.5 text-xs text-ink/45">
              Same opportunity — company + flags. Deeper follow-up stays on
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
          <div key={key} className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {title}
              </p>
              {editable ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand hover:underline"
                  onClick={() => setList([...list, emptyGcOrMech()])}
                >
                  + Add
                </button>
              ) : null}
            </div>
            {list.length === 0 ? (
              <p className="mt-1 text-sm text-ink/40">None yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {list.map((row, index) => (
                  <li
                    key={`${key}-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/[0.06] px-3 py-2"
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
                    <label className="flex items-center gap-1.5 text-xs text-ink/70">
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
                    <label className="flex items-center gap-1.5 text-xs text-ink/70">
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
                        className="text-xs font-medium text-danger/80 hover:text-danger"
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <p className="text-xs text-ink/45">
        Docs: upload invitation / drawings / specs / addenda as bid attachments
        (`label=invitation|drawings|specifications|addenda`), then put ids on
        the invitation row. GCs / mechanicals above stay light — Post-Bid for
        follow-up.
      </p>
    </div>
  );
}
