"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SitelineAgingFilters } from "@/lib/api/endpoints/siteline";

/** Pay app statuses Siteline sends (exact-match on the server). */
const STATUSES = [
  { value: "PROPOSED", label: "Proposed" },
  { value: "SIGNED", label: "Signed" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAID", label: "Paid" },
] as const;

export type BillingFilterMode = "aging" | "overdue";

/** Every filter except search (search stays in the toolbar). */
export type BillingPanelFilters = Omit<SitelineAgingFilters, "search" | "entityId">;

const pick = (f: SitelineAgingFilters): BillingPanelFilters => ({
  overdueOnly: f.overdueOnly,
  minDaysPastDue: f.minDaysPastDue,
  maxDaysPastDue: f.maxDaysPastDue,
  minNetDollars: f.minNetDollars,
  maxNetDollars: f.maxNetDollars,
  includeStatuses: f.includeStatuses,
});

/** How many panel filters differ from the tab's defaults (for the button badge). */
export function countBillingFilters(value: SitelineAgingFilters, defaults: SitelineAgingFilters): number {
  const v = pick(value);
  const d = pick(defaults);
  let n = 0;
  if (!!v.overdueOnly !== !!d.overdueOnly) n += 1;
  if ((v.minDaysPastDue ?? null) !== (d.minDaysPastDue ?? null) || (v.maxDaysPastDue ?? null) !== (d.maxDaysPastDue ?? null)) n += 1;
  if ((v.minNetDollars ?? null) !== (d.minNetDollars ?? null) || (v.maxNetDollars ?? null) !== (d.maxNetDollars ?? null)) n += 1;
  if ((v.includeStatuses || "") !== (d.includeStatuses || "")) n += 1;
  return n;
}

const numOrUndef = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const FIELD =
  "h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[13px] text-ink outline-none transition placeholder:text-ink-soft hover:border-[#d1d5db] focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/20";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5 border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

function RangeInputs({
  idPrefix,
  min,
  max,
  onMin,
  onMax,
  unit,
  step,
}: {
  idPrefix: string;
  min: number | undefined;
  max: number | undefined;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
  unit: string;
  step: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label htmlFor={`${idPrefix}-min`} className="flex flex-col gap-1 text-[12px] text-ink-muted">
        From
        <input
          id={`${idPrefix}-min`}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={min ?? ""}
          onChange={(e) => onMin(numOrUndef(e.target.value))}
          placeholder={`Any ${unit}`}
          className={FIELD}
        />
      </label>
      <label htmlFor={`${idPrefix}-max`} className="flex flex-col gap-1 text-[12px] text-ink-muted">
        To
        <input
          id={`${idPrefix}-max`}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={max ?? ""}
          onChange={(e) => onMax(numOrUndef(e.target.value))}
          placeholder={`Any ${unit}`}
          className={FIELD}
        />
      </label>
    </div>
  );
}

/**
 * Right-hand filter panel for the Billing tables. Mounted only while open, so its draft
 * starts from the applied filters each time; nothing changes until Apply.
 */
export function BillingFiltersDrawer({
  mode,
  value,
  defaults,
  onApply,
  onClose,
}: {
  mode: BillingFilterMode;
  value: SitelineAgingFilters;
  defaults: SitelineAgingFilters;
  onApply: (next: BillingPanelFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BillingPanelFilters>(() => pick(value));
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = (patch: Partial<BillingPanelFilters>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const statuses = new Set((draft.includeStatuses ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const toggleStatus = (s: string) => {
    const next = new Set(statuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    set({ includeStatuses: next.size ? [...next].join(",") : undefined });
  };

  const daysInvalid =
    draft.minDaysPastDue != null && draft.maxDaysPastDue != null && draft.minDaysPastDue > draft.maxDaysPastDue;
  const netInvalid =
    draft.minNetDollars != null && draft.maxNetDollars != null && draft.minNetDollars > draft.maxNetDollars;

  // Rendered into <body>: the page root keeps a transform from its entrance animation,
  // which would otherwise make this `fixed` panel position against the page, not the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-filters-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl [--radius:10px] [--radius-md:8px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 id="billing-filters-title" className="text-[16px] font-semibold text-ink">
              Filters
            </h2>
            <p className="text-[12px] text-ink-muted">{mode === "aging" ? "A/R aging" : "Past due pay apps"}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-[var(--radius-md)] p-1.5 text-ink-muted transition-colors hover:bg-[#f3f4f6] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === "aging" ? (
            <Section title="Past due" hint="Only show projects with money past its due date.">
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={!!draft.overdueOnly}
                  onChange={(e) => set({ overdueOnly: e.target.checked })}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                Past due only
              </label>
            </Section>
          ) : null}

          <Section
            title="Days past due"
            hint={mode === "overdue" ? "Pay apps at least this many days late. Default is 51." : undefined}
          >
            <RangeInputs
              idPrefix={`${mode}-days`}
              min={draft.minDaysPastDue}
              max={draft.maxDaysPastDue}
              onMin={(v) => set({ minDaysPastDue: v == null ? v : Math.max(0, Math.floor(v)) })}
              onMax={(v) => set({ maxDaysPastDue: v == null ? v : Math.max(0, Math.floor(v)) })}
              unit="days"
              step={1}
            />
            {daysInvalid ? <p className="text-[12px] text-red-700">“From” is higher than “To”.</p> : null}
          </Section>

          <Section title="Net amount ($)">
            <RangeInputs
              idPrefix={`${mode}-net`}
              min={draft.minNetDollars}
              max={draft.maxNetDollars}
              onMin={(v) => set({ minNetDollars: v })}
              onMax={(v) => set({ maxNetDollars: v })}
              unit="amount"
              step={0.01}
            />
            {netInvalid ? <p className="text-[12px] text-red-700">“From” is higher than “To”.</p> : null}
          </Section>

          <Section title="Pay app status" hint="Leave all unticked to include every status.">
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-[13px] transition-colors ${
                    statuses.has(s.value)
                      ? "border-brand bg-brand-tint/50 text-ink"
                      : "border-[var(--border-subtle)] text-ink-muted hover:border-[#d1d5db]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={statuses.has(s.value)}
                    onChange={() => toggleStatus(s.value)}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex gap-2 border-t border-[var(--border-subtle)] p-4">
          <button
            type="button"
            onClick={() => setDraft(pick(defaults))}
            className="h-10 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white text-[13px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={daysInvalid || netInvalid}
            onClick={() => onApply(draft)}
            className="h-10 flex-[2] rounded-[var(--radius-md)] bg-brand text-[13px] font-semibold text-white transition-colors hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
