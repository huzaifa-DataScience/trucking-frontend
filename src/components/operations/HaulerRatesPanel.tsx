"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getApiErrorMessage } from "@/lib/api/client";
import type { HaulerRateCard, HaulerRateWriteBody } from "@/lib/operations/types";
import { money, parseOptionalNumber } from "@/lib/operations/format";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsFieldClass,
} from "@/components/operations/OperationsChrome";
import { OpsModal } from "@/components/operations/OpsModal";
import {
  OPS_SHELL,
  OPS_TABLE_SCROLL,
  OPS_TABLE_STICKY_HEAD,
} from "@/components/operations/tableScroll";
import { SortedOptions } from "@/components/ui/SortedOptions";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

const blank = (): HaulerRateWriteBody => ({
  companyName: "",
  category: "",
  companyId: null,
  ratePerLoad: null,
  ratePerHour: null,
  unit: null,
  showUpHours: null,
  address: null,
  phone: null,
  contact: null,
  email: null,
  coi: null,
  isActive: true,
});

export function HaulerRatesPanel() {
  const [rows, setRows] = useState<HaulerRateCard[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<HaulerRateWriteBody>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rates, haulers] = await Promise.all([
        opsApi.listHaulerRates(),
        lookupsApi.getHaulers().catch(() => []),
      ]);
      setRows(rates);
      setCompanies(haulers);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load hauler rates"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.isActive) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, showInactive]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(blank());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: HaulerRateCard) => {
    setEditingId(row.id);
    setDraft({
      companyName: row.companyName,
      category: row.category ?? "",
      companyId: row.companyId ?? null,
      ratePerLoad: row.ratePerLoad ?? null,
      ratePerHour: row.ratePerHour ?? null,
      unit: row.unit ?? null,
      showUpHours: row.showUpHours ?? null,
      address: row.address ?? null,
      phone: row.phone ?? null,
      contact: row.contact ?? null,
      email: row.email ?? null,
      coi: row.coi ?? null,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const save = async () => {
    if (!draft.companyName.trim()) {
      setFormError("Company name is required");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body: HaulerRateWriteBody = {
        ...draft,
        companyName: draft.companyName.trim(),
        category: draft.category?.trim() || null,
      };
      if (editingId != null) await opsApi.updateHaulerRate(editingId, body);
      else await opsApi.createHaulerRate(body);
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(getApiErrorMessage(e, "Could not save rate card"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            className={`${opsFieldClass} max-w-xs`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or category…"
            aria-label="Search hauler rates"
          />
          <label className="flex items-center gap-2 text-[12.5px] text-ink/55">
            <input
              type="checkbox"
              className="rounded border-ink/20"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        <button type="button" className={opsBtnPrimary} onClick={openCreate}>
          Add card
        </button>
      </div>

      {error ? <EmptyState message={error} /> : null}

      {loading ? (
        <TableSkeleton rows={10} toolbar={false} />
      ) : !error ? (
        <div className={OPS_SHELL}>
          <div className={OPS_TABLE_SCROLL}>
            <table className="min-w-[48rem] w-full text-left text-[13px]">
              <thead>
                <tr
                  className={`${OPS_TABLE_STICKY_HEAD} text-[11px] font-semibold uppercase tracking-wide text-ink/50`}
                >
                  <th className="px-3 py-2.5">Label</th>
                  <th className="px-3 py-2.5 text-right">$/load</th>
                  <th className="px-3 py-2.5 text-right">$/hr</th>
                  <th className="px-3 py-2.5">Show-up</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-ink/45">
                      No rate cards match.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-ink/[0.05] transition hover:bg-brand/[0.04]"
                    >
                      <td className="max-w-[22rem] px-3 py-2">
                        <p className="truncate font-medium text-ink">{row.label}</p>
                        {row.address ? (
                          <p className="truncate text-[11px] text-ink/40">{row.address}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.ratePerLoad)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.ratePerHour)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink/55">
                        {row.showUpHours != null ? row.showUpHours : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill active={row.isActive} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-[12px] font-semibold text-brand hover:underline"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2 text-[11px] text-ink/45">
            {visible.length.toLocaleString()} of {rows.length.toLocaleString()} cards
          </div>
        </div>
      ) : null}

      <OpsModal
        open={modalOpen}
        onClose={closeModal}
        eyebrow="Hauler rate"
        title={editingId != null ? "Edit rate card" : "Add rate card"}
        wide
        footer={
          <>
            <button type="button" className={opsBtnGhost} disabled={saving} onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className={opsBtnPrimary} disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : editingId != null ? "Save changes" : "Add card"}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name *">
            <input
              className={opsFieldClass}
              value={draft.companyName}
              onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
              autoFocus
            />
          </Field>
          <Field label="Category">
            <input
              className={opsFieldClass}
              value={draft.category ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="Hauler - Hourly 2026"
            />
          </Field>
          <Field label="Link company (optional)">
            <select
              className={opsFieldClass}
              value={draft.companyId ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  companyId: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <SortedOptions>
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SortedOptions>
            </select>
          </Field>
          <Field label="Status">
            <select
              className={opsFieldClass}
              value={draft.isActive === false ? "0" : "1"}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.value === "1" }))}
            >
              <option value="1">Active — shown on haul form</option>
              <option value="0">Inactive — hidden from haul form</option>
            </select>
          </Field>
          <Field label="Rate per load ($)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.ratePerLoad ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ratePerLoad: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Rate per hour ($)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.ratePerHour ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ratePerHour: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Show-up hours (not in cost)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.showUpHours ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, showUpHours: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Unit">
            <input
              className={opsFieldClass}
              value={draft.unit ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value || null }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className={opsFieldClass}
              value={draft.phone ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value || null }))}
            />
          </Field>
          <Field label="Contact">
            <input
              className={opsFieldClass}
              value={draft.contact ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value || null }))}
            />
          </Field>
          <Field label="Email">
            <input
              className={opsFieldClass}
              value={draft.email ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value || null }))}
            />
          </Field>
          <Field label="COI">
            <input
              className={opsFieldClass}
              value={draft.coi ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, coi: e.target.value || null }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input
                className={opsFieldClass}
                value={draft.address ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value || null }))}
              />
            </Field>
          </div>
        </div>
        {formError ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-ink/45">
            Label becomes <span className="font-medium text-ink/70">company — category</span>. Saving
            updates cost on every haul that uses this card.
          </p>
        )}
      </OpsModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-ink/45">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-ink/[0.06] text-ink/45"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
