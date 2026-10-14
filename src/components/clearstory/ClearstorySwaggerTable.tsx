"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";
import { JsonPayloadModal } from "@/components/clearstory/JsonPayloadModal";
import { ClearstoryTablePagination } from "@/components/clearstory/ClearstoryTablePagination";
import type { ClearstoryTableRow } from "@/lib/api/endpoints/clearstory";
import type { TableColumnSpec } from "@/lib/clearstory/swaggerTableColumns";
import {
  buildTableColumnSpecs,
  expandCellForModal,
  getGroupedSwaggerOrMirrorValue,
  getSwaggerOrMirrorTopLevel,
  nestedValueSummary,
  subObjectCellPreview,
  tableColumnLabel,
} from "@/lib/clearstory/swaggerTableColumns";


type SortState = { key: string; dir: SortDir } | null;

function sortValueFor(row: ClearstoryTableRow, spec: TableColumnSpec): unknown {
  if (spec.kind === "group") {
    const raw = getGroupedSwaggerOrMirrorValue(row, spec.prefix);
    return subObjectCellPreview(raw) || nestedValueSummary(raw);
  }
  return getSwaggerOrMirrorTopLevel(row, spec.key);
}

function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const aStr = typeof a === "string" ? a : String(a);
  const bStr = typeof b === "string" ? b : String(b);

  const aNum = Number(aStr);
  const bNum = Number(bStr);
  if (aStr !== "" && bStr !== "" && !Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return aStr.localeCompare(bStr);
}

const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

/**
 * Divider on the rightmost pinned column. An inset shadow, not border-r: with border-collapse the table grid
 * owns borders, so a border stays behind (and scrolls away) while the sticky cell slides.
 */
const PINNED_DIVIDER = "shadow-[inset_-1px_0_0_var(--border-subtle)]";

/** Sticky-left classes for pinned columns. `isLast` puts the divider only on the rightmost pinned column. */
export function pinnedHeaderClass(isLast: boolean): string {
  return `sticky z-30 bg-[#f3f4f6] ${isLast ? PINNED_DIVIDER : ""}`;
}
export function pinnedBodyClass(zebra: boolean, isLast: boolean): string {
  // Sticky cells must be opaque or scrolled columns show through: #fafafa = canvas/50 flattened onto white.
  // Follow the row's hover colour so the pinned part doesn't stay pale while the rest highlights.
  return `sticky z-10 ${zebra ? "bg-[#fafafa]" : "bg-white"} [tr:hover>&]:bg-canvas ${isLast ? PINNED_DIVIDER : ""}`;
}

export function loadHiddenColumns(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function loadPinnedColumns(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Column pin state + sticky-left pixel offsets for as many pinned columns as the user wants.
 * `lockedKey` (the id column) is always pinned first and can't be unpinned.
 */
export function useColumnPinning({
  storageKey,
  lockedKey,
}: {
  storageKey: string;
  lockedKey?: string;
}) {
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => loadPinnedColumns(storageKey));

  useEffect(() => {
    setPinnedKeys(loadPinnedColumns(storageKey));
  }, [storageKey]);

  const togglePin = (key: string) => {
    if (key === lockedKey) return;
    setPinnedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const effectivePinnedOrder = useMemo(() => {
    const rest = pinnedKeys.filter((k) => k !== lockedKey);
    return lockedKey ? [lockedKey, ...rest] : rest;
  }, [pinnedKeys, lockedKey]);

  return { pinnedKeys, togglePin, effectivePinnedOrder };
}

/** Orders headers pinned-first (in pin order), measures their rendered widths, and returns cumulative left offsets. */
export function useStickyOffsets(
  orderedPinnedKeys: string[],
  cellRefs: React.MutableRefObject<Map<string, HTMLTableCellElement>>,
  deps: unknown[]
) {
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    let acc = 0;
    for (const key of orderedPinnedKeys) {
      next[key] = acc;
      const el = cellRefs.current.get(key);
      acc += el ? el.offsetWidth : 0;
    }
    setOffsets(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedPinnedKeys.join("|"), ...deps]);

  return offsets;
}

function PinIcon({ filled, className = "h-3.5 w-3.5" }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M12 2l1.5 5.5L19 9l-4.5 3.5L16 18l-4-3-4 3 1.5-5.5L5 9l5.5-1.5L12 2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function ColumnPickerButton({
  columns,
  hidden,
  lockedKey,
  lockedKeys,
  onToggle,
  pinned,
  onTogglePin,
  iconOnly = false,
  outline = false,
  order,
  onReorder,
  onResetOrder,
  orderChanged = false,
}: {
  columns: { key: string; label: string }[];
  hidden: Set<string>;
  lockedKey?: string;
  /** Prefer over single `lockedKey` when more than one column must stay visible. */
  lockedKeys?: string[];
  /** Show/hide checkboxes; leave out for tables that only allow reordering. */
  onToggle?: (key: string) => void;
  /** When provided, each row gets a pin toggle (unlimited columns can be pinned). */
  pinned?: Set<string>;
  onTogglePin?: (key: string) => void;
  /** Square icon button (count dot instead of text badges). */
  iconOnly?: boolean;
  /** Labelled button with the white bordered field style (for toolbars inside a white panel). */
  outline?: boolean;
  /** Shown columns in table order. With `onReorder`, shown rows can be dragged to change the order. */
  order?: string[];
  onReorder?: (keys: string[]) => void;
  /** "Reset order" link, shown when `orderChanged`. */
  onResetOrder?: () => void;
  orderChanged?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const lockedSet = useMemo(
    () => new Set<string>([...(lockedKeys ?? []), ...(lockedKey ? [lockedKey] : [])]),
    [lockedKey, lockedKeys]
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hiddenCount = columns.filter((c) => hidden.has(c.key) && !lockedSet.has(c.key)).length;
  const pinnedCount = columns.filter((c) => !lockedSet.has(c.key) && (pinned?.has(c.key) ?? false)).length;
  const hiddenNames = columns.filter((c) => hidden.has(c.key) && !lockedSet.has(c.key)).map((c) => c.label);
  const pinnedNames = columns.filter((c) => !lockedSet.has(c.key) && (pinned?.has(c.key) ?? false)).map((c) => c.label);

  // Reordering: shown columns first in table order (draggable), then hidden ones.
  const reorderable = Boolean(onReorder && order);
  const shownOrder = reorderable ? (order ?? []).filter((k) => columns.some((c) => c.key === k)) : [];
  const labelOf = new Map(columns.map((c) => [c.key, c.label]));
  const menuRows: { key: string; label: string; section: "shown" | "hidden" | "all" }[] = reorderable
    ? [
        ...shownOrder.map((k) => ({ key: k, label: labelOf.get(k) ?? k, section: "shown" as const })),
        ...columns.filter((c) => !shownOrder.includes(c.key)).map((c) => ({ ...c, section: "hidden" as const })),
      ]
    : columns.map((c) => ({ ...c, section: "all" as const }));
  const dropOn = (targetKey: string) => {
    if (!dragKey || !onReorder) return;
    const from = shownOrder.indexOf(dragKey);
    // Fixed columns stay at the start.
    const firstMovable = shownOrder.findIndex((k) => !lockedSet.has(k));
    const to = Math.max(shownOrder.indexOf(targetKey), firstMovable < 0 ? 0 : firstMovable);
    setDragKey(null);
    setOverKey(null);
    if (from < 0 || from === to) return;
    const next = [...shownOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          [
            pinnedNames.length ? `Pinned: ${pinnedNames.join(", ")}` : null,
            hiddenNames.length ? `Hidden: ${hiddenNames.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        aria-label={iconOnly ? "Columns" : undefined}
        className={
          iconOnly
            ? "relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
            : outline
              ? "flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-[#d1d5db] hover:text-ink"
              : "cs-soft-control h-9 text-xs"
        }
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
        </svg>
        {iconOnly ? (
          hiddenCount + pinnedCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
              {hiddenCount + pinnedCount}
            </span>
          ) : null
        ) : (
          <>
        Columns
        {pinnedCount > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-ink/60">
            <PinIcon filled />
            {pinnedCount}
          </span>
        ) : null}
        {hiddenCount > 0 ? (
          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">{hiddenCount} hidden</span>
        ) : null}
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 max-h-96 w-72 overflow-y-auto rounded-xl border border-ink/[0.08] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
        >
          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
            <span className="flex-1">{reorderable ? "Shown · drag to reorder" : "Show column"}</span>
            {reorderable && onResetOrder && orderChanged ? (
              <button
                type="button"
                onClick={onResetOrder}
                className="shrink-0 cursor-pointer text-[11px] font-semibold normal-case tracking-normal text-brand hover:underline"
              >
                Reset order
              </button>
            ) : null}
            {onTogglePin ? <span className="w-16 shrink-0 text-right">Pin left</span> : null}
          </div>
          {menuRows.map(({ key, label, section }, i) => {
            const locked = lockedSet.has(key);
            const checked = locked || !hidden.has(key);
            const isPinned = locked || (pinned?.has(key) ?? false);
            const draggable = reorderable && section === "shown" && !locked;
            const firstHidden = section === "hidden" && menuRows[i - 1]?.section !== "hidden";
            return (
              <Fragment key={key}>
              {firstHidden ? (
                <div className="mt-1 border-t border-ink/[0.06] px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                  Hidden
                </div>
              ) : null}
              <div
                draggable={draggable}
                onDragStart={
                  draggable
                    ? (e) => {
                        setDragKey(key);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", key);
                      }
                    : undefined
                }
                onDragOver={
                  reorderable && section === "shown"
                    ? (e) => {
                        if (!dragKey) return;
                        e.preventDefault();
                        if (overKey !== key) setOverKey(key);
                      }
                    : undefined
                }
                onDrop={
                  reorderable && section === "shown"
                    ? (e) => {
                        e.preventDefault();
                        if (dragKey) dropOn(key);
                      }
                    : undefined
                }
                onDragEnd={() => {
                  setDragKey(null);
                  setOverKey(null);
                }}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition ${
                  locked ? "text-ink/40" : "text-ink/75 hover:bg-ink/[0.04]"
                } ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${dragKey === key ? "opacity-40" : ""} ${
                  overKey === key && dragKey && dragKey !== key ? "border-brand bg-brand/[0.06]" : "border-transparent"
                }`}
              >
                {reorderable ? (
                  <span className={`w-3 shrink-0 text-center text-[11px] leading-none tracking-[-1px] ${draggable ? "text-ink/35" : "text-transparent"}`} aria-hidden>
                    ⋮⋮
                  </span>
                ) : null}
                <label
                  className={`flex min-w-0 flex-1 items-center gap-2 ${
                    locked || !onToggle ? "cursor-default" : "cursor-pointer"
                  } ${draggable ? "cursor-grab" : ""}`}
                >
                  {onToggle ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => onToggle(key)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-ink/25 accent-brand"
                    />
                  ) : null}
                  <span className="truncate">{label}</span>
                </label>
                {locked ? (
                  <span className="w-16 shrink-0 text-right text-[10px] text-ink/35">Always</span>
                ) : onTogglePin ? (
                  <button
                    type="button"
                    onClick={() => onTogglePin(key)}
                    aria-pressed={isPinned}
                    className={`flex w-16 shrink-0 items-center justify-end gap-1 rounded-md py-1 text-[11px] font-semibold transition ${
                      isPinned ? "text-brand" : "text-ink/30 hover:text-ink/55"
                    }`}
                  >
                    <PinIcon filled={isPinned} className="h-3 w-3" />
                    {isPinned ? "Pinned" : "Pin"}
                  </button>
                ) : onTogglePin ? (
                  <span className="w-16 shrink-0" />
                ) : null}
              </div>
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type HeaderCol =
  | { kind: "data"; spec: TableColumnSpec };

function dataHeaderKey(spec: TableColumnSpec): string {
  return spec.kind === "group" ? `g:${spec.prefix}` : `s:${spec.key}`;
}

function ObjectDetailCell({
  value,
  ariaLabel,
  onOpen,
}: {
  value: unknown;
  ariaLabel: string;
  onOpen: () => void;
}) {
  const preview = subObjectCellPreview(value) || nestedValueSummary(value);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      title="Click for full details"
      className="group flex w-full max-w-[min(18rem,100%)] min-w-0 items-center gap-2 rounded-lg border border-ink/[0.1] bg-linear-to-b from-white to-[#fafbfc] px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(1,1,1,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_8px_rgba(91,173,232,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
    >
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-ink">{preview}</span>
      <span
        aria-hidden
        className="shrink-0 rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink/50 group-hover:bg-brand/15 group-hover:text-brand"
      >
        View
      </span>
    </button>
  );
}

export function ClearstorySwaggerTable({
  title,
  subtitle,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  error,
  footer,
  hidePagination = false,
  variant = "card",
  headerAside,
  bare = false,
}: {
  title: string;
  subtitle?: string;
  rows: ClearstoryTableRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  loading: boolean;
  error: string | null;
  footer?: ReactNode;
  hidePagination?: boolean;
  /** "panel" = Projects-style chrome (count pill header, toolbar row with `footer` + Columns, footer pager). */
  variant?: "card" | "panel";
  /** Panel variant only: right side of the title row (falls back to `subtitle`). */
  headerAside?: ReactNode;
  /** Panel variant only: drop the outer border and title row, for a table embedded in another box. */
  bare?: boolean;
}) {
  const paginationIdPrefix = useMemo(() => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `cs-swagger-${slug || "table"}`;
  }, [title]);

  const [inspect, setInspect] = useState<{
    columnKey: string;
    resourceKey: string;
    value: unknown;
  } | null>(null);

  const columnSpecs = useMemo(() => buildTableColumnSpecs(rows), [rows]);

  const allHeaders: HeaderCol[] = useMemo(
    () => [
      ...columnSpecs.map((spec) => ({ kind: "data" as const, spec })),
    ],
    [columnSpecs]
  );

  const idKey = useMemo(() => {
    const idSpec = columnSpecs.find((s) => s.kind === "single" && s.key.toLowerCase() === "id");
    return idSpec ? dataHeaderKey(idSpec) : undefined;
  }, [columnSpecs]);

  const columnsStorageKey = `cs-table-cols-${paginationIdPrefix}`;
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => loadHiddenColumns(columnsStorageKey));

  useEffect(() => {
    setHiddenColumns(loadHiddenColumns(columnsStorageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsStorageKey]);

  const toggleColumn = (key: string) => {
    if (key === idKey) return;
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(columnsStorageKey, JSON.stringify([...next]));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const visibleHeaders = useMemo(
    () => allHeaders.filter((h) => dataHeaderKey(h.spec) === idKey || !hiddenColumns.has(dataHeaderKey(h.spec))),
    [allHeaders, hiddenColumns, idKey]
  );

  const pinStorageKey = `cs-table-pins-${paginationIdPrefix}`;
  const { pinnedKeys, togglePin, effectivePinnedOrder } = useColumnPinning({
    storageKey: pinStorageKey,
    lockedKey: idKey,
  });

  const visibleKeySet = useMemo(() => new Set(visibleHeaders.map((h) => dataHeaderKey(h.spec))), [visibleHeaders]);
  const activePinnedOrder = useMemo(
    () => effectivePinnedOrder.filter((k) => visibleKeySet.has(k)),
    [effectivePinnedOrder, visibleKeySet]
  );
  const pinnedSet = useMemo(() => new Set(activePinnedOrder), [activePinnedOrder]);

  const orderedHeaders = useMemo(() => {
    const byKey = new Map(visibleHeaders.map((h) => [dataHeaderKey(h.spec), h]));
    const pinnedHeaders = activePinnedOrder.map((k) => byKey.get(k)).filter((h): h is HeaderCol => Boolean(h));
    const unpinnedHeaders = visibleHeaders.filter((h) => !pinnedSet.has(dataHeaderKey(h.spec)));
    return [...pinnedHeaders, ...unpinnedHeaders];
  }, [visibleHeaders, activePinnedOrder, pinnedSet]);

  const pinnedCellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const pinnedOffsets = useStickyOffsets(activePinnedOrder, pinnedCellRefs, [orderedHeaders.length]);

  const [sort, setSort] = useState<SortState>(null);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const spec = columnSpecs.find((s) => dataHeaderKey(s) === sort.key);
    if (!spec) return rows;
    const withValues = rows.map((row) => ({ row, value: sortValueFor(row, spec) }));
    withValues.sort((a, b) => (sort.dir === "asc" ? compareValues(a.value, b.value) : compareValues(b.value, a.value)));
    return withValues.map((w) => w.row);
  }, [rows, sort, columnSpecs]);

  const panel = variant === "panel";

  const modal = (
    <JsonPayloadModal
      open={!!inspect}
      title={inspect ? `“${inspect.columnKey}”` : ""}
      subtitle={inspect ? `resourceKey: ${inspect.resourceKey}` : undefined}
      loading={false}
      error={null}
      payload={inspect?.value}
      onClose={() => setInspect(null)}
    />
  );

  const loadingBar =
    loading && rows.length > 0 ? (
      <div className="absolute left-0 right-0 top-0 z-30 h-0.5 overflow-hidden bg-brand/15" aria-hidden>
        <div className="h-full w-1/3 animate-[ticket-grid-loading_1s_ease-in-out_infinite] bg-brand" />
      </div>
    ) : null;

  const columnPicker =
    allHeaders.length > 0 ? (
      <ColumnPickerButton
        outline={panel}
        columns={allHeaders.map((h) => ({ key: dataHeaderKey(h.spec), label: tableColumnLabel(h.spec) }))}
        hidden={hiddenColumns}
        lockedKey={idKey}
        onToggle={toggleColumn}
        pinned={pinnedSet}
        onTogglePin={togglePin}
      />
    ) : null;

  const table = (
    <div className={`cs-data-table cs-table-shell ${TABLE_SCROLL}`}>
      {rows.length === 0 ? (
        <div className="p-4">
          <p className="cs-helper">No rows for this page. Adjust filters or run a sync from Ops.</p>
        </div>
      ) : (
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">{title}</caption>
          {/* Header stays put while rows scroll; z-20 keeps it above pinned body cells (z-10). */}
          <thead className="sticky top-0 z-20 bg-[#f3f4f6]">
            <tr>
              {orderedHeaders.map((h) => {
                const key = dataHeaderKey(h.spec);
                const dir = sort?.key === key ? sort.dir : null;
                const isPinned = pinnedSet.has(key);
                const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === key;
                return (
                  <SortableTh
                    key={key}
                    label={tableColumnLabel(h.spec)}
                    column={key}
                    active={dir != null}
                    dir={dir ?? "asc"}
                    onSort={toggleSort}
                    style={isPinned ? { left: pinnedOffsets[key] ?? 0 } : undefined}
                    className={isPinned ? pinnedHeaderClass(isLastPinned) : ""}
                    thRef={(el) => {
                      if (isPinned && el) pinnedCellRefs.current.set(key, el);
                      else pinnedCellRefs.current.delete(key);
                    }}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => {
              const zebra = rowIdx % 2 === 1;
              return (
                <tr
                  key={row.resourceKey}
                  className={`align-top border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${
                    zebra ? "bg-canvas/50" : "bg-white"
                  }`}
                >
                  {orderedHeaders.map((h) => {
                    const label = tableColumnLabel(h.spec);
                    const cellKey = dataHeaderKey(h.spec);
                    const isPinned = pinnedSet.has(cellKey);
                    const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === cellKey;
                    const cellStyle = isPinned ? { left: pinnedOffsets[cellKey] ?? 0 } : undefined;
                    const cellClass = `max-w-[16rem] whitespace-nowrap px-3 py-2.5 align-middle text-[13px] ${isPinned ? pinnedBodyClass(zebra, isLastPinned) : ""}`;

                    if (h.spec.kind === "group") {
                      const raw = getGroupedSwaggerOrMirrorValue(row, h.spec.prefix);
                      return (
                        <td key={cellKey} className={cellClass} style={cellStyle}>
                          {raw === undefined ? (
                            <span className="text-[13px] text-ink/30">—</span>
                          ) : (
                            <ObjectDetailCell
                              value={raw}
                              ariaLabel={`Open ${label} details for row ${row.resourceKey}`}
                              onOpen={() =>
                                setInspect({
                                  columnKey: label,
                                  resourceKey: row.resourceKey,
                                  value: raw,
                                })
                              }
                            />
                          )}
                        </td>
                      );
                    }

                    const raw = getSwaggerOrMirrorTopLevel(row, h.spec.key);
                    const exp = expandCellForModal(raw);

                    return (
                      <td key={cellKey} className={cellClass} style={cellStyle}>
                        {"empty" in exp ? (
                          <span className="text-[13px] text-ink/30">—</span>
                        ) : "modal" in exp ? (
                          <ObjectDetailCell
                            value={exp.modal}
                            ariaLabel={`Open ${label} details for row ${row.resourceKey}`}
                            onOpen={() =>
                              setInspect({
                                columnKey: label,
                                resourceKey: row.resourceKey,
                                value: exp.modal,
                              })
                            }
                          />
                        ) : (
                          <span
                            className="block max-w-full truncate text-sm leading-relaxed text-ink/90"
                            title={exp.text.length > 80 ? exp.text : undefined}
                          >
                            {exp.text || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const pagination = !hidePagination ? (
    <ClearstoryTablePagination
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      ariaLabel={`${title} pages`}
      idPrefix={paginationIdPrefix}
    />
  ) : null;

  const showSkeleton = loading && rows.length === 0;
  const errorEl = (
    <p className={panel ? "cs-helper py-6 text-red-600" : "text-sm text-red-600"} role="alert">
      {error}
    </p>
  );

  if (panel) {
    // Same chrome as the Clearstory Projects list: titled panel, toolbar row, table, footer pager.
    return (
      <section
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${bare ? "" : "cs-content-panel rounded-lg"}`}
        aria-label={bare ? title : undefined}
      >
        {bare ? null : (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="cs-section-title">{title}</h2>
            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-medium text-ink-muted">
              {total.toLocaleString()}
            </span>
          </div>
          {headerAside ?? (subtitle ? <p className="cs-helper">{subtitle}</p> : null)}
        </div>
        )}

        <div className="flex flex-col gap-3 px-5 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {footer}
            <div className="ml-auto flex items-center gap-2">{columnPicker}</div>
          </div>
        </div>

        {modal}

        <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-4 pt-2">
          {loadingBar}
          {showSkeleton ? <TableSkeleton rows={8} /> : error ? errorEl : table}
        </div>

        {pagination && !showSkeleton && !error ? (
          <div className="border-t border-[var(--border-subtle)] px-5 py-3 [&>div]:mt-0 [&>div]:border-t-0 [&>div]:pt-0">
            {pagination}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} />
      {footer ? <div className="mb-3">{footer}</div> : null}

      {modal}

      {loadingBar}

      {showSkeleton ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        errorEl
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span />
            {columnPicker}
          </div>

          {table}

          {pagination}
        </div>
      )}
    </Card>
  );
}
