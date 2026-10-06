"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { newId } from "@/lib/bidding/newId";
import { FilterDateField } from "@/components/filters/FilterDateField";
import {
  describeCondition,
  type FilterCondition,
  type FilterFieldDef,
  type FilterGroup,
} from "@/lib/filters/types";
import { CUSTOM_DATE_RANGE, DATE_PRESETS } from "@/lib/filters/datePresets";

function emptyGroup(): FilterGroup {
  return { id: newId(), conditions: [] };
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[rgba(91,173,232,0.8)] transition ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const glassTriggerClass =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/70 px-3 text-left text-sm shadow-[0_4px_12px_rgba(91,173,232,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md outline-none transition hover:border-[rgba(91,173,232,0.35)] focus-visible:ring-2 focus-visible:ring-[rgba(91,173,232,0.25)]";

function GlassSelect({
  options,
  value,
  values,
  multiple,
  placeholder,
  onPick,
}: {
  options: { value: string; label: string }[];
  value?: string;
  values?: string[];
  multiple?: boolean;
  placeholder: string;
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const picked = new Set(multiple ? values ?? [] : value ? [value] : []);
  const labels = options.filter((option) => picked.has(option.value)).map((option) => option.label);
  const summary = labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 220);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const menuHeight = 256;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight && rect.top > spaceBelow ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6;
      setPos({ top, left, width });
    };
    place();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} type="button" className={glassTriggerClass} onClick={() => setOpen((current) => !current)}>
        <span className={`min-w-0 truncate ${labels.length ? "text-ink" : "text-ink/40"}`}>{summary}</span>
        <MenuChevron open={open} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              className="fixed z-[70] max-h-64 overflow-auto rounded-xl border border-white/80 bg-white/80 p-1.5 shadow-[0_12px_28px_rgba(91,173,232,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl"
            >
              {options.length === 0 ? (
                <p className="px-2 py-2 text-xs text-ink/40">No options</p>
              ) : multiple ? (
                options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink hover:bg-white/80"
                  >
                    <input type="checkbox" className="sr-only" checked={picked.has(option.value)} onChange={() => onPick(option.value)} />
                    <GlassBox checked={picked.has(option.value)} />
                    <span className="min-w-0 leading-snug">{option.label}</span>
                  </label>
                ))
              ) : (
                options.map((option) => {
                  const active = picked.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onPick(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm ${
                        active ? "bg-[rgba(91,173,232,0.16)] font-semibold text-ink" : "text-ink hover:bg-white/80"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function GlassBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_6px_rgba(91,173,232,0.16)] backdrop-blur-md ${
        checked
          ? "border-[rgba(91,173,232,0.25)] bg-[rgba(91,173,232,0.82)]"
          : "border-[rgba(91,173,232,0.35)] bg-white/70"
      }`}
    >
      <svg
        className={`h-3 w-3 text-white ${checked ? "opacity-100" : "opacity-0"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path d="M5 12.5l4.2 4.2L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function GlassChoice({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-white/80 bg-white/55 px-3 py-2 shadow-[0_4px_12px_rgba(91,173,232,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <GlassBox checked={checked} />
      <span className="min-w-0 text-sm leading-snug text-ink">{label}</span>
    </label>
  );
}

function FieldControl({
  field,
  condition,
  onChange,
  dynamicOptions,
}: {
  field: FilterFieldDef;
  condition: FilterCondition | undefined;
  onChange: (next: FilterCondition | null) => void;
  dynamicOptions?: Record<string, { value: string; label: string }[]>;
}) {
  const inputClass =
    "h-10 w-full rounded-xl border border-white/80 bg-white/70 px-3 text-sm text-ink shadow-[0_4px_12px_rgba(91,173,232,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none backdrop-blur-md transition focus:border-[rgba(91,173,232,0.45)] focus:ring-2 focus:ring-[rgba(91,173,232,0.18)]";

  if (field.kind === "select") {
    const options = field.dynamic ? dynamicOptions?.[field.key] ?? [] : field.options ?? [];
    const selected = new Set(condition?.values ?? (condition?.value ? [condition.value] : []));
    const toggle = (value: string) => {
      const next = new Set(selected);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const values = [...next];
      if (values.length === 0) {
        onChange(null);
        return;
      }
      onChange({ id: condition?.id ?? newId(), field: field.key, op: "in", values });
    };
    return (
      <GlassSelect
        multiple
        options={options}
        values={[...selected]}
        placeholder={field.placeholder ?? "Select"}
        onPick={toggle}
      />
    );
  }

  if (field.kind === "date") {
    return (
      <FilterDateField
        ariaLabel={field.label}
        value={condition?.value ?? ""}
        onChange={(value) => {
          if (!value) {
            onChange(null);
            return;
          }
          onChange({ id: condition?.id ?? newId(), field: field.key, op: "is", value });
        }}
      />
    );
  }

  if (field.kind === "dateRange") {
    const preset = condition?.preset ?? CUSTOM_DATE_RANGE;
    return (
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/80 bg-white/55 p-3 shadow-[0_4px_12px_rgba(91,173,232,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
        <div>
          <span className="mb-1 block text-[11px] text-ink/40">Filter by fixed date</span>
          <GlassSelect
            options={[
              { value: CUSTOM_DATE_RANGE, label: "Custom date range" },
              ...DATE_PRESETS.map((preset) => ({ value: preset.value, label: preset.label })),
            ]}
            value={preset}
            placeholder="Custom date range"
            onPick={(next) => {
              if (next === CUSTOM_DATE_RANGE) {
                if (condition) onChange({ ...condition, preset: undefined });
                return;
              }
              const def = DATE_PRESETS.find((p) => p.value === next);
              if (!def) return;
              const { start, end } = def.range();
              onChange({ id: condition?.id ?? newId(), field: field.key, op: "between", start, end, preset: next });
            }}
          />
        </div>

        <div className="flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-[11px] text-ink/40">Start date</span>
            <FilterDateField
              ariaLabel={`${field.label} start`}
              value={condition?.start ?? ""}
              onChange={(start) => {
                const end = condition?.end ?? "";
                if (!start && !end) {
                  onChange(null);
                  return;
                }
                onChange({ id: condition?.id ?? newId(), field: field.key, op: "between", start, end });
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-[11px] text-ink/40">End date</span>
            <FilterDateField
              ariaLabel={`${field.label} end`}
              value={condition?.end ?? ""}
              onChange={(end) => {
                const start = condition?.start ?? "";
                if (!start && !end) {
                  onChange(null);
                  return;
                }
                onChange({ id: condition?.id ?? newId(), field: field.key, op: "between", start, end });
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (field.kind === "checkbox") {
    const checked = condition?.value === "true";
    return (
      <div className="flex h-10 items-center">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => {
            if (!e.target.checked) {
              onChange(null);
              return;
            }
            onChange({ id: condition?.id ?? newId(), field: field.key, op: "is", value: "true" });
          }}
        />
        <GlassBox checked={checked} />
      </div>
    );
  }

  if (field.multiline) {
    return (
      <textarea
        rows={3}
        className={`${inputClass} h-auto resize-y py-2`}
        placeholder="Contains…"
        value={condition?.value ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (!value.trim()) {
            onChange(null);
            return;
          }
          onChange({ id: condition?.id ?? newId(), field: field.key, op: "contains", value });
        }}
      />
    );
  }

  return (
    <input
      type="text"
      className={inputClass}
      placeholder="Contains…"
      value={condition?.value ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        if (!value.trim()) {
          onChange(null);
          return;
        }
        onChange({ id: condition?.id ?? newId(), field: field.key, op: "contains", value });
      }}
    />
  );
}

/**
 * Two-pane advanced filter builder — a scrollable field picker on the left,
 * a running "Filters" summary (groups OR'd, conditions within a group AND'd)
 * on the right. Mirrors the reference CRM's saved-view filter builder.
 * Generic over any field catalog so it can be reused across list pages.
 */
export function FilterSidebar({
  open,
  fields,
  title = "Filters",
  initialGroups,
  onClose,
  onApply,
  onSaveAsView,
  dynamicOptions,
  listFilters,
  selectedListFilters,
  onToggleListFilter,
  listFilterError,
  selectedFieldKeys,
  onToggleField,
}: {
  open: boolean;
  fields: FilterFieldDef[];
  title?: string;
  initialGroups?: FilterGroup[];
  onClose: () => void;
  onApply: (groups: FilterGroup[]) => void;
  onSaveAsView: (name: string, groups: FilterGroup[]) => void;
  /** Live-data-derived option lists for fields marked `dynamic: true`, keyed by field key. */
  dynamicOptions?: Record<string, { value: string; label: string }[]>;
  /** Which quick filters stay visible above the estimates list. Saved in the background. */
  listFilters?: { key: string; label: string }[];
  selectedListFilters?: string[];
  onToggleListFilter?: (key: string, on: boolean) => void;
  listFilterError?: string | null;
  /** When set, Followup fields stay as checkboxes until chosen. Omitted = show every field. */
  selectedFieldKeys?: string[];
  onToggleField?: (key: string, on: boolean) => void;
}) {
  const [groups, setGroups] = useState<FilterGroup[]>(() => (initialGroups?.length ? initialGroups : [emptyGroup()]));
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [panelTab, setPanelTab] = useState<"filters" | "fields">("filters");

  useEffect(() => {
    if (!open) return;
    setGroups(initialGroups?.length ? initialGroups : [emptyGroup()]);
    setActiveGroupIndex(0);
    setPanelTab("filters");
  }, [open, initialGroups]);

  // Lock the page behind the dialog from scrolling while it's open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const activeGroup = groups[activeGroupIndex];

  const setCondition = (field: FilterFieldDef, next: FilterCondition | null) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== activeGroupIndex) return g;
        const rest = g.conditions.filter((c) => c.field !== field.key);
        return { ...g, conditions: next ? [...rest, next] : rest };
      })
    );
  };

  const removeCondition = (groupIndex: number, conditionId: string) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) } : g))
    );
  };

  const addGroup = () => {
    setGroups((prev) => {
      const next = [...prev, emptyGroup()];
      setActiveGroupIndex(next.length - 1);
      return next;
    });
  };

  const removeGroup = (groupIndex: number) => {
    setGroups((prev) => {
      const next = prev.filter((_, i) => i !== groupIndex);
      const safe = next.length ? next : [emptyGroup()];
      setActiveGroupIndex((idx) => Math.min(idx, safe.length - 1));
      return safe;
    });
  };

  const totalConditions = useMemo(() => groups.reduce((n, g) => n + g.conditions.length, 0), [groups]);

  const sections = useMemo(() => {
    const bySection = new Map<string, FilterFieldDef[]>();
    for (const f of fields) {
      const list = bySection.get(f.section) ?? [];
      list.push(f);
      bySection.set(f.section, list);
    }
    return [...bySection.entries()];
  }, [fields]);

  const choosingFields = Boolean(onToggleField);

  const fieldChosen = (key: string) =>
    !choosingFields ||
    (selectedFieldKeys?.includes(key) ?? false) ||
    groups.some((group) => group.conditions.some((condition) => condition.field === key));

  const toggleField = (field: FilterFieldDef, on: boolean) => {
    if (!on) {
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          conditions: group.conditions.filter((condition) => condition.field !== field.key),
        }))
      );
    }
    onToggleField?.(field.key, on);
  };

  if (!open) return null;

  // Portal to <body> — this dialog is `fixed`, and an ancestor page root runs a persistent
  // entrance animation (`ui-animate-in`, `animation-fill-mode: both`) that leaves a non-none
  // `transform` applied after it finishes. Any such transform makes the element a containing
  // block for `position: fixed` descendants, so without the portal this dialog positions
  // itself relative to that ancestor's box instead of the real viewport — pushing the footer
  // off-screen on shorter viewports. Portaling out of the page tree avoids the whole class of bug.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex h-full w-full max-w-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Field picker */}
        <div className={`min-w-0 flex-1 overflow-y-auto bg-[#f0f1f4] p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {choosingFields && panelTab === "filters" ? (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                Editing Group {activeGroupIndex + 1}
              </span>
            ) : null}
          </div>

          {choosingFields ? (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/80 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(91,173,232,0.06)] backdrop-blur-md">
              {(
                [
                  ["filters", "Filters"],
                  ["fields", "Choose fields"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanelTab(id)}
                  className={`h-9 rounded-lg text-sm font-semibold transition ${
                    panelTab === id
                      ? "bg-white/80 text-ink shadow-[0_4px_12px_rgba(91,173,232,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]"
                      : "text-ink/55 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {panelTab === "fields" && choosingFields ? (
            <>
              {listFilters && listFilters.length > 0 ? (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-ink">Show above the list</h3>
                  <div className="grid grid-cols-2 items-stretch gap-2">
                    {listFilters.map((item) => (
                      <GlassChoice
                        key={item.key}
                        label={item.label}
                        checked={selectedListFilters?.includes(item.key) ?? false}
                        onChange={(on) => onToggleListFilter?.(item.key, on)}
                      />
                    ))}
                  </div>
                  {listFilterError ? <p className="mt-2 text-xs text-danger">{listFilterError}</p> : null}
                </div>
              ) : null}

              {sections.map(([section, sectionFields]) => (
                <div key={section} className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-ink">{section}</h3>
                  <div className="grid grid-cols-2 items-stretch gap-2">
                    {sectionFields.map((field) => (
                      <GlassChoice
                        key={field.key}
                        label={field.label}
                        checked={fieldChosen(field.key)}
                        onChange={(on) => toggleField(field, on)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {sections.map(([section, sectionFields]) => {
                const visible = choosingFields
                  ? sectionFields.filter((field) => fieldChosen(field.key))
                  : sectionFields;
                if (visible.length === 0) return null;
                return (
                  <div key={section} className="mb-6">
                    <h3 className="mb-3 border-b border-ink/[0.08] pb-2 text-sm font-semibold text-ink">{section}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {visible.map((field) => (
                        <label
                          key={field.key}
                          className={`flex min-w-0 flex-col gap-1.5 ${field.soloRow ? "sm:col-span-2" : ""}`}
                        >
                          <span className="text-xs font-medium text-ink/55">{field.label}</span>
                          <div className={field.soloRow ? "sm:w-1/2" : undefined}>
                            <FieldControl
                              field={field}
                              condition={activeGroup?.conditions.find((c) => c.field === field.key)}
                              onChange={(next) => setCondition(field, next)}
                              dynamicOptions={dynamicOptions}
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {choosingFields && sections.every(([, sectionFields]) => sectionFields.every((field) => !fieldChosen(field.key))) ? (
                <p className="text-sm text-ink/45">Choose fields to add filters.</p>
              ) : null}
            </>
          )}
        </div>

        {/* Filters summary */}
        <div className="flex h-full w-72 shrink-0 flex-col border-l border-white/70 bg-[#f0f1f4]">
          <div className="flex items-center justify-between border-b border-white/70 px-5 py-4">
            <h3 className="text-sm font-semibold text-ink">Filters</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-white/80 bg-white/60 p-1.5 text-ink/50 shadow-[0_2px_8px_rgba(91,173,232,0.08)] backdrop-blur-md transition hover:text-ink"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {groups.map((g, gi) => (
              <div key={g.id}>
                {gi > 0 ? (
                  <div className="my-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink/35">
                    <span className="h-px flex-1 bg-ink/[0.08]" />
                    OR
                    <span className="h-px flex-1 bg-ink/[0.08]" />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveGroupIndex(gi)}
                  className={`w-full rounded-xl border p-3 text-left shadow-[0_4px_12px_rgba(91,173,232,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition ${
                    gi === activeGroupIndex
                      ? "border-[rgba(91,173,232,0.35)] bg-[rgba(91,173,232,0.1)]"
                      : "border-white/80 bg-white/60 hover:border-[rgba(91,173,232,0.25)]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink/45">Group {gi + 1}</span>
                    {groups.length > 1 ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGroup(gi);
                        }}
                        className="rounded-md p-1 text-ink/30 hover:bg-ink/[0.06] hover:text-danger"
                      >
                        <TrashIcon />
                      </span>
                    ) : null}
                  </div>
                  {g.conditions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[rgba(91,173,232,0.28)] bg-white/40 px-3 py-2.5 text-xs text-ink/40">
                      Your filter will appear here
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {g.conditions.map((c, ci) => {
                        const desc = describeCondition(fields, c);
                        const splitIdx = desc.indexOf(" is ");
                        return (
                          <div key={c.id}>
                            {ci > 0 ? <p className="py-0.5 text-center text-[11px] font-semibold text-ink/35">and</p> : null}
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/75 px-3 py-2 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                              <span className="min-w-0 truncate text-ink">
                                {splitIdx === -1 ? (
                                  desc
                                ) : (
                                  <>
                                    {desc.slice(0, splitIdx)}
                                    <span className="font-semibold">{desc.slice(splitIdx)}</span>
                                  </>
                                )}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCondition(gi, c.id);
                                }}
                                className="shrink-0 rounded p-0.5 text-ink/40 hover:text-danger"
                              >
                                <TrashIcon />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              </div>
            ))}

            <div className="my-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink/35">
              <span className="h-px flex-1 bg-ink/[0.08]" />
              OR
              <span className="h-px flex-1 bg-ink/[0.08]" />
            </div>
            <button
              type="button"
              onClick={addGroup}
              className="w-full rounded-xl border border-[rgba(91,173,232,0.35)] bg-white/55 px-3 py-2.5 text-xs font-semibold text-brand shadow-[0_4px_12px_rgba(91,173,232,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition hover:bg-[rgba(91,173,232,0.08)]"
            >
              + Add filter group
            </button>
          </div>

          <div className="flex shrink-0 gap-1.5 border-t border-white/70 p-3">
            <button
              type="button"
              disabled={totalConditions === 0}
              onClick={() => {
                const name = window.prompt('Name this view (e.g. "Bid in Process — Wilder")');
                if (name?.trim()) onSaveAsView(name.trim(), groups);
              }}
              className="flex-1 whitespace-nowrap rounded-xl border border-white/80 bg-white/70 px-2 py-2.5 text-xs font-semibold text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              Save List
            </button>
            <button
              type="button"
              disabled={totalConditions === 0}
              onClick={() => {
                setGroups([emptyGroup()]);
                setActiveGroupIndex(0);
              }}
              className="flex-1 whitespace-nowrap rounded-xl border border-[rgba(220,38,38,0.25)] bg-white/70 px-2 py-2.5 text-xs font-semibold text-danger shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition hover:bg-danger/[0.06] disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onApply(groups)}
              className="flex-1 whitespace-nowrap rounded-xl bg-[rgba(91,173,232,0.92)] px-2 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(91,173,232,0.28)] transition hover:bg-brand-secondary"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
