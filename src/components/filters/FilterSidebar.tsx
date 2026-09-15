"use client";

import { useEffect, useMemo, useState } from "react";
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
    "h-10 w-full rounded-lg border border-ink/10 bg-surface px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
  const selectClass = `${inputClass} pr-8`;

  if (field.kind === "select") {
    const options = field.dynamic ? dynamicOptions?.[field.key] ?? [] : field.options ?? [];
    return (
      <select
        className={selectClass}
        value={condition?.value ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            onChange(null);
            return;
          }
          onChange({ id: condition?.id ?? newId(), field: field.key, op: "is", value });
        }}
      >
        <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink/10 p-3">
        <div>
          <span className="mb-1 block text-[11px] text-ink/40">Filter by fixed date</span>
          <select
            className={selectClass}
            value={preset}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_DATE_RANGE) {
                // Keep any dates already picked, just switch back to manual entry.
                if (condition) onChange({ ...condition, preset: undefined });
                return;
              }
              const def = DATE_PRESETS.find((p) => p.value === next);
              if (!def) return;
              const { start, end } = def.range();
              onChange({ id: condition?.id ?? newId(), field: field.key, op: "between", start, end, preset: next });
            }}
          >
            <option value={CUSTOM_DATE_RANGE}>Custom date range</option>
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
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
          className="h-4 w-4 rounded border-ink/20 text-brand focus:ring-brand/40"
          checked={checked}
          onChange={(e) => {
            if (!e.target.checked) {
              onChange(null);
              return;
            }
            onChange({ id: condition?.id ?? newId(), field: field.key, op: "is", value: "true" });
          }}
        />
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
}) {
  const [groups, setGroups] = useState<FilterGroup[]>(() => (initialGroups?.length ? initialGroups : [emptyGroup()]));
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setGroups(initialGroups?.length ? initialGroups : [emptyGroup()]);
    setActiveGroupIndex(0);
  }, [open, initialGroups]);

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
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              Editing Group {activeGroupIndex + 1}
            </span>
          </div>

          {sections.map(([section, sectionFields]) => (
            <div key={section} className="mb-6">
              <h3 className="mb-3 border-b border-ink/[0.08] pb-2 text-sm font-semibold text-ink">{section}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {sectionFields.map((field) => (
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
          ))}
        </div>

        {/* Filters summary */}
        <div className="flex h-full w-72 shrink-0 flex-col border-l border-ink/[0.08]">
          <div className="flex items-center justify-between border-b border-ink/[0.08] px-5 py-4">
            <h3 className="text-sm font-semibold text-ink">Filters</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-ink/40 transition hover:bg-ink/[0.06] hover:text-ink"
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
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    gi === activeGroupIndex ? "border-brand/40 bg-brand/[0.04]" : "border-ink/10 hover:border-ink/20"
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
                    <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-sm text-ink/40">
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
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-brand/10 px-3 py-2 text-sm">
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
              className="w-full rounded-xl border border-brand/30 px-3 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/[0.06]"
            >
              + Add filter group
            </button>
          </div>

          <div className="flex shrink-0 gap-1.5 border-t border-ink/[0.08] p-3">
            <button
              type="button"
              disabled={totalConditions === 0}
              onClick={() => {
                const name = window.prompt('Name this view (e.g. "Bid in Process — Wilder")');
                if (name?.trim()) onSaveAsView(name.trim(), groups);
              }}
              className="flex-1 whitespace-nowrap rounded-xl border border-ink/10 px-2 py-2.5 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
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
              className="flex-1 whitespace-nowrap rounded-xl border border-danger/30 px-2 py-2.5 text-xs font-semibold text-danger transition hover:bg-danger/[0.06] disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onApply(groups)}
              className="flex-1 whitespace-nowrap rounded-xl bg-brand px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-secondary"
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
