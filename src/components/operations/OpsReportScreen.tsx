"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { defaultOpsDateRange, qty } from "@/lib/operations/format";
import type { CostReportResponse, LeedReportRow } from "@/lib/operations/types";
import { AGGREGATE_FIELD_META, LEED_FIELD_META } from "@/lib/operations/types";
import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { OpsDateRange } from "@/components/operations/OpsDateRange";
import { CostReportTable } from "@/components/operations/CostReportTable";
import {
  OPS_SHELL,
  OPS_TABLE_SCROLL,
  OPS_TABLE_STICKY_HEAD,
} from "@/components/operations/tableScroll";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

export function CostReportScreen({
  title,
  nameHeader,
  nameOf,
  load,
}: {
  title: string;
  nameHeader: string;
  nameOf: (row: CostReportResponse["rows"][number]) => string;
  load: (q: { from: string; to: string }) => Promise<CostReportResponse>;
}) {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [data, setData] = useState<CostReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load(range)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load report"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, load]);

  return (
    <OperationsChrome
      title={title}
      subtitle="Server totals from the haul log — same cost rules as the Excel."
      filters={<OpsDateRange from={range.from} to={range.to} onChange={setRange} />}
    >
      {loading && !data ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data ? (
        <CostReportTable data={data} nameHeader={nameHeader} nameOf={nameOf} />
      ) : null}
    </OperationsChrome>
  );
}

export function LeedReportScreen({
  load,
}: {
  load: (q: { from: string; to: string }) => Promise<LeedReportRow[]>;
}) {
  const [range, setRange] = useState(defaultOpsDateRange);
  const [rows, setRows] = useState<LeedReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load(range)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load LEED report"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, load]);

  const qtyCols = [...LEED_FIELD_META, ...AGGREGATE_FIELD_META];

  return (
    <OperationsChrome
      title="LEED / aggregates by job"
      subtitle="Quantities only — not dollars."
      filters={<OpsDateRange from={range.from} to={range.to} onChange={setRange} />}
    >
      {loading && rows.length === 0 ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        <div className={OPS_SHELL}>
          <div className={OPS_TABLE_SCROLL}>
            <table className="min-w-[72rem] w-full text-left text-[12px]">
              <thead>
                <tr
                  className={`${OPS_TABLE_STICKY_HEAD} text-[10px] font-semibold uppercase tracking-wide text-ink/50`}
                >
                  <th className="sticky left-0 z-[2] bg-[#f3f6f9] px-3 py-2.5 shadow-[1px_0_0_rgba(0,0,0,0.06)]">
                    Job
                  </th>
                  <th className="px-3 py-2.5 text-right">Loads</th>
                  {qtyCols.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-3 py-2.5 text-right">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + qtyCols.length}
                      className="px-3 py-10 text-center text-ink/45"
                    >
                      No LEED / aggregate quantities in this range.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.jobNumber} className="border-b border-ink/[0.05] hover:bg-brand/[0.04]">
                      <td className="sticky left-0 z-[1] bg-white px-3 py-2 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
                        <p className="font-medium text-ink">{row.jobNumber}</p>
                        <p className="text-[11px] text-ink/45">{row.jobName || "—"}</p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.loads}</td>
                      {qtyCols.map((c) => {
                        const raw = row[c.key as keyof LeedReportRow];
                        const n = typeof raw === "number" ? raw : null;
                        return (
                          <td
                            key={c.key}
                            className="px-3 py-2 text-right tabular-nums text-ink/70"
                          >
                            {qty(n)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink/[0.06] bg-[#f8f9fb] px-3 py-2 text-[11px] text-ink/45">
            {rows.length.toLocaleString()} job{rows.length === 1 ? "" : "s"} · scroll horizontally
            for all quantity columns
          </div>
        </div>
      )}
    </OperationsChrome>
  );
}
