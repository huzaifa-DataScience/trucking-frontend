"use client";

import type { ReactNode } from "react";
import { opsFieldClass } from "@/components/operations/OperationsChrome";

/** Shared building blocks for the hauler / disposal rate card forms. */

export function FormSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#f0f1f3] py-4 first:pt-1 last:border-b-0">
      <h3 className="mb-2.5 text-[12.5px] font-semibold text-ink">
        {title}
        {note ? <span className="ml-1.5 font-normal text-ink/40">{note}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export function RateField({
  label,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-ink/55">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[11.5px] text-ink/40">{hint}</span> : null}
    </label>
  );
}

/** Number field with a "$" in front or a unit ("tons", "CY", "hrs") at the end. */
export function AffixInput({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  ariaLabel,
}: {
  value: string | number | null | undefined;
  onChange: (raw: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <span className="relative flex">
      {prefix ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink/40">{prefix}</span>
      ) : null}
      <input
        className={`${opsFieldClass} ${prefix ? "pl-7" : ""} ${suffix ? "pr-12" : ""}`}
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink/40">{suffix}</span>
      ) : null}
    </span>
  );
}

/** Segmented choice (same look as the page filters). */
export function ChoiceSwitch<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T | null;
  options: readonly T[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-ink/10 bg-white p-[3px]"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md px-3 text-[13px] transition-colors ${
            value === o ? "bg-brand-tint font-semibold text-brand-secondary" : "font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** How the card is labelled in lists and on the haul form (built by the backend from these parts). */
export function LabelPreview({ parts }: { parts: (string | null | undefined)[] }) {
  const label = parts.map((p) => p?.trim()).filter(Boolean).join(" - ");
  return (
    <div className="rounded-lg bg-brand-tint px-3 py-2.5">
      <p className="text-[11.5px] text-ink/55">Shows in lists and on the haul form as</p>
      <p className="truncate text-[13.5px] font-semibold text-ink">{label || "—"}</p>
    </div>
  );
}

export function ActiveSwitch({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] px-3 py-2.5">
      <div>
        <p className="text-[13px] font-semibold text-ink">{active ? "Active" : "Inactive"}</p>
        <p className="text-[12px] text-ink/55">
          {active
            ? "Can be picked on new hauls. Turn off to keep it listed but hidden from the haul form."
            : "Hidden from the haul form. Hauls that already use it keep their cost."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Active"
        onClick={() => onChange(!active)}
        className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors ${active ? "bg-brand" : "bg-ink/20"}`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-[left] ${active ? "left-[19px]" : "left-[3px]"}`}
        />
      </button>
    </div>
  );
}
