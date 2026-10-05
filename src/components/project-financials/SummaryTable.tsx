"use client";

import Link from "next/link";
import type { SummaryRow } from "@/lib/project-financials/types";
import { count, money, ratio } from "@/lib/project-financials/format";
import { queryToSearch } from "@/components/project-financials/FinancialsChrome";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";

const panel =
  "overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_6px_16px_rgba(255,123,17,0.08)] backdrop-blur-md";
const head =
  "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#5a5340]";
const cell = "whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-ink/80";

export function SummaryTable({ rows, totals }: { rows: SummaryRow[]; totals: SummaryRow }) {
  const { query } = useFinancialsQuery();
  const body = rows.filter((row) => row.pm !== "Total");

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
                  <div className="h-full rounded-full bg-[#5a5340]" style={{ width: `${billedShare}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={panel}>
        <h2 className="border-b border-[rgba(255,123,17,0.22)] bg-[rgba(255,123,17,0.18)] px-4 py-3 text-center text-[13px] font-semibold text-[#5a5340]">
          Full sheet
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                <th className={head}>PM</th>
                <th className={`${head} text-right`}>Active billings</th>
                <th className={`${head} text-right`}>Backlog</th>
                <th className={`${head} text-right`}>AR</th>
                <th className={`${head} text-right`}>Approved to proceed</th>
                <th className={`${head} text-right`}>% ATP → billings</th>
                <th className={`${head} text-right`}>Open jobs</th>
                <th className={`${head} text-right`}>Active jobs</th>
                <th className={`${head} text-right`}>Retention only</th>
                <th className={`${head} text-right`}>Total cost</th>
                <th className={`${head} text-right`}>Cash flow</th>
                <th className={`${head} text-right`}>FIX</th>
                <th className={`${head} text-right`}>NOT IN SITELINE</th>
              </tr>
            </thead>
            <tbody>
              {body.map((row) => (
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
