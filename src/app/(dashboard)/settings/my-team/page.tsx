"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import * as authApi from "@/lib/api/endpoints/auth";
import type {
  AuthTeam,
  AuthTeamSlotAssignee,
  AuthTeamSlotKey,
  AuthTeamSlotsPatch,
} from "@/lib/api/endpoints/auth";
import {
  AUTH_TEAM_SLOT_KEYS,
  AUTH_TEAM_SLOT_LABELS,
} from "@/lib/api/endpoints/auth";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidContactLookup } from "@/lib/bidding/types";

type SlotDraft = {
  connecteamUserId: number | null;
  appUserId: number | null;
  name: string;
};

function emptySlot(): SlotDraft {
  return { connecteamUserId: null, appUserId: null, name: "" };
}

function contactLabel(c: BidContactLookup): string {
  return (
    c.name?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    c.email?.trim() ||
    (c.connecteamUserId != null ? `Connecteam #${c.connecteamUserId}` : "") ||
    (c.appUserId != null ? `User #${c.appUserId}` : "")
  );
}

function fromAssignee(a: AuthTeamSlotAssignee | undefined): SlotDraft {
  if (!a) return emptySlot();
  const name =
    a.displayName?.trim() ||
    a.name?.trim() ||
    a.email?.trim() ||
    (a.connecteamUserId != null ? `Connecteam #${a.connecteamUserId}` : "") ||
    (a.appUserId != null ? `User #${a.appUserId}` : "");
  return {
    connecteamUserId: a.connecteamUserId ?? null,
    appUserId: a.appUserId ?? null,
    name,
  };
}

/** Prefer connecteamUserId → appUserId → { name } for Excel-only. */
function toPatchValue(
  d: SlotDraft
):
  | { connecteamUserId: number }
  | { appUserId: number }
  | { name: string }
  | null {
  if (d.connecteamUserId != null) return { connecteamUserId: d.connecteamUserId };
  if (d.appUserId != null) return { appUserId: d.appUserId };
  const name = d.name.trim();
  if (name) return { name };
  return null;
}

function contactKey(c: BidContactLookup, i: number): string {
  if (c.connecteamUserId != null) return `ct-${c.connecteamUserId}`;
  if (c.appUserId != null) return `app-${c.appUserId}`;
  return `name-${c.name}-${i}`;
}

function SlotPersonPicker({
  label,
  value,
  onChange,
  roster,
  rosterLoading,
  disabled,
}: {
  label: string;
  value: SlotDraft;
  onChange: (next: SlotDraft) => void;
  /** Full people list from GET /lookups/bidding/contacts (no paging). */
  roster: BidContactLookup[];
  rosterLoading: boolean;
  disabled?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const hits = !q
    ? roster
    : roster.filter((c) => {
        const hay = [
          contactLabel(c),
          c.email,
          c.firstName,
          c.lastName,
          c.role,
          c.connecteamUserId != null ? String(c.connecteamUserId) : "",
          c.appUserId != null ? String(c.appUserId) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });

  const display = value.name || "— Unassigned —";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink/55">{label}</span>
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
            setQuery("");
          }}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 text-left text-sm text-ink outline-none transition hover:border-ink/20 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={value.name ? "truncate font-medium" : "truncate text-ink/40"}>
            {display}
          </span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && !disabled ? (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-ink/[0.08] bg-white shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
          >
            <div className="border-b border-ink/[0.06] p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter people…"
                className="h-9 w-full rounded-lg border border-ink/10 bg-canvas/40 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <ul className="max-h-56 overflow-auto py-1">
              <li>
                <button
                  type="button"
                  role="option"
                  className="block w-full px-3 py-2 text-left text-sm text-ink/55 hover:bg-ink/[0.04]"
                  onClick={() => {
                    onChange(emptySlot());
                    setOpen(false);
                  }}
                >
                  — Unassigned —
                </button>
              </li>
              {rosterLoading && roster.length === 0 ? (
                <li className="px-3 py-2 text-xs text-ink/45">Loading people…</li>
              ) : hits.length === 0 ? (
                <li className="px-3 py-2 text-xs text-ink/45">No people match.</li>
              ) : (
                hits.map((c, i) => {
                  const name = contactLabel(c);
                  const hint = [
                    c.role,
                    c.connecteamUserId != null
                      ? `ct #${c.connecteamUserId}`
                      : null,
                    c.appUserId != null ? `app #${c.appUserId}` : null,
                    c.nameOnly ? "name only" : null,
                    c.email,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={contactKey(c, i)}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand/[0.06]"
                        onClick={() => {
                          onChange({
                            connecteamUserId: c.connecteamUserId ?? null,
                            appUserId: c.appUserId ?? null,
                            name,
                          });
                          setOpen(false);
                        }}
                      >
                        <span className="font-medium text-ink">{name}</span>
                        {hint ? (
                          <span className="text-xs text-ink/45">{hint}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function contactsFromAuthTeam(team: AuthTeam | null): BidContactLookup[] {
  if (!team?.contacts) return [];
  const raw = team.contacts;
  if (!Array.isArray(raw)) return [];
  const out: BidContactLookup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name =
      (typeof r.name === "string" && r.name.trim()) ||
      (typeof r.displayName === "string" && r.displayName.trim()) ||
      "";
    if (!name) continue;
    out.push({
      name,
      firstName: typeof r.firstName === "string" ? r.firstName : null,
      lastName: typeof r.lastName === "string" ? r.lastName : null,
      email: typeof r.email === "string" ? r.email : null,
      role: typeof r.role === "string" ? r.role : null,
      connecteamUserId:
        typeof r.connecteamUserId === "number" ? r.connecteamUserId : null,
      appUserId: typeof r.appUserId === "number" ? r.appUserId : null,
      nameOnly:
        typeof r.connecteamUserId !== "number" &&
        typeof r.appUserId !== "number",
    });
  }
  return out;
}

export default function MyTeamPage() {
  const { user, setUser, refreshUser } = useAuth();
  const [team, setTeam] = useState<AuthTeam | null>(null);
  const [slots, setSlots] = useState<Record<AuthTeamSlotKey, SlotDraft>>(() => {
    const init = {} as Record<AuthTeamSlotKey, SlotDraft>;
    for (const k of AUTH_TEAM_SLOT_KEYS) init[k] = emptySlot();
    return init;
  });
  const [roster, setRoster] = useState<BidContactLookup[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isCaptain = user?.role === "captain";
  const canView =
    isCaptain ||
    user?.role === "assistant_estimator" ||
    user?.role === "bid_clerk" ||
    user?.role === "user";
  const canSave = isCaptain;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await authApi.getAuthTeam();
      setTeam(t);
      const next = {} as Record<AuthTeamSlotKey, SlotDraft>;
      for (const k of AUTH_TEAM_SLOT_KEYS) {
        next[k] = fromAssignee(t?.slots?.[k]);
      }
      setSlots(next);
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't load team"));
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    void load();
  }, [canView, load]);

  // Full people list — GET /lookups/bidding/contacts (not /captains, not Connecteam).
  useEffect(() => {
    if (!canView) return;
    setRosterLoading(true);
    void biddingApi
      .getBiddingContacts()
      .then(setRoster)
      .catch(() => setRoster([]))
      .finally(() => setRosterLoading(false));
  }, [canView]);

  // Fallback: people embedded on GET /auth/team when contacts lookup is empty.
  useEffect(() => {
    if (roster.length > 0) return;
    const fromTeam = contactsFromAuthTeam(team);
    if (fromTeam.length) setRoster(fromTeam);
  }, [team, roster.length]);

  const setSlot = (key: AuthTeamSlotKey, next: SlotDraft) => {
    setSlots((prev) => ({ ...prev, [key]: next }));
    setSuccess(null);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const bodySlots: AuthTeamSlotsPatch = {};
      for (const k of AUTH_TEAM_SLOT_KEYS) {
        bodySlots[k] = toPatchValue(slots[k]);
      }
      const res = await authApi.patchAuthTeam({ slots: bodySlots });
      if (res.user) setUser(res.user);
      else await refreshUser();
      if (res.team) {
        setTeam(res.team);
        const next = {} as Record<AuthTeamSlotKey, SlotDraft>;
        for (const k of AUTH_TEAM_SLOT_KEYS) {
          next[k] = fromAssignee(res.team.slots?.[k]);
        }
        setSlots(next);
      } else {
        await load();
      }
      setSuccess(
        team?.teamId || team?.id
          ? "Team updated."
          : "Team created. Estimates will scope to your crew."
      );
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't save team"));
    } finally {
      setSaving(false);
    }
  };

  const captainLabel =
    team?.captain?.displayName ||
    team?.captain?.name ||
    (user
      ? user.displayName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email
      : "You");

  if (!user) return null;

  if (!canView) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          title="My team"
          subtitle="Captains build their estimating crew here."
          breadcrumbs={[
            { label: "Settings", href: "/settings/my-team" },
            { label: "My team" },
          ]}
        />
        <p className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3 text-sm text-ink/70">
          Your role does not manage an estimating crew.{" "}
          <Link href="/account" className="font-semibold text-brand hover:underline">
            Back to Account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="My team"
        subtitle={
          canSave
            ? "Assign bid clerk and takeoff seats. Captain is you — first save creates your crew."
            : "Read-only — only the captain can save this crew."
        }
        breadcrumbs={[
          { label: "Settings", href: "/settings/my-team" },
          { label: "My team" },
        ]}
      />

      <Card>
        <CardHeader
          title={team?.teamName || "Estimating crew"}
          subtitle={
            team?.teamId != null || team?.id != null
              ? `Team #${team.teamId ?? team.id}`
              : "No team yet — save once to create"
          }
        />

        {loading ? (
          <p className="text-sm text-ink/45">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink/55">Captain</span>
              <p className="rounded-xl border border-ink/[0.06] bg-canvas/40 px-3.5 py-2.5 text-sm font-medium text-ink">
                {captainLabel}
                <span className="mt-0.5 block text-[10px] font-normal text-ink/40">
                  Auto — logged-in user (not sent on save)
                </span>
              </p>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {AUTH_TEAM_SLOT_KEYS.map((key) => (
                <SlotPersonPicker
                  key={key}
                  label={AUTH_TEAM_SLOT_LABELS[key]}
                  value={slots[key]}
                  onChange={(next) => setSlot(key, next)}
                  roster={roster}
                  rosterLoading={rosterLoading}
                  disabled={!canSave}
                />
              ))}
            </div>

            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            {canSave ? (
              <div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : team?.teamId || team?.id
                      ? "Save team"
                      : "Create team"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink/45">
                AE / other roles can view this roster. Ask the captain to edit.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
