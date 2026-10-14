"use client";

import Link from "next/link";
import type { SummaryRow } from "@/lib/project-financials/types";
import { count, money, ratio } from "@/lib/project-financials/format";
import { queryToSearch } from "@/components/project-financials/FinancialsChrome";
import {
  FINANCIALS_TABLE_SCROLL,
  FINANCIALS_TABLE_STICKY_HEAD,
} from "@/components/project-financials/tableScroll";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";

import { useTableSort } from "@/hooks/useTableSort";
const panel =
  "overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_6px_16px_rgba(91,173,232,0.08)] backdrop-blur-md";
const head =
  "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#333333]";
const cell = "whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-ink/80";

export function SummaryTable({ rows, totals }: { rows: SummaryRow[]; totals: SummaryRow }) {
  const { query } = useFinancialsQuery();
  const body = rows.filter((row) => row.pm !== "Total");
  // The Total row stays pinned at the bottom; only PM rows sort.
  const pmSort = useTableSort(body, {
    pm: (r) => r.pm,
    activeBillings: (r) => r.activeBillings,
    backlog: (r) => r.backlog,
    ar: (r) => r.ar,
    atp: (r) => r.atp,
    atpPctOfBillings: (r) => r.atpPctOfBillings,
    openJobs: (r) => r.openJobs,
    activeJobs: (r) => r.activeJobs,
    retentionOnly: (r) => r.retentionOnly,
    totalCost: (r) => r.totalCost,
    cashFlow: (r) => r.cashFlow,
    fixCount: (r) => r.fixCount,
    notInSitelineCount: (r) => r.notInSitelineCount,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Active billings" value={money(totals.activeBillings)} />
        <Kpi label="Backlog" value={money(totals.backlog)} />
        <Kpi label="AR" value={money(totals.ar)} />
        <Kpi label="Approved to proceed" value={money(totals.atp)} />
        <Kpi
          label="Cash flow"
          value={totals.cashFlow == null ? "—" : money(totals.cashFlow)}
          danger={totals.cashFlow != null && totals.cashFlow < 0}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {body.map((row) => {
          const whole = row.activeBillings + row.backlog;
          const billedShare = whole > 0 ? Math.min(100, (row.activeBillings / whole) * 100) : 0;
          return (
            <Link
              key={row.pm}
              href={`/project-financials/jobs${queryToSearch({ ...query, pm: row.pm })}`}
              className={`${panel} flex flex-col gap-3 px-4 py-3.5 transition hover:bg-white/80`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{row.pm}</p>
                  <p className="mt-0.5 text-[12px] text-ink/45">
                    {count(row.activeJobs)} active · {count(row.openJobs)} open
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink/45">
                    FIX {count(row.fixCount)} · NOT IN SITELINE {count(row.notInSitelineCount)}
                  </p>
                </div>
                <p
                  className={`text-right text-sm font-semibold tabular-nums ${
                    row.cashFlow != null && row.cashFlow < 0 ? "text-danger" : "text-ink"
                  }`}
                >
                  {row.cashFlow == null ? "—" : money(row.cashFlow)}
                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-ink/40">
                    Cash flow
                  </span>
                </p>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[11px] text-ink/50">
                  <span>Billings {money(row.activeBillings)}</span>
                  <span>Backlog {money(row.backlog)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full rounded-full bg-[#333333]" style={{ width: `${billedShare}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={panel}>
        <h2 className="border-b border-[rgba(91,173,232,0.22)] bg-[rgba(91,173,232,0.18)] px-4 py-3 text-center text-[13px] font-semibold text-[#333333]">
          Full sheet
        </h2>
        <div className={FINANCIALS_TABLE_SCROLL}>
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className={`border-b border-ink/[0.06] ${FINANCIALS_TABLE_STICKY_HEAD}`}>
                <th className={head}>{pmSort.header("pm", "PM")}</th>
                <th className={`${head} text-right`}>{pmSort.header("activeBillings", "Active billings", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("backlog", "Backlog", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("ar", "AR", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("atp", "Approved to proceed", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("atpPctOfBillings", "% ATP → billings", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("openJobs", "Open jobs", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("activeJobs", "Active jobs", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("retentionOnly", "Retention only", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("totalCost", "Total cost", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("cashFlow", "Cash flow", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("fixCount", "FIX", "right")}</th>
                <th className={`${head} text-right`}>{pmSort.header("notInSitelineCount", "NOT IN SITELINE", "right")}</th>
              </tr>
            </thead>
            <tbody>
              {pmSort.sorted.map((row) => (
                <tr key={row.pm} className="border-b border-ink/[0.06]">
                  <td className="px-3 py-2.5 text-sm font-semibold text-ink">{row.pm}</td>
                  <SummaryNumbers row={row} />
                </tr>
              ))}
              <tr className="bg-ink/[0.04] font-semibold">
                <td className="px-3 py-2.5 text-sm text-ink">{totals.pm || "Total"}</td>
                <SummaryNumbers row={totals} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`${panel} px-4 py-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function SummaryNumbers({ row }: { row: SummaryRow }) {
  return (
    <>
      <td className={cell}>{money(row.activeBillings)}</td>
      <td className={cell}>{money(row.backlog)}</td>
      <td className={cell}>{money(row.ar)}</td>
      <td className={cell}>{money(row.atp)}</td>
      <td className={cell}>{row.atpPctOfBillings == null ? "" : ratio(row.atpPctOfBillings)}</td>
      <td className={cell}>{count(row.openJobs)}</td>
      <td className={cell}>{count(row.activeJobs)}</td>
      <td className={cell}>{count(row.retentionOnly)}</td>
      <td className={cell}>{money(row.totalCost)}</td>
      <td className={`${cell} ${row.cashFlow != null && row.cashFlow < 0 ? "text-danger" : ""}`}>
        {row.cashFlow == null ? "" : money(row.cashFlow)}
      </td>
      <td className={cell}>{count(row.fixCount)}</td>
      <td className={cell}>{count(row.notInSitelineCount)}</td>
    </>
  );
}
