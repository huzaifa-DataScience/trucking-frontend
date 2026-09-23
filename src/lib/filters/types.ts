import { DATE_PRESETS } from "./datePresets";

export type FilterFieldKind = "text" | "select" | "date" | "dateRange" | "checkbox";

export interface FilterFieldDef {
  key: string;
  label: string;
  section: string;
  kind: FilterFieldKind;
  options?: { value: string; label: string }[];
  /** Overrides the auto-derived "Select {label}" placeholder for select fields. */
  placeholder?: string;
  /** When true, a select field's options come from FilterSidebar's `dynamicOptions[key]` (derived from live data) instead of the static `options` list. */
  dynamic?: boolean;
  /** When true, this field takes its own row in the 2-column grid instead of pairing with a neighbor — the control itself stays the normal single-column width. */
  soloRow?: boolean;
  /** For kind "text" — renders a 3-row textarea instead of a single-line input. */
  multiline?: boolean;
}

export type FilterOp = "is" | "in" | "contains" | "between";

export interface FilterCondition {
  id: string;
  field: string;
  op: FilterOp;
  value?: string;
  /** For op "in" — match if the field equals any of these (a select field with 2+ values picked). */
  values?: string[];
  start?: string;
  end?: string;
  /** For "between" conditions built from a relative-date preset (Today, Last 7 Days, …) — the preset's value, for display and re-selection. */
  preset?: string;
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
}

export interface SavedView {
  id: string;
  name: string;
  groups: FilterGroup[];
}

function fieldValue(row: Record<string, unknown>, key: string): string {
  const raw = row[key];
  return raw == null ? "" : String(raw);
}

function conditionMatches(row: Record<string, unknown>, c: FilterCondition): boolean {
  if (c.op === "is") {
    if (!c.value) return true;
    return fieldValue(row, c.field).toLowerCase() === c.value.toLowerCase();
  }
  if (c.op === "in") {
    if (!c.values || c.values.length === 0) return true;
    const fv = fieldValue(row, c.field).toLowerCase();
    return c.values.some((v) => v.toLowerCase() === fv);
  }
  if (c.op === "contains") {
    if (!c.value?.trim()) return true;
    return fieldValue(row, c.field).toLowerCase().includes(c.value.trim().toLowerCase());
  }
  // between (date range) — inclusive; an empty bound means unbounded on that side.
  // New intake bids often have no bid date yet; match the list API's effective
  // date fallback so a recent bid is not hidden by a null BidDate.
  const raw = fieldValue(row, c.field) || (c.field === "bidDate" ? fieldValue(row, "updatedAt") : "");
  if (!raw) return false;
  const t = new Date(raw.slice(0, 10)).getTime();
  if (Number.isNaN(t)) return false;
  if (c.start) {
    const startT = new Date(c.start).getTime();
    if (!Number.isNaN(startT) && t < startT) return false;
  }
  if (c.end) {
    const endT = new Date(c.end).getTime();
    if (!Number.isNaN(endT) && t > endT) return false;
  }
  return true;
}

/** Groups are OR'd together; conditions within a group are AND'd. Empty groups/conditions match everything. */
export function rowMatchesGroups(row: Record<string, unknown>, groups: FilterGroup[]): boolean {
  const activeGroups = groups.filter((g) => g.conditions.length > 0);
  if (activeGroups.length === 0) return true;
  return activeGroups.some((g) => g.conditions.every((c) => conditionMatches(row, c)));
}

export function describeCondition(fields: FilterFieldDef[], c: FilterCondition): string {
  const field = fields.find((f) => f.key === c.field);
  const label = field?.label ?? c.field;
  if (c.op === "is") {
    if (field?.kind === "checkbox") return label;
    const opt = field?.options?.find((o) => o.value === c.value);
    return `${label} is: ${opt?.label ?? c.value ?? "…"}`;
  }
  if (c.op === "in") {
    const labels = (c.values ?? []).map((v) => field?.options?.find((o) => o.value === v)?.label ?? v);
    if (labels.length === 0) return `${label} …`;
    if (labels.length === 1) return `${label} is: ${labels[0]}`;
    // A colon (not "is") makes clear everything after it is one OR'd group scoped
    // to this field — "A, B, or C" reads unambiguously even at 4+ values, unlike
    // "is any of A, B, C" which some readers parse as "equals A and B and C".
    if (labels.length === 2) return `${label}: ${labels[0]} or ${labels[1]}`;
    return `${label}: ${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
  }
  if (c.op === "contains") {
    return `${label} contains "${c.value ?? ""}"`;
  }
  if (c.preset) {
    const preset = DATE_PRESETS.find((p) => p.value === c.preset);
    if (preset) return `${label} is ${preset.label}`;
  }
  if (c.start && c.end) return `${label} between ${c.start} and ${c.end}`;
  if (c.start) return `${label} on/after ${c.start}`;
  if (c.end) return `${label} on/before ${c.end}`;
  return `${label} …`;
}

export function loadSavedViews(storageKey: string): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedViews(storageKey: string, views: SavedView[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(views));
  } catch {
    /* ignore storage failures */
  }
}
