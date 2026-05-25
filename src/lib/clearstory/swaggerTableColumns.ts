/**
 * Derive stable columns from swagger + typedMirror (frontend-clearstory-tables-draft.md).
 * - Nested **objects** in JSON → one column + modal.
 * - SQL / typed mirrors often use **dotted flat keys** (`CUSTOMER.NAME`, `CUSTOMER.ID`) — we **group** by the
 *   first segment (`CUSTOMER`) into one column + modal instead of many columns.
 */

const MAX_TOP_LEVEL_COLUMNS = 60;

export type TableColumnSpec =
  | { kind: "group"; prefix: string }
  | { kind: "single"; key: string };

export function humanizeColumnKey(key: string): string {
  const k = key.trim();
  if (!k) return key;

  // Preserve common acronyms.
  const ACRONYMS = new Set(["id", "url", "api", "uuid"]);

  // Turn snake_case and kebab-case into spaces first.
  const spaced = k.replace(/[_-]+/g, " ");

  // Insert spaces for camelCase/PascalCase boundaries.
  // - fooBar -> foo Bar
  // - FooBAR -> Foo BAR (keeps acronym-ish chunks)
  const withBoundaries = spaced
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  const words = withBoundaries.split(/\s+/).filter(Boolean);
  const titled = words
    .map((w) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      // If already all caps (e.g. CUSTOMER), keep it but Title-ize long words.
      if (/^[A-Z0-9]+$/.test(w) && w.length <= 4) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  return titled;
}

export function tableColumnLabel(spec: TableColumnSpec): string {
  // Display label only; the actual key/prefix is preserved in spec.
  return spec.kind === "group" ? humanizeColumnKey(spec.prefix) : humanizeColumnKey(spec.key);
}

function looksLikeIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value);
}

function formatIsoDateLike(value: string): string {
  if (!looksLikeIsoDateString(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function looksLikeHtmlString(value: string): boolean {
  // Cheap heuristic: any tag-like substring.
  return /<\s*\/?\s*[a-zA-Z][^>]*>/.test(value);
}

function stripHtmlForPreview(value: string): string {
  // Preserve paragraph-ish breaks a bit so the preview doesn't become unreadable.
  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p(\s+[^>]*)?>/gi, "");

  const noTags = withBreaks.replace(/<[^>]+>/g, " ");
  return noTags.replace(/\s+/g, " ").trim();
}

export function getAtPath(obj: unknown, path: string): unknown {
  if (obj == null || path === "") return undefined;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Value for one top-level column: prefer `swagger[key]`, else `typedMirror[key]`. */
export function getSwaggerOrMirrorTopLevel(row: { swagger: Record<string, unknown> | null; typedMirror: Record<string, unknown> }, key: string): unknown {
  if (row.swagger && Object.prototype.hasOwnProperty.call(row.swagger, key)) {
    return row.swagger[key];
  }
  if (Object.prototype.hasOwnProperty.call(row.typedMirror, key)) {
    return row.typedMirror[key];
  }
  return undefined;
}

function assignGroupedRoot(out: Record<string, unknown>, value: unknown, prefix: string): void {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    Object.assign(out, value as Record<string, unknown>);
    return;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          Object.assign(out, parsed as Record<string, unknown>);
          return;
        }
      } catch {
        /* fall through */
      }
    }
  }
  out._root = value;
}

/**
 * Merge `prefix` and every `prefix.*` key from swagger then typedMirror (swagger wins on duplicate keys).
 * Suffix after the **first** dot becomes a field inside the modal object (e.g. `CUSTOMER.NAME` → `NAME`).
 */
export function getGroupedSwaggerOrMirrorValue(
  row: { swagger: Record<string, unknown> | null; typedMirror: Record<string, unknown> },
  prefix: string
): unknown {
  const out: Record<string, unknown> = {};

  const absorb = (layer: Record<string, unknown> | null) => {
    if (!layer) return;
    for (const [k, v] of Object.entries(layer)) {
      if (k === prefix) {
        assignGroupedRoot(out, v, prefix);
      } else if (k.startsWith(`${prefix}.`)) {
        const suffix = k.slice(prefix.length + 1);
        if (suffix) out[suffix] = v;
      }
    }
  };

  absorb(row.typedMirror);
  absorb(row.swagger);

  if (Object.keys(out).length === 0) return undefined;
  return out;
}

export function isNestedCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return true;
  return typeof value === "object";
}

/**
 * Stringified JSON in a single column (common in typed mirrors) → open modal instead of a truncated cell.
 */
export function parseStringJsonIfObject(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (!(t.startsWith("{") && t.endsWith("}")) && !(t.startsWith("[") && t.endsWith("]"))) return value;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return value;
  }
}

export function nestedValueSummary(value: unknown): string {
  if (Array.isArray(value)) return `Array (${value.length})`;
  if (value && typeof value === "object") {
    const n = Object.keys(value as object).length;
    return `Object (${n} ${n === 1 ? "field" : "fields"})`;
  }
  return "View";
}

export function formatSwaggerCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    const dateFormatted = formatIsoDateLike(value);
    // Only strip HTML if it wasn't an ISO date string.
    if (dateFormatted !== value) return dateFormatted;
    return looksLikeHtmlString(value) ? stripHtmlForPreview(value) : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const PREVIEW_MAX_LEN = 140;

function findObjectKeyIgnoreCase(obj: Record<string, unknown>, wantedLower: string): string | undefined {
  return Object.keys(obj).find((k) => k.toLowerCase() === wantedLower);
}

function truncatePreview(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.length > PREVIEW_MAX_LEN ? `${t.slice(0, PREVIEW_MAX_LEN - 1)}…` : t;
}

/**
 * Short text for a table cell when the full value opens in a modal.
 * Prefers a string-like **`name`** (any key casing), then title, label, displayName, description.
 */
export function subObjectCellPreview(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (value.length === 0) return "0 items";
    const first = value[0];
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      const inner = subObjectCellPreview(first);
      if (inner) return value.length > 1 ? `${inner} · +${value.length - 1} more` : inner;
    }
    return `${value.length} items`;
  }
  if (typeof value !== "object") return "";
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o);

  for (const candidate of ["name", "title", "label", "displayname", "description"] as const) {
    const k = findObjectKeyIgnoreCase(o, candidate);
    if (k === undefined) continue;
    const v = o[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      const s = truncatePreview(String(v));
      if (s) return s;
    }
  }

  const onlyRoot = keys.length === 1 && keys[0] === "_root";
  if (onlyRoot) {
    return truncatePreview(formatSwaggerCell(o._root));
  }

  const n = keys.filter((k) => k !== "_root").length || keys.length;
  return n ? `${n} field${n === 1 ? "" : "s"}` : "";
}

/** Primitives in-cell; objects/arrays or JSON strings → modal payload. */
export function expandCellForModal(raw: unknown): { modal: unknown } | { text: string } | { empty: true } {
  if (raw === undefined) return { empty: true };
  const parsed = parseStringJsonIfObject(raw);
  if (isNestedCellValue(parsed)) return { modal: parsed };
  if (typeof raw === "string") {
    // Long or HTML-ish strings (e.g. description) are better in a modal.
    if (raw.length > 180 || looksLikeHtmlString(raw)) return { modal: raw };
  }
  const text = formatSwaggerCell(raw);
  return { text };
}

function collectFlatKeys(
  rows: { swagger: Record<string, unknown> | null; typedMirror: Record<string, unknown> }[],
  sampleSize: number
): string[] {
  const out = new Set<string>();
  const n = Math.min(sampleSize, rows.length);
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    if (r?.swagger && typeof r.swagger === "object") {
      for (const k of Object.keys(r.swagger)) out.add(k);
    }
    if (r?.typedMirror && typeof r.typedMirror === "object") {
      for (const k of Object.keys(r.typedMirror)) out.add(k);
    }
  }
  return [...out];
}

/**
 * Build column specs: dotted keys (`A.B`) collapse into one group column `A`.
 * Bare `A` is omitted as its own column when any `A.*` exists (merged into group `A`).
 */
export function buildTableColumnSpecs(
  rows: { swagger: Record<string, unknown> | null; typedMirror: Record<string, unknown> }[],
  sampleSize = 10
): TableColumnSpec[] {
  const flatKeys = collectFlatKeys(rows, sampleSize);
  const prefixesFromDots = new Set<string>();
  for (const k of flatKeys) {
    const dot = k.indexOf(".");
    if (dot > 0) prefixesFromDots.add(k.slice(0, dot));
  }

  const groups: TableColumnSpec[] = [...prefixesFromDots].sort().map((prefix) => ({ kind: "group" as const, prefix }));

  const singles: TableColumnSpec[] = flatKeys
    .filter((k) => !k.includes(".") && !prefixesFromDots.has(k))
    .sort()
    .map((key) => ({ kind: "single" as const, key }));

  const rank = (spec: TableColumnSpec): number => {
    if (spec.kind === "single" && spec.key.toLowerCase() === "id") return -1000; // always first
    return 0;
  };

  const combined = [...groups, ...singles].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;

    // Stable alphabetical by display label, then by raw key/prefix.
    const la = tableColumnLabel(a);
    const lb = tableColumnLabel(b);
    const c = la.localeCompare(lb);
    if (c !== 0) return c;
    const ka = a.kind === "group" ? a.prefix : a.key;
    const kb = b.kind === "group" ? b.prefix : b.key;
    return ka.localeCompare(kb);
  });
  return combined.slice(0, MAX_TOP_LEVEL_COLUMNS);
}

/** Raw key union (debug); prefer `buildTableColumnSpecs` for the grid. */
export function buildSwaggerTopLevelColumnKeys(
  rows: { swagger: Record<string, unknown> | null; typedMirror: Record<string, unknown> }[],
  sampleSize = 10
): string[] {
  return collectFlatKeys(rows, sampleSize).sort((a, b) => a.localeCompare(b)).slice(0, MAX_TOP_LEVEL_COLUMNS);
}

/** @deprecated Use `buildTableColumnSpecs` (groups dotted keys). */
export const buildSwaggerColumnPaths = buildSwaggerTopLevelColumnKeys;
