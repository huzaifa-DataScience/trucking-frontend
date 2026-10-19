"use client";

import { useEffect, useState } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import type { DisposalRateCard, DisposalRatesPage, DisposalRateWriteBody } from "@/lib/operations/types";
import { sortRows, type SortDir, type SortValue } from "@/lib/sort";
import { money, parseOptionalNumber, tons } from "@/lib/operations/format";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsFieldClass,
} from "@/components/operations/OperationsChrome";
import { OpsModal } from "@/components/operations/OpsModal";
import { OPS_TABLE_SCROLL } from "@/components/operations/tableScroll";
import { useTableSort } from "@/hooks/useTableSort";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { ActiveSwitch, AffixInput, ChoiceSwitch, FormSection, LabelPreview, RateField } from "@/components/operations/RateFormParts";

/** Form type choices; anything else in unitLabel shows as Other with its own text. */
const TYPE_CHOICES = ["Recycle", "Disposal", "Export", "Import", "Asbestos", "Other"] as const;
type TypeChoice = (typeof TYPE_CHOICES)[number];

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

type RateType = "Recycle" | "Import" | "Export" | "Asbestos" | "Other" | "Not set";
type RateSortKey = "company" | "type" | "material" | "costPerLoad" | "costPerTon" | "costPerCy";
const RATE_TYPES: RateType[] = ["Recycle", "Import", "Export", "Asbestos", "Other", "Not set"];

/** The card's type lives in `unitLabel` as free text; typos like "Recyle" / "Recylce" count as Recycle. */
function rateType(r: DisposalRateCard): RateType {
  const u = (r.unitLabel ?? "").trim().toLowerCase();
  if (!u) return "Not set";
  if (u.startsWith("rec")) return "Recycle";
  if (u === "import") return "Import";
  if (u === "export") return "Export";
  if (u === "asbestos") return "Asbestos";
  return "Other";
}

const segWrap = "inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-ink/10 bg-white p-[3px]";
const segBtn = (on: boolean) =>
  `inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors ${
    on ? "bg-brand-tint font-semibold text-brand-secondary" : "font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
  }`;
const th = "sticky top-0 z-[1] whitespace-nowrap bg-[var(--brand-tint)] px-3 py-2.5 text-[12px] font-semibold text-ink";
const td = "whitespace-nowrap border-t border-[#f0f1f3] px-3 py-2";

/** Rate cards per page (server-side). */
const RATES_PAGE_SIZE = 50;

type RateFilters = { search: string; company: string; type: RateType | "all"; status: "active" | "inactive" | "all" };
type RateSort = { key: RateSortKey | null; dir: SortDir };

const SORT_VALUE: Record<RateSortKey, (r: DisposalRateCard) => SortValue> = {
  company: (r) => r.companyName,
  type: (r) => rateType(r),
  material: (r) => r.category ?? "",
  costPerLoad: (r) => r.costPerLoad ?? null,
  costPerTon: (r) => r.costPerTon ?? null,
  costPerCy: (r) => r.costPerCy ?? null,
};

/** An older backend ignores `page` and returns every card; filter, sort and page it here until it is updated. */
function asRatesPage(
  res: DisposalRatesPage | DisposalRateCard[],
  page: number,
  f: RateFilters,
  sort: RateSort
): DisposalRatesPage {
  if (!Array.isArray(res)) return res;
  const q = f.search.toLowerCase();
  const matched = res.filter((r) => {
    if (f.status === "active" && !r.isActive) return false;
    if (f.status === "inactive" && r.isActive) return false;
    if (f.company && r.companyName !== f.company) return false;
    if (!q) return true;
    return [r.label, r.companyName, r.category, r.unitLabel, r.address].some((v) => (v ?? "").toLowerCase().includes(q));
  });
  const typeCounts: Record<string, number> = { all: matched.length };
  for (const r of matched) typeCounts[rateType(r)] = (typeCounts[rateType(r)] ?? 0) + 1;
  let all = f.type === "all" ? matched : matched.filter((r) => rateType(r) === f.type);
  if (sort.key) all = sortRows(all, SORT_VALUE[sort.key], sort.dir);
  return {
    items: all.slice((page - 1) * RATES_PAGE_SIZE, page * RATES_PAGE_SIZE),
    total: all.length,
    allCount: res.length,
    page,
    pageSize: RATES_PAGE_SIZE,
    typeCounts,
    companies: [...new Set(res.map((r) => r.companyName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  };
}

export function DisposalRatesPanel() {
  const [data, setData] = useState<DisposalRatesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<RateType | "all">("all");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DisposalRateWriteBody>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Search waits a moment after typing so the server gets one request, not one per key.
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  // Column sorting happens on the server; the header buttons only hold which column / direction.
  const sort = useTableSort<DisposalRateCard, RateSortKey>([], SORT_VALUE);
  const sortKey = sort.sortKey;
  const sortDir = sort.sortDir;

  // A filter or sort change starts again at page 1; saving a card keeps the current page.
  const filterKey = `${searchQuery}|${company}|${type}|${status}|${sortKey}|${sortDir}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const filters: RateFilters = { search: searchQuery, company, type, status };
    opsApi
      .listDisposalRatesPage({ page, pageSize: RATES_PAGE_SIZE, ...filters, sortBy: sortKey, sortDir })
      .then((res) => {
        if (!cancelled) setData(asRatesPage(res, page, filters, { key: sortKey, dir: sortDir }));
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load disposal rates"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, company, type, status, sortKey, sortDir, reloadTick]);

  const load = () => setReloadTick((t) => t + 1);
  const companies = data?.companies ?? [];
  const typeCounts = data?.typeCounts ?? {};
  const visible = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // Which Type button is lit for the draft (exact match, ignoring case; anything else is Other).
  // Empty type = nothing lit; the Other text box shows once Other is picked or the value is non-standard.
  const typeChoice: TypeChoice | null = (() => {
    const u = (draft.unitLabel ?? "").trim().toLowerCase();
    const hit = TYPE_CHOICES.find((t) => t !== "Other" && t.toLowerCase() === u);
    if (hit) return hit;
    return u || otherOpen ? "Other" : null;
  })();

  const openCreate = () => {
    setOtherOpen(false);
    setEditingId(null);
    setDraft(blank());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: DisposalRateCard) => {
    setOtherOpen(false);
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
      load();
    } catch (e) {
      setFormError(getApiErrorMessage(e, "Could not save rate card"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type switch; counts follow the other filters. */}
          <div className={segWrap} role="group" aria-label="Type">
            <button type="button" aria-pressed={type === "all"} className={segBtn(type === "all")} onClick={() => setType("all")}>
              All <span className="text-[11px] font-medium text-ink/40">{(typeCounts.all ?? 0).toLocaleString()}</span>
            </button>
            {RATE_TYPES.filter((t) => typeCounts[t] || t === type).map((t) => (
              <button key={t} type="button" aria-pressed={type === t} className={segBtn(type === t)} onClick={() => setType(t)}>
                {t} <span className="text-[11px] font-medium text-ink/40">{(typeCounts[t] ?? 0).toLocaleString()}</span>
              </button>
            ))}
          </div>
          <button type="button" className={opsBtnPrimary} onClick={openCreate}>
            Add card
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex w-[240px] min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/45">Company</span>
            <select className={opsFieldClass} value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">{`All companies (${companies.length})`}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/45">Search</span>
            <input
              className={opsFieldClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Material, label or address…"
              aria-label="Search disposal rates"
            />
          </label>
          <div className="flex flex-col gap-1.5">
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
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? <EmptyState message={error} /> : null}

      {/* Placeholder only on the first load; later reloads keep the table and show the bar (same as Estimates). */}
      {loading && !data ? (
        <TableSkeleton rows={10} toolbar={false} />
      ) : !error ? (
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
          {loading ? <LoadingBar label="Loading disposal rates" /> : null}
          <div className={OPS_TABLE_SCROLL}>
            <table className="min-w-[48rem] w-full border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr>
                  <th className={th}>{sort.header("company", "Company / label")}</th>
                  <th className={th}>{sort.header("type", "Type")}</th>
                  <th className={th}>{sort.header("material", "Material")}</th>
                  <th className={`${th} text-right`}>{sort.header("costPerLoad", "$/load", "right")}</th>
                  <th className={`${th} text-right`}>{sort.header("costPerTon", "$/ton", "right")}</th>
                  <th className={`${th} text-right`}>Incl. tons</th>
                  <th className={`${th} text-right`}>{sort.header("costPerCy", "$/CY", "right")}</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-ink/45">
                      No rate cards match.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-brand/[0.04]">
                      <td className={`${td} max-w-[16rem]`}>
                        <p className="flex min-w-0 items-center gap-1.5 font-semibold text-ink" title={row.companyName}>
                          <span className="truncate">{row.companyName}</span>
                          {/* Status column dropped: almost every card is active, so only inactive ones are marked. */}
                          {!row.isActive ? <StatusPill active={false} /> : null}
                        </p>
                        <p className="truncate text-[12px] text-ink-muted" title={row.label}>
                          {row.label}
                        </p>
                      </td>
                      <td className={td}>
                        <span className="inline-flex h-5 items-center rounded-md bg-ink/[0.05] px-1.5 text-[11.5px] font-semibold text-ink/70">
                          {rateType(row)}
                        </span>
                      </td>
                      <td className={`${td} max-w-[9rem] truncate`} title={row.category ?? undefined}>
                        {row.category || "—"}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{money(row.costPerLoad)}</td>
                      <td className={`${td} text-right tabular-nums`}>{money(row.costPerTon)}</td>
                      <td className={`${td} text-right tabular-nums`}>{tons(row.tonsIncluded)}</td>
                      <td className={`${td} text-right tabular-nums`}>{money(row.costPerCy)}</td>
                      <td className={`${td} text-right`}>
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5">
            <span className="text-[12.5px] text-ink-muted">
              {data
                ? `Page ${data.page} of ${totalPages} · ${data.total.toLocaleString()} of ${data.allCount.toLocaleString()} rate cards`
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
        eyebrow="Disposal rate"
        title={editingId != null ? "Edit rate card" : "Add rate card"}
        wide
        footerNote="Changing prices updates the cost of every haul that uses this card."
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
            <RateField label="Company / site" required className="sm:col-span-2">
              <input
                className={opsFieldClass}
                value={draft.companyName}
                onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
                autoFocus
              />
            </RateField>
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-ink/55">Type</span>
              <ChoiceSwitch
                ariaLabel="Type"
                value={typeChoice}
                options={TYPE_CHOICES}
                onChange={(v) => {
                  setOtherOpen(v === "Other");
                  setDraft((d) => ({ ...d, unitLabel: v === "Other" ? "" : v }));
                }}
              />
              {typeChoice === "Other" ? (
                <input
                  value={draft.unitLabel ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, unitLabel: e.target.value }))}
                  placeholder="e.g. Delivery, Drop off"
                  aria-label="Other type"
                  className={`${opsFieldClass} sm:max-w-[50%]`}
                />
              ) : null}
            </div>
            <RateField label="Material" hint="e.g. C&D, Dirt, Asbestos">
              <input
                className={opsFieldClass}
                value={draft.category ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              />
            </RateField>
          </div>
          <div className="mt-3">
            <LabelPreview parts={[draft.companyName, draft.unitLabel, draft.category]} />
          </div>
        </FormSection>

        <FormSection title="Pricing" note="fill in what this site charges — any mix">
          <div className="grid gap-3 sm:grid-cols-3">
            <RateField label="Per load">
              <AffixInput prefix="$" value={draft.costPerLoad} onChange={(v) => setDraft((d) => ({ ...d, costPerLoad: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Per ton">
              <AffixInput prefix="$" value={draft.costPerTon} onChange={(v) => setDraft((d) => ({ ...d, costPerTon: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Per cubic yard">
              <AffixInput prefix="$" value={draft.costPerCy} onChange={(v) => setDraft((d) => ({ ...d, costPerCy: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Free tons per load" hint="Not charged per ton">
              <AffixInput suffix="tons" value={draft.tonsIncluded} onChange={(v) => setDraft((d) => ({ ...d, tonsIncluded: parseOptionalNumber(v) }))} />
            </RateField>
            <RateField label="Truck size" hint="The per-CY charge uses this size, not weighed tons">
              <AffixInput suffix="CY" value={draft.truckSizeCy} onChange={(v) => setDraft((d) => ({ ...d, truckSizeCy: parseOptionalNumber(v) }))} />
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
            <RateField label="Email" className="sm:col-span-2">
              <input className={opsFieldClass} value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value || null }))} />
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
