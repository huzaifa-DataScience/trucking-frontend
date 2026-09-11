"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
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

const MAX_COLUMNS_NOTE = 60;

type SortDir = "asc" | "desc";
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

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) {
    return (
      <svg className="h-3 w-3 shrink-0 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      {dir === "desc" ? (
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

/** Sticky-left classes for pinned columns. `isLast` puts the divider shadow only on the rightmost pinned column. */
export function pinnedHeaderClass(isLast: boolean): string {
  return `sticky z-30 bg-[#f0f2f5] ${isLast ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]" : ""}`;
}
export function pinnedBodyClass(zebra: boolean, isLast: boolean): string {
  return `sticky z-10 ${zebra ? "bg-[#fbfbfc]" : "bg-white"} ${isLast ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""}`;
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
  onToggle,
  pinned,
  onTogglePin,
}: {
  columns: { key: string; label: string }[];
  hidden: Set<string>;
  lockedKey?: string;
  onToggle: (key: string) => void;
  /** When provided, each row gets a pin toggle (unlimited columns can be pinned). */
  pinned?: Set<string>;
  onTogglePin?: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const hiddenCount = columns.filter((c) => hidden.has(c.key) && c.key !== lockedKey).length;
  const pinnedCount = columns.filter((c) => c.key !== lockedKey && (pinned?.has(c.key) ?? false)).length;
  const hiddenNames = columns.filter((c) => hidden.has(c.key) && c.key !== lockedKey).map((c) => c.label);
  const pinnedNames = columns.filter((c) => c.key !== lockedKey && (pinned?.has(c.key) ?? false)).map((c) => c.label);

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
        className="flex items-center gap-1.5 rounded-lg border border-ink/12 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 shadow-sm transition hover:border-ink/20 hover:text-ink"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
        </svg>
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
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 max-h-96 w-72 overflow-y-auto rounded-xl border border-ink/[0.08] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
        >
          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
            <span className="flex-1">Show column</span>
            <span className="w-16 shrink-0 text-right">Pin left</span>
          </div>
          {columns.map(({ key, label }) => {
            const locked = key === lockedKey;
            const checked = locked || !hidden.has(key);
            const isPinned = locked || (pinned?.has(key) ?? false);
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
                  locked ? "text-ink/40" : "text-ink/75 hover:bg-ink/[0.04]"
                }`}
              >
                <label className={`flex min-w-0 flex-1 items-center gap-2 ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(key)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-ink/25 accent-brand"
                  />
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
                ) : (
                  <span className="w-16 shrink-0" />
                )}
              </div>
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
      className="group flex w-full max-w-[min(18rem,100%)] min-w-0 items-center gap-2 rounded-lg border border-ink/[0.1] bg-linear-to-b from-white to-[#fafbfc] px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(1,1,1,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_8px_rgba(255,123,17,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium leading-snug text-ink">{preview}</span>
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

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} />
      {footer ? <div className="mb-3">{footer}</div> : null}

      <JsonPayloadModal
        open={!!inspect}
        title={inspect ? `“${inspect.columnKey}”` : ""}
        subtitle={inspect ? `resourceKey: ${inspect.resourceKey}` : undefined}
        loading={false}
        error={null}
        payload={inspect?.value}
        onClose={() => setInspect(null)}
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-3">
            {columnSpecs.length >= MAX_COLUMNS_NOTE ? (
              <p className="text-xs text-amber-800">
                Columns limited to {MAX_COLUMNS_NOTE}; dotted keys such as{" "}
                <code className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[11px]">A.B</code> collapse to{" "}
                <code className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[11px]">A</code>.
              </p>
            ) : (
              <span />
            )}
            {allHeaders.length > 0 ? (
              <ColumnPickerButton
                columns={allHeaders.map((h) => ({ key: dataHeaderKey(h.spec), label: tableColumnLabel(h.spec) }))}
                hidden={hiddenColumns}
                lockedKey={idKey}
                onToggle={toggleColumn}
                pinned={pinnedSet}
                onTogglePin={togglePin}
              />
            ) : null}
          </div>

          <div className={`${TABLE_SCROLL} rounded-xl border border-ink/[0.1] bg-[#fafbfc] shadow-inner`}>
            {rows.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-ink/55">No rows for this page. Adjust filters or run a sync from Ops.</p>
              </div>
            ) : (
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
                <caption className="sr-only">{title}</caption>
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#f0f2f5]">
                    {orderedHeaders.map((h) => {
                      const key = dataHeaderKey(h.spec);
                      const dir = sort?.key === key ? sort.dir : null;
                      const isPinned = pinnedSet.has(key);
                      const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === key;
                      return (
                        <th
                          key={key}
                          ref={(el) => {
                            if (isPinned && el) pinnedCellRefs.current.set(key, el);
                            else pinnedCellRefs.current.delete(key);
                          }}
                          scope="col"
                          style={isPinned ? { left: pinnedOffsets[key] ?? 0 } : undefined}
                          className={`whitespace-nowrap border-b border-ink/[0.1] px-0 py-0 text-xs font-semibold tracking-wide text-ink/60 ${
                            isPinned ? pinnedHeaderClass(isLastPinned) : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                            className="flex w-full items-center gap-1 px-3 py-3 text-left transition hover:text-ink"
                          >
                            {tableColumnLabel(h.spec)}
                            <SortIcon dir={dir} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {sortedRows.map((row, rowIdx) => {
                    const zebra = rowIdx % 2 === 1;
                    return (
                      <tr
                        key={row.resourceKey}
                        className={`align-top transition-colors hover:bg-brand/[0.03] ${zebra ? "bg-ink/[0.015]" : ""}`}
                      >
                        {orderedHeaders.map((h) => {
                          const label = tableColumnLabel(h.spec);
                          const cellKey = dataHeaderKey(h.spec);
                          const isPinned = pinnedSet.has(cellKey);
                          const isLastPinned = isPinned && activePinnedOrder[activePinnedOrder.length - 1] === cellKey;
                          const cellStyle = isPinned ? { left: pinnedOffsets[cellKey] ?? 0 } : undefined;
                          const cellClass = `max-w-[16rem] border-b border-ink/[0.06] px-3 py-2.5 align-middle ${isPinned ? pinnedBodyClass(zebra, isLastPinned) : ""}`;

                          if (h.spec.kind === "group") {
                            const raw = getGroupedSwaggerOrMirrorValue(row, h.spec.prefix);
                            return (
                              <td key={cellKey} className={cellClass} style={cellStyle}>
                                {raw === undefined ? (
                                  <span className="text-sm text-ink/30">—</span>
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
                                <span className="text-sm text-ink/30">—</span>
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

          {!hidePagination ? (
            <ClearstoryTablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              ariaLabel={`${title} pages`}
              idPrefix={paginationIdPrefix}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}
