"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import type { DisposalRateCard, DisposalRateWriteBody } from "@/lib/operations/types";
import { money, parseOptionalNumber, tons } from "@/lib/operations/format";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

const blank = (): DisposalRateWriteBody => ({
  companyName: "",
  unitLabel: "",
  category: "",
  siteId: null,
  costPerLoad: null,
  costPerTon: null,
  costPerCy: null,
  truckSizeCy: null,
  tonsIncluded: null,
  address: null,
  phone: null,
  contact: null,
  email: null,
  isActive: true,
});

export function DisposalRatesPanel() {
  const [rows, setRows] = useState<DisposalRateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DisposalRateWriteBody>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await opsApi.listDisposalRates());
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load disposal rates"));
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
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.unitLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, showInactive]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(blank());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: DisposalRateCard) => {
    setEditingId(row.id);
    setDraft({
      companyName: row.companyName,
      unitLabel: row.unitLabel ?? "",
      category: row.category ?? "",
      siteId: row.siteId ?? null,
      costPerLoad: row.costPerLoad ?? null,
      costPerTon: row.costPerTon ?? null,
      costPerCy: row.costPerCy ?? null,
      truckSizeCy: row.truckSizeCy ?? null,
      tonsIncluded: row.tonsIncluded ?? null,
      address: row.address ?? null,
      phone: row.phone ?? null,
      contact: row.contact ?? null,
      email: row.email ?? null,
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
      const body: DisposalRateWriteBody = {
        ...draft,
        companyName: draft.companyName.trim(),
        unitLabel: draft.unitLabel?.trim() || null,
        category: draft.category?.trim() || null,
      };
      if (editingId != null) await opsApi.updateDisposalRate(editingId, body);
      else await opsApi.createDisposalRate(body);
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
            placeholder="Search destination or material…"
            aria-label="Search disposal rates"
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
            <table className="min-w-[56rem] w-full text-left text-[13px]">
              <thead>
                <tr
                  className={`${OPS_TABLE_STICKY_HEAD} text-[11px] font-semibold uppercase tracking-wide text-ink/50`}
                >
                  <th className="px-3 py-2.5">Label</th>
                  <th className="px-3 py-2.5 text-right">$/load</th>
                  <th className="px-3 py-2.5 text-right">$/ton</th>
                  <th className="px-3 py-2.5 text-right">Incl. tons</th>
                  <th className="px-3 py-2.5 text-right">$/CY</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-ink/45">
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
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.costPerLoad)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.costPerTon)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {tons(row.tonsIncluded)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.costPerCy)}
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
        eyebrow="Disposal rate"
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
          <Field label="Company / site name *">
            <input
              className={opsFieldClass}
              value={draft.companyName}
              onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
              autoFocus
            />
          </Field>
          <Field label="Unit label">
            <input
              className={opsFieldClass}
              value={draft.unitLabel ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, unitLabel: e.target.value }))}
              placeholder="Disposal / Export / Recycle"
            />
          </Field>
          <Field label="Category">
            <input
              className={opsFieldClass}
              value={draft.category ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="C&D / Asbestos / Dirt"
            />
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
          <Field label="Cost per load ($)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.costPerLoad ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, costPerLoad: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Cost per ton ($)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.costPerTon ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, costPerTon: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Tons included (waived from $/ton)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.tonsIncluded ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tonsIncluded: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Cost per CY ($)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.costPerCy ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, costPerCy: parseOptionalNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Truck size (CY)">
            <input
              className={opsFieldClass}
              inputMode="decimal"
              value={draft.truckSizeCy ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, truckSizeCy: parseOptionalNumber(e.target.value) }))
              }
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
            Label becomes{" "}
            <span className="font-medium text-ink/70">company — unit — category</span>. CY charge
            uses truck size on the card, not weighed tons.
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
