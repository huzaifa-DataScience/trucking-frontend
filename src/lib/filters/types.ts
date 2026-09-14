export type FilterFieldKind = "text" | "select" | "dateRange";

export interface FilterFieldDef {
  key: string;
  label: string;
  section: string;
  kind: FilterFieldKind;
  options?: { value: string; label: string }[];
}

export type FilterOp = "is" | "contains" | "between";

export interface FilterCondition {
  id: string;
  field: string;
  op: FilterOp;
  value?: string;
  start?: string;
  end?: string;
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
  if (c.op === "contains") {
    if (!c.value?.trim()) return true;
    return fieldValue(row, c.field).toLowerCase().includes(c.value.trim().toLowerCase());
  }
  // between (date range) — inclusive; an empty bound means unbounded on that side.
  const raw = fieldValue(row, c.field);
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
    const opt = field?.options?.find((o) => o.value === c.value);
    return `${label} is ${opt?.label ?? c.value ?? "…"}`;
  }
  if (c.op === "contains") {
    return `${label} contains "${c.value ?? ""}"`;
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
