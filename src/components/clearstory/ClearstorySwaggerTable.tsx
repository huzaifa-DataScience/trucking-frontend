"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { JsonPayloadModal } from "@/components/clearstory/JsonPayloadModal";
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
  totalPages,
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
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  loading: boolean;
  error: string | null;
  footer?: ReactNode;
  hidePagination?: boolean;
}) {
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

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
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
        <div className="flex flex-1 justify-center py-16">
          <LogoLoader size={32} />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/55">No rows for this page. Adjust filters or run a sync from Ops.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between">
            <span className="leading-relaxed">
              <span className="text-ink/40">Total</span>{" "}
              <strong className="font-semibold text-ink">{total.toLocaleString()}</strong>
              {!hidePagination ? (
                <>
                  <span className="mx-1.5 text-ink/25">·</span>
                  <span className="text-ink/40">Page</span>{" "}
                  <strong className="font-semibold text-ink">
                    {page} of {totalPages}
                  </strong>
                </>
              ) : null}
              {columnSpecs.length >= MAX_COLUMNS_NOTE ? (
                <span className="mt-1 block text-xs text-amber-800 sm:mt-0 sm:ml-2 sm:inline">
                  Columns limited to {MAX_COLUMNS_NOTE}; dotted keys such as{" "}
                  <code className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[11px]">A.B</code> collapse to{" "}
                  <code className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[11px]">A</code>.
                </span>
              ) : null}
            </span>
            {!hidePagination ? (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="cs-page-size" className="sr-only">
                  Page size
                </label>
                <select
                  id="cs-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    onPageSizeChange(Number(e.target.value));
                    onPageChange(1);
                  }}
                  className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="rounded-lg border border-ink/12 bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="rounded-lg border border-ink/12 bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-ink/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-ink/[0.1] bg-[#fafbfc] shadow-inner">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">{title}</caption>
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-ink/[0.1] bg-[#f0f2f5]">
                  {allHeaders.map((h) => (
                    <th
                      key={dataHeaderKey(h.spec)}
                      scope="col"
                      className="whitespace-nowrap px-3 py-3 text-xs font-semibold tracking-wide text-ink/60"
                    >
                      {tableColumnLabel(h.spec)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((row, rowIdx) => (
                  <tr
                    key={row.resourceKey}
                    className={`border-b border-ink/[0.06] align-top transition-colors hover:bg-brand/[0.03] ${
                      rowIdx % 2 === 1 ? "bg-ink/[0.015]" : ""
                    }`}
                  >
                    {allHeaders.map((h) => {
                      const label = tableColumnLabel(h.spec);

                      if (h.spec.kind === "group") {
                        const raw = getGroupedSwaggerOrMirrorValue(row, h.spec.prefix);
                        return (
                          <td key={dataHeaderKey(h.spec)} className="max-w-[16rem] px-3 py-2.5 align-middle">
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
                        <td key={dataHeaderKey(h.spec)} className="max-w-[16rem] px-3 py-2.5 align-middle">
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
