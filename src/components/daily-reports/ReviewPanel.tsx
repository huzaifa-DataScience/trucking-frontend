"use client";

import type { ReactNode } from "react";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type {
  DailyReportTemplate,
  ExtractedField,
  FieldDef,
  FieldValue,
  ReviewIssue,
  ReviewResult,
} from "@/lib/api/endpoints/daily-reports";

export type Corrections = Record<string, FieldValue>;

/** "HH:MM" (24h) → "7:05 AM". */
export function to12h(hhmm: string): string {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export function minutesLabel(min: number | null): string {
  if (min == null) return "—";
  const sign = min < 0 ? "−" : "";
  const abs = Math.abs(min);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

function displayValue(def: FieldDef, value: FieldValue): FieldValue {
  if (def.type === "time" && typeof value === "string") return to12h(value);
  return value;
}

const SEVERITY: Record<ReviewIssue["severity"], { tone: StatusTone; label: string }> = {
  blocking: { tone: "danger", label: "Must fix" },
  warning: { tone: "warning", label: "Check" },
  info: { tone: "info", label: "Note" },
};

function fieldBadge(f: ExtractedField | undefined, edited: boolean, lowConfidence: number): ReactNode {
  if (edited) return <StatusPill tone="info" label="Edited" />;
  if (!f) return null;
  if (f.status === "unreadable") return <StatusPill tone="danger" label="Unreadable" />;
  if (f.status === "conflict") return <StatusPill tone="danger" label="Conflicting marks" />;
  if (f.status === "invalid") return <StatusPill tone="danger" label="Invalid" />;
  if (f.status === "not_applicable") return <StatusPill tone="neutral" label="N/A" />;
  if (f.status === "value" && f.confidence != null && f.confidence < lowConfidence) {
    return <StatusPill tone="warning" label={`Low ${Math.round(f.confidence * 100)}%`} />;
  }
  return null;
}

const inputClass =
  "h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand focus:ring-2 focus:ring-brand/15";

function Chips({
  options,
  selected,
  onToggle,
  label,
  optionLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  label: string;
  optionLabel?: (o: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`h-7 min-w-8 rounded-md border px-2 text-[12px] font-medium transition-colors ${
              on ? "border-brand bg-brand text-white" : "border-[var(--border-subtle)] bg-white text-ink-muted hover:border-brand/40 hover:text-ink"
            }`}
          >
            {optionLabel ? optionLabel(o) : o}
          </button>
        );
      })}
    </div>
  );
}

function FieldInput({
  def,
  value,
  onChange,
  optionLabel,
}: {
  def: FieldDef;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  optionLabel?: (o: string) => string;
}) {
  const id = `field-${def.key}`;
  switch (def.type) {
    case "yesno":
    case "choice": {
      const options = def.type === "yesno" ? ["yes", "no"] : def.options ?? [];
      const current = typeof value === "string" ? value : null;
      return (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-labelledby={`${id}-label`} id={id}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={current === o}
              onClick={() => onChange(current === o ? null : o)}
              className={`h-7 min-w-9 rounded-md border px-2 text-[12px] font-medium capitalize transition-colors ${
                current === o ? "border-brand bg-brand text-white" : "border-[var(--border-subtle)] bg-white text-ink-muted hover:border-brand/40 hover:text-ink"
              }`}
            >
              {optionLabel ? optionLabel(o) : o}
            </button>
          ))}
        </div>
      );
    }
    case "multi": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div id={id}>
          <Chips
            label={def.label}
            options={def.options ?? []}
            selected={selected}
            optionLabel={optionLabel}
            onToggle={(o) => onChange(selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o])}
          />
        </div>
      );
    }
    default:
      return (
        <input
          id={id}
          className={inputClass}
          inputMode={def.type === "number" ? "decimal" : undefined}
          placeholder={def.type === "time" ? "7:00 AM" : undefined}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-labelledby={`${id}-label`}
        />
      );
  }
}

export function ReviewPanel({
  template,
  original,
  current,
  review,
  corrections,
  onCorrect,
  checking,
}: {
  template: DailyReportTemplate;
  /** As extracted — used to show what a correction replaced. */
  original: ExtractedField[];
  current: ExtractedField[];
  review: ReviewResult;
  corrections: Corrections;
  onCorrect: (key: string, value: FieldValue) => void;
  checking: boolean;
}) {
  const byKey = new Map(current.map((f) => [f.key, f]));
  const originalByKey = new Map(original.map((f) => [f.key, f]));
  const flagged = new Set(review.issues.filter((i) => i.severity !== "info").flatMap((i) => i.fields));
  const systemLabel = new Map(template.systems.map((s) => [s.code, s.label]));
  const low = template.rules.lowConfidence;

  const valueFor = (def: FieldDef): FieldValue => {
    if (Object.prototype.hasOwnProperty.call(corrections, def.key)) return corrections[def.key];
    const f = byKey.get(def.key);
    return f?.status === "value" ? displayValue(def, f.value) : null;
  };

  const focusField = (key: string) => {
    const el = document.getElementById(`field-${key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el?.querySelector("button, input") as HTMLElement | null)?.focus({ preventScroll: true });
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  };

  const row = (def: FieldDef) => {
    const edited = Object.prototype.hasOwnProperty.call(corrections, def.key);
    const orig = originalByKey.get(def.key);
    const origShown = orig?.status === "value" ? displayValue(def, orig.value) : orig?.status ?? null;
    return (
      <div key={def.key} className={`grid gap-1.5 rounded-md px-2 py-2 ${flagged.has(def.key) ? "bg-warning-tint/60" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <span id={`field-${def.key}-label`} className="text-[12px] font-medium text-ink-muted">
            {def.label}
            {def.unit ? <span className="ml-1 text-ink-soft">({def.unit})</span> : null}
            {def.sensitive ? <span className="ml-1.5 rounded bg-[#f3f4f6] px-1 text-[10px] font-semibold text-ink-muted">HR</span> : null}
          </span>
          {fieldBadge(byKey.get(def.key), edited, low)}
        </div>
        <FieldInput
          def={def}
          value={valueFor(def)}
          onChange={(v) => onCorrect(def.key, v)}
          optionLabel={def.key === "systems" ? (o) => systemLabel.get(o) ?? o : undefined}
        />
        {edited ? (
          <p className="text-[11.5px] text-ink-soft">
            Extracted: {Array.isArray(origShown) ? origShown.join(", ") || "—" : origShown == null || origShown === "" ? "—" : String(origShown)}
          </p>
        ) : null}
      </div>
    );
  };

  const fieldsIn = (section: string) => template.fields.filter((f) => f.section === section);
  const blocking = review.issues.filter((i) => i.severity === "blocking").length;
  const t = review.time;

  // Piping as a grid: one row per material, columns qty / sizes / hours / type.
  const pipingDefs = fieldsIn("piping");
  const materials = [...new Set(pipingDefs.map((d) => d.key.replace(/^piping_(.+)_(qty|sizes|hours|variant)$/, "$1")))];
  const pipingCell = (material: string, part: string) => {
    const def = pipingDefs.find((d) => d.key === `piping_${material}_${part}`);
    if (!def) return <td className="px-1.5 py-1" />;
    const edited = Object.prototype.hasOwnProperty.call(corrections, def.key);
    const f = byKey.get(def.key);
    const warn = flagged.has(def.key) || (f && ["unreadable", "conflict", "invalid"].includes(f.status));
    const v = valueFor(def);
    return (
      <td className="px-1.5 py-1">
        <input
          id={`field-${def.key}`}
          aria-label={def.label}
          className={`${inputClass} h-8 ${warn ? "border-warning bg-warning-tint/50" : ""} ${edited ? "border-info" : ""}`}
          inputMode={def.type === "number" ? "decimal" : undefined}
          value={v == null ? "" : String(v)}
          title={f && f.status !== "value" && f.status !== "empty" ? f.status : undefined}
          onChange={(e) => onCorrect(def.key, e.target.value)}
        />
      </td>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* Checks */}
      <section className="rounded-lg border border-[var(--border-subtle)] bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-ink">Checks</h2>
          <span className="text-[12px] text-ink-muted" aria-live="polite">
            {checking ? "Re-checking…" : blocking ? `${blocking} must be fixed` : review.issues.length ? "No blocking issues" : "All clear"}
          </span>
        </div>
        {review.issues.length ? (
          <ul className="max-h-56 divide-y divide-[var(--border-subtle)] overflow-auto">
            {review.issues.map((issue, i) => (
              <li key={`${issue.code}-${i}`}>
                <button
                  type="button"
                  onClick={() => issue.fields[0] && focusField(issue.fields[0])}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-[#fafbfc]"
                >
                  <StatusPill tone={SEVERITY[issue.severity].tone} label={SEVERITY[issue.severity].label} className="shrink-0" />
                  <span className="text-ink">{issue.message}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-[13px] text-ink-muted">Nothing flagged.</p>
        )}
      </section>

      {/* Time summary */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-4">
        {[
          ["Work date", review.workDate ?? "—"],
          ["Calculated", minutesLabel(t.calculatedMinutes)],
          ["Reported", minutesLabel(t.reportedMinutes)],
          ["Difference", minutesLabel(t.discrepancyMinutes)],
          ["Shift", `${minutesLabel(t.shiftMinutes)}${t.overnight ? " · overnight" : ""}`],
          ["Lunch", minutesLabel(t.lunchMinutes)],
          ["Piping hours", minutesLabel(t.allocatedMinutes)],
          ["Unallocated", minutesLabel(t.unallocatedMinutes)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-3 py-2">
            <p className="text-[11.5px] text-ink-muted">{label}</p>
            <p className="text-[14px] font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </section>

      {/* Fields */}
      {template.sections.map((section) => {
        const defs = fieldsIn(section.id);
        if (!defs.length) return null;
        return (
          <section key={section.id} className="rounded-lg border border-[var(--border-subtle)] bg-white">
            <h2 className="border-b border-[var(--border-subtle)] px-4 py-2.5 text-[14px] font-semibold text-ink">{section.label}</h2>
            {section.id === "piping" ? (
              <div className="overflow-x-auto px-2 py-2">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="px-1.5 py-1">Material</th>
                      <th className="px-1.5 py-1">Qty</th>
                      <th className="px-1.5 py-1">Sizes</th>
                      <th className="px-1.5 py-1">Hrs</th>
                      <th className="px-1.5 py-1">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => {
                      const qty = pipingDefs.find((d) => d.key === `piping_${m}_qty`);
                      return (
                        <tr key={m}>
                          <td className="whitespace-nowrap px-1.5 py-1 text-[13px] text-ink">
                            {qty?.label.replace(/ — quantity$/, "")}
                            {qty?.unit ? <span className="ml-1 text-[11px] text-ink-soft">{qty.unit}</span> : null}
                          </td>
                          {pipingCell(m, "qty")}
                          {pipingCell(m, "sizes")}
                          {pipingCell(m, "hours")}
                          {pipingCell(m, "variant")}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-x-3 px-2 py-2 md:grid-cols-2">{defs.map(row)}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
