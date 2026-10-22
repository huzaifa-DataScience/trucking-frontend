"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getApiErrorMessage } from "@/lib/api/client";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type {
  BidPartyLookup,
  BidPartyWriteBody,
} from "@/lib/api/endpoints/biddingParties";

type FormState = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
};

const emptyForm = (): FormState => ({
  company: "",
  contactName: "",
  email: "",
  phone: "",
});

function partyToForm(p: BidPartyLookup): FormState {
  return {
    company: p.company ?? "",
    contactName: p.contactName ?? p.name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
  };
}

/**
 * Company contact directory — POST/PATCH /lookups/bidding/parties
 * FRONTEND_MEETING_2026-10-21.md
 */
export default function BiddingContractorsPage() {
  const { canRead, canWrite } = useBiddingAccess();
  const confirmDialog = useConfirmDialog();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<BidPartyLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      // gc / mechanical_contractor both read invite_contact on the API.
      const page = await biddingPartiesApi.getBiddingPartiesPage({
        role: "invite_contact",
        q: query.trim() || undefined,
        page: 1,
        pageSize: 50,
      });
      setItems(page.items);
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn't load contacts"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    const t = window.setTimeout(() => void load(q), 250);
    return () => window.clearTimeout(t);
  }, [canRead, q, load]);

  const openCreate = () => {
    setEditingId("new");
    setForm(emptyForm());
  };

  const openEdit = (p: BidPartyLookup) => {
    setEditingId(p.id);
    setForm(partyToForm(p));
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const validate = (): string | null => {
    if (!form.company.trim() && !form.contactName.trim()) {
      return "Company or contact name is required.";
    }
    if (!form.email.trim() && !form.phone.trim()) {
      return "Email or phone is required (otherwise they won’t show in search).";
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      showToast(problem, "error");
      return;
    }
    const body: BidPartyWriteBody = {
      company: form.company.trim() || null,
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    };
    setSaving(true);
    try {
      if (editingId === "new") {
        await biddingPartiesApi.createBiddingParty(body);
        showToast("Contact added", "success");
      } else if (editingId != null) {
        await biddingPartiesApi.updateBiddingParty(editingId, body);
        showToast("Contact updated", "success");
      }
      closeForm();
      await load(q);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Couldn't save contact"), "error");
    } finally {
      setSaving(false);
    }
  };

  const markInactive = async (p: BidPartyLookup) => {
    const ok = await confirmDialog({
      title: "Hide contact?",
      message: `Mark ${p.contactName || p.company || p.name} inactive? They will leave search results.`,
      confirmLabel: "Mark inactive",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await biddingPartiesApi.updateBiddingParty(p.id, { inactive: true });
      showToast("Contact marked inactive", "success");
      await load(q);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Couldn't update contact"), "error");
    }
  };

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader title="Contractors" subtitle="GC and mechanical company contacts." />
        <RestrictedState
          title="Estimates access required"
          message="You do not have permission to view contractor contacts."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Contractors"
        subtitle="Add or edit company contacts used on Intake. People without email and phone are left out of search."
        action={
          canWrite ? (
            <button type="button" className="intake-head-btn" onClick={openCreate}>
              Add contact
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="intake-field min-w-[14rem] flex-1"
          placeholder="Search company or contact…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-2 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      {editingId != null ? (
        <section className="intake-section max-w-xl">
          <div className="intake-section-head">
            {editingId === "new" ? "New contact" : "Edit contact"}
          </div>
          <div className="intake-section-body grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#6b7280]">
              Company
              <input
                className="intake-field font-normal"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                disabled={saving || !canWrite}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#6b7280]">
              Contact name
              <input
                className="intake-field font-normal"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                disabled={saving || !canWrite}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#6b7280]">
              Email
              <input
                className="intake-field font-normal"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={saving || !canWrite}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#6b7280]">
              Phone
              <input
                className="intake-field font-normal"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={saving || !canWrite}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="button"
                className="intake-head-btn"
                disabled={saving || !canWrite}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="intake-head-btn border-[#d5dbe3] bg-white"
                disabled={saving}
                onClick={closeForm}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="intake-section min-w-0">
        <div className="intake-section-head flex items-center justify-between gap-2">
          <span>Contacts</span>
          <span className="intake-head-count">{items.length}</span>
        </div>
        <div className="intake-section-body overflow-x-auto">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : items.length === 0 ? (
            <p className="text-[12.5px] text-[#6b7280]">
              No contacts yet. Add someone who wrote in without email/phone so they
              appear in Intake search.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Phone</th>
                  {canWrite ? <th className="px-2 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={String(p.id)} className="border-t border-[#eef2f6]">
                    <td className="px-2 py-2 font-medium text-[#1f2937]">
                      {p.company || "—"}
                    </td>
                    <td className="px-2 py-2 text-[#374151]">
                      {p.contactName || p.name || "—"}
                    </td>
                    <td className="px-2 py-2 text-[#4b5563]">{p.email || "—"}</td>
                    <td className="px-2 py-2 text-[#4b5563]">{p.phone || "—"}</td>
                    {canWrite ? (
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          className="mr-2 text-[12px] font-semibold text-brand hover:underline"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-[12px] font-semibold text-danger hover:underline"
                          onClick={() => void markInactive(p)}
                        >
                          Inactive
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
