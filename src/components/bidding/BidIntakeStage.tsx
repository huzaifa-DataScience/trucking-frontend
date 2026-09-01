"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import { PartyNameCombobox } from "@/components/bidding/PartyNameCombobox";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import {
  bidKindOptionsFromMeta,
  tierRoleOptionsFromMeta,
  workTypeOptionsFromMeta,
  type ProcessContractTier,
  type ProcessDocumentLink,
  type ProcessInvitation,
  type ProcessInvitationAddendum,
  type ProcessMeta,
  type ProcessParty,
} from "@/lib/bidding/process-types";
import type { BidListItem } from "@/lib/bidding/types";

function party(p: ProcessParty | null | undefined): ProcessParty {
  return {
    name: p?.name ?? "",
    company: p?.company ?? "",
    contactName: p?.contactName ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
  };
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
    id: crypto.randomUUID(),
    receivedAt: null,
    contact: { name: null, email: null, phone: null, company: null },
    links: [],
    attachmentIds: [],
    addenda: [],
    notes: null,
  };
}

function emptyDocLink(): ProcessDocumentLink {
  return { url: "", label: null, source: "owner" };
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
  const { setBidHeader } = useBidSheet();
  const {
    bid,
    draft,
    setDraft,
    setField,
    saving,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [dupHits, setDupHits] = useState<BidListItem[]>([]);
  const [dupSearching, setDupSearching] = useState(false);
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
              id: crypto.randomUUID(),
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

  const setTiers = (next: ProcessContractTier[]) => {
    setField("contractTiers", next);
  };

  const patchTier = (index: number, patch: Partial<ProcessContractTier>) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Intake</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Bid clerk — architect name on the drawings, not invitation subject.
          Incomplete is fine. Second invitation → same bid, add a row.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Draft autosaves" : "Read only"}
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
            second bid.
          </p>
          <ul className="mt-2 space-y-1">
            {dupHits.map((h) => (
              <li key={h.id}>
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
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
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

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-semibold text-ink">
          Project address
        </h3>
        {(
          [
            ["line1", "Address line 1"],
            ["line2", "Address line 2"],
            ["city", "City"],
            ["state", "State"],
            ["zip", "ZIP"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex flex-col gap-1">
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

      {(
        [
          ["owner", "Owner", "owner"],
          ["architect", "Architect", "architect"],
          ["mechanicalEngineer", "Mechanical", "mechanical"],
        ] as const
      ).map(([key, title, role]) => {
        const p = party(draft[key] as ProcessParty);
        return (
          <section
            key={key}
            className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2"
          >
            <h3 className="sm:col-span-2 text-sm font-semibold text-ink">
              {title}
            </h3>
            <p className="sm:col-span-2 -mt-1 text-xs text-ink/45">
              Pick from saved list, or type a new name.
            </p>
            <PartyNameCombobox
              label="Name"
              value={p.name ?? ""}
              options={partiesByRole[role]}
              disabled={!editable}
              inputClass={inputClass}
              labelClass={labelClass}
              onChangeName={(name) => setParty(key, "name", name)}
              onPickExisting={(picked) =>
                setField(key, {
                  name: picked.name ?? null,
                  company: picked.company ?? null,
                  contactName: picked.contactName ?? null,
                  email: picked.email ?? null,
                  phone: picked.phone ?? null,
                })
              }
            />
            {(
              [
                ["company", "Company"],
                ["contactName", "Contact"],
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
          </section>
        );
      })}

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Invitations</h3>
            <p className="text-xs text-ink/45">
              Company first, then contacts from that company. Many vendors →
              many rows, one bid.
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
                    patchInvitation(index, {
                      contact: {
                        ...(inv.contact ?? {}),
                        company: picked.company || picked.name || null,
                      },
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
                    patchInvitation(index, {
                      contact: {
                        name: picked.name ?? null,
                        company:
                          picked.company ||
                          inv.contact?.company ||
                          null,
                        email: picked.email ?? null,
                        phone: picked.phone ?? null,
                      },
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
                            className="self-end pb-2 text-xs font-medium text-danger/80 hover:text-danger"
                            onClick={() =>
                              patchInvitation(index, {
                                addenda: addenda.filter(
                                  (_, i) => i !== adIndex
                                ),
                              })
                            }
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                {editable && invitations.length > 1 ? (
                  <button
                    type="button"
                    className="justify-self-start text-xs font-medium text-danger/80 hover:text-danger sm:col-span-2"
                    onClick={() =>
                      setInvitations(
                        invitations.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Remove invitation
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4">
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

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4">
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
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
              {editable ? (
                <button
                  type="button"
                  className="text-xs font-medium text-danger/80 hover:text-danger"
                  onClick={() =>
                    setField(
                      "documentLinks",
                      documentLinks.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4">
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
                      <td className="px-1.5 py-1.5">
                        <button
                          type="button"
                          className="text-xs font-medium text-danger/80 hover:text-danger"
                          onClick={() =>
                            setTiers(
                              tiers
                                .filter((_, i) => i !== index)
                                .map((row, i) => ({ ...row, sortOrder: i }))
                            )
                          }
                        >
                          Remove
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

      <p className="text-xs text-ink/45">
        Docs: upload invitation / drawings / specs / addenda as bid attachments
        (`label=invitation|drawings|specifications|addenda`), then put ids on
        the invitation row. GCs / mechanicals can stay light here — Post-Bid
        for follow-up.
      </p>
    </div>
  );
}
