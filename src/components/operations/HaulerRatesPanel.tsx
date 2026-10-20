"use client";

import { useEffect, useState } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getApiErrorMessage } from "@/lib/api/client";
import type { HaulerRateCard, HaulerRatesPage, HaulerRateWriteBody } from "@/lib/operations/types";
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
import { LoadingBar } from "@/components/ui/LoadingBar";
import { ActiveSwitch, AffixInput, FormSection, LabelPreview, RateField } from "@/components/operations/RateFormParts";

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

/** Rate cards per page (server-side). */
const RATES_PAGE_SIZE = 50;

type StatusFilter = "active" | "inactive" | "all";

const segWrap = "inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-ink/10 bg-white p-[3px]";
const segBtn = (on: boolean) =>
  `inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors ${
    on ? "bg-brand-tint font-semibold text-brand-secondary" : "font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
  }`;

/** An older backend ignores `page` and returns every card; filter and page it here until it is updated. */
function asRatesPage(
  res: HaulerRatesPage | HaulerRateCard[],
  page: number,
  search: string,
  company: string,
  status: StatusFilter
): HaulerRatesPage {
  if (!Array.isArray(res)) return res;
  const q = search.toLowerCase();
  const matched = res.filter(
    (r) =>
      (!company || r.companyName === company) &&
      (!q || [r.label, r.companyName, r.category].filter(Boolean).join(" ").toLowerCase().includes(q))
  );
  const active = matched.filter((r) => r.isActive).length;
  const all = matched.filter((r) => (status === "active" ? r.isActive : status === "inactive" ? !r.isActive : true));
  return {
    items: all.slice((page - 1) * RATES_PAGE_SIZE, page * RATES_PAGE_SIZE),
    total: all.length,
    allCount: res.length,
    page,
    pageSize: RATES_PAGE_SIZE,
    statusCounts: { active, inactive: matched.length - active, all: matched.length },
    companies: [...new Set(res.map((r) => r.companyName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  };
}

export function HaulerRatesPanel() {
  const [data, setData] = useState<HaulerRatesPage | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<HaulerRateWriteBody>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Search waits a moment after typing so the server gets one request, not one per key.
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  // A search / company / status change starts again at page 1; saving a card keeps the current page.
  const filterKey = `${searchQuery}|${company}|${status}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  // Hauler companies for the form's "Linked company" picker — once.
  useEffect(() => {
    void lookupsApi
      .getHaulers()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    opsApi
      .listHaulerRatesPage({ page, pageSize: RATES_PAGE_SIZE, search: searchQuery, company, status })
      .then((res) => {
        if (!cancelled) setData(asRatesPage(res, page, searchQuery, company, status));
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load hauler rates"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, company, status, reloadTick]);

  const load = () => setReloadTick((t) => t + 1);
  const visible = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

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
      load();
    } catch (e) {
      setFormError(getApiErrorMessage(e, "Could not save rate card"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border-subtle)] pb-4">
        <label className="flex w-[240px] min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink/45">Company</span>
          <select className={opsFieldClass} value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">{`All companies (${(data?.companies?.length ?? 0).toLocaleString()})`}</option>
            {(data?.companies ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] max-w-[260px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink/45">Search</span>
          <input
            className={opsFieldClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Company, category or label…"
            aria-label="Search hauler rates"
          />
        </label>
        <div className="ml-auto flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink/45">Status</span>
          <div className={segWrap} role="group" aria-label="Status">
            {(
              [
                ["active", "Active"],
                ["inactive", "Inactive"],
                ["all", "All"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={status === v} className={segBtn(status === v)} onClick={() => setStatus(v)}>
                {l}{" "}
                {data?.statusCounts ? (
                  <span className="text-[11px] font-medium text-ink/40">{data.statusCounts[v].toLocaleString()}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className={opsBtnPrimary} onClick={openCreate}>
          Add card
        </button>
      </div>

      {error ? <EmptyState message={error} /> : null}

      {/* Placeholder only on the first load; later reloads keep the table and show the bar (same as Estimates). */}
      {loading && !data ? (
        <TableSkeleton rows={10} toolbar={false} />
      ) : !error ? (
        <div className={`relative ${OPS_SHELL}`}>
          {loading ? <LoadingBar label="Loading hauler rates" /> : null}
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2">
            <span className="text-[11px] text-ink/45">
              {data
                ? `Page ${data.page} of ${totalPages} · ${data.total.toLocaleString()} of ${data.allCount.toLocaleString()} cards`
                : null}
            </span>
            {totalPages > 1 && data ? (
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, data.page - 1))}
                  disabled={data.page <= 1 || loading}
                  className="cursor-pointer rounded-lg border border-ink/15 bg-surface px-3 py-1 text-[12.5px] font-medium text-ink transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, data.page + 1))}
                  disabled={data.page >= totalPages || loading}
                  className="cursor-pointer rounded-lg border border-ink/15 bg-surface px-3 py-1 text-[12.5px] font-medium text-ink transition hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-50"
                >
                  Next
                </button>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <OpsModal
        open={modalOpen}
        onClose={closeModal}
        eyebrow="Hauler rate"
        title={editingId != null ? "Edit rate card" : "Add rate card"}
        wide
        footerNote="Changing a rate updates the cost of every haul that uses this card."
        footer={
          <>
            <button type="button" className={opsBtnGhost} disabled={saving} onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className={opsBtnPrimary} disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : editingId != null ? "Save changes" : "Add rate card"}
            </button>
          </>
        }
      >
        <FormSection title="Rate card">
          <div className="grid gap-3 sm:grid-cols-2">
            <RateField label="Company" required>
              <input
                className={opsFieldClass}
                value={draft.companyName}
                onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
                autoFocus
              />
            </RateField>
            <RateField label="Linked company" hint="Optional — ties the card to a company record">
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
            </RateField>
            <RateField label="Rate name" hint="e.g. Hourly 2026, Per load – tri-axle" className="sm:col-span-2">
              <input
                className={opsFieldClass}
                value={draft.category ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="Hauler - Hourly 2026"
              />
            </RateField>
          </div>
          <div className="mt-3">
            <LabelPreview parts={[draft.companyName, draft.category]} />
          </div>
        </FormSection>

        <FormSection title="Pricing">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RateField label="Per load">
              <AffixInput prefix="$" value={draft.ratePerLoad} onChange={(v) => setDraft((d) => ({ ...d, ratePerLoad: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Per hour">
              <AffixInput prefix="$" value={draft.ratePerHour} onChange={(v) => setDraft((d) => ({ ...d, ratePerHour: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Show-up hours" hint="Not added to cost">
              <AffixInput suffix="hrs" value={draft.showUpHours} onChange={(v) => setDraft((d) => ({ ...d, showUpHours: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Unit / truck">
              <input className={opsFieldClass} value={draft.unit ?? ""} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value || null }))} />
            </RateField>
          </div>
        </FormSection>

        <FormSection title="Contact" note="optional">
          <div className="grid gap-3 sm:grid-cols-2">
            <RateField label="Contact">
              <input className={opsFieldClass} value={draft.contact ?? ""} onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value || null }))} />
            </RateField>
            <RateField label="Phone">
              <input className={opsFieldClass} value={draft.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value || null }))} />
            </RateField>
            <RateField label="Email">
              <input className={opsFieldClass} value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value || null }))} />
            </RateField>
            <RateField label="COI" hint="Certificate of insurance">
              <input className={opsFieldClass} value={draft.coi ?? ""} onChange={(e) => setDraft((d) => ({ ...d, coi: e.target.value || null }))} />
            </RateField>
            <RateField label="Address" className="sm:col-span-2">
              <input className={opsFieldClass} value={draft.address ?? ""} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value || null }))} />
            </RateField>
          </div>
        </FormSection>

        <FormSection title="Status">
          <ActiveSwitch active={draft.isActive !== false} onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))} />
        </FormSection>

        {formError ? (
          <p className="mt-1 text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </OpsModal>
    </div>
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
