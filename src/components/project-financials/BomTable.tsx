"use client";

import Link from "next/link";
import type { FinancialsCompany, JobRow } from "@/lib/project-financials/types";
import { count, money, ratio } from "@/lib/project-financials/format";
import {
  FINANCIALS_TABLE_SCROLL,
  FINANCIALS_TABLE_STICKY_HEAD,
} from "@/components/project-financials/tableScroll";

import { useTableSort } from "@/hooks/useTableSort";
const shell =
  "overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_6px_16px_rgba(91,173,232,0.08)] backdrop-blur-md";

const th =
  "px-2.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-[#333333] whitespace-nowrap";
const td = "px-2.5 py-2.5 text-right text-[12.5px] tabular-nums text-ink whitespace-nowrap";

export function BomTable({
  jobs,
  companies,
  hideTrimble,
}: {
  jobs: JobRow[];
  companies: FinancialsCompany[];
  hideTrimble: boolean;
}) {
  const cols = companies.length
    ? companies
    : [
        { entityId: 1, company: "GOEL" },
        { entityId: 2, company: "GOEL DC" },
        { entityId: 3, company: "DCB" },
      ];
  const trimbleOf = (j: JobRow) => (hideTrimble || !j.sources.trimble ? null : j.bom.trimble);
  const companyCell = (j: JobRow, entityId: number) => j.bom.companies.find((row) => row.entityId === entityId);
  const bomSort = useTableSort(jobs, {
    job: (j) => j.jobNumber,
    ...Object.fromEntries(
      cols.flatMap((c) => [
        [`mat-${c.entityId}`, (j: JobRow) => companyCell(j, c.entityId)?.materialCost ?? 0],
        [`hrs-${c.entityId}`, (j: JobRow) => companyCell(j, c.entityId)?.laborHours ?? 0],
      ])
    ),
    matTotal: (j) => j.bom.totals.materialCost,
    hrsTotal: (j) => j.bom.totals.laborHours,
    csContract: (j) => j.bom.clearstory.contract,
    csCos: (j) => j.bom.clearstory.approvedCos,
    totalContract: (j) => j.bom.clearstory.totalContract,
    completion: (j) => j.bom.clearstory.completionPct,
    bomBudget: (j) => trimbleOf(j)?.bomBudget,
    bomBudgetPct: (j) => trimbleOf(j)?.bomBudgetPct,
    ordered: (j) => trimbleOf(j)?.ordered,
    received: (j) => trimbleOf(j)?.received,
    ordMinusRec: (j) => trimbleOf(j)?.orderedMinusReceived,
    actualCost: (j) => trimbleOf(j)?.actualCost,
    trimbleHrs: (j) => trimbleOf(j)?.laborHours,
    estHrs: (j) => trimbleOf(j)?.estLaborHours,
    remaining: (j) => trimbleOf(j)?.remaining,
    pctUsed: (j) => trimbleOf(j)?.pctUsed,
    matVsCompletion: (j) => j.bom.vsCompletion.materialVsCompletion,
    hrsVsCompletion: (j) => j.bom.vsCompletion.laborVsCompletion,
  } as Record<string, (j: JobRow) => number | string | null | undefined>);

  return (
    <div className={shell}>
      <div className={FINANCIALS_TABLE_SCROLL}>
      <table className="min-w-max w-full border-collapse text-left">
        <thead>
          <tr className={`border-b border-[rgba(91,173,232,0.22)] ${FINANCIALS_TABLE_STICKY_HEAD}`}>
            <th className="sticky left-0 z-[2] w-36 max-w-[9rem] bg-[rgba(91,173,232,0.18)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#333333]">
              {bomSort.header("job", "Job")}
            </th>
            {cols.map((c) => (
              <th key={`mat-${c.entityId}`} className={th} title={`${c.company} material`}>
                {bomSort.header(`mat-${c.entityId}`, `${c.company} mat`, "right")}
              </th>
            ))}
            {cols.map((c) => (
              <th key={`hrs-${c.entityId}`} className={th} title={`${c.company} labor hours`}>
                {bomSort.header(`hrs-${c.entityId}`, `${c.company} hrs`, "right")}
              </th>
            ))}
            <th className={th}>{bomSort.header("matTotal", "Mat total", "right")}</th>
            <th className={th}>{bomSort.header("hrsTotal", "Hrs total", "right")}</th>
            <th className={th}>{bomSort.header("csContract", "CS contract", "right")}</th>
            <th className={th}>{bomSort.header("csCos", "CS COs", "right")}</th>
            <th className={th}>{bomSort.header("totalContract", "Total contract", "right")}</th>
            <th className={th}>{bomSort.header("completion", "Completion", "right")}</th>
            {hideTrimble ? null : (
              <>
                <th className={th}>{bomSort.header("bomBudget", "BOM budget", "right")}</th>
                <th className={th}>{bomSort.header("bomBudgetPct", "Budget % used", "right")}</th>
                <th className={th}>{bomSort.header("ordered", "Ordered", "right")}</th>
                <th className={th}>{bomSort.header("received", "Received", "right")}</th>
                <th className={th}>{bomSort.header("ordMinusRec", "Ord − Rec", "right")}</th>
                <th className={th}>{bomSort.header("actualCost", "Actual cost", "right")}</th>
                <th className={th}>{bomSort.header("trimbleHrs", "Trimble hrs", "right")}</th>
                <th className={th}>{bomSort.header("estHrs", "Est hrs", "right")}</th>
                <th className={th}>{bomSort.header("remaining", "Remaining", "right")}</th>
                <th className={th}>{bomSort.header("pctUsed", "% used", "right")}</th>
              </>
            )}
            <th className={th}>{bomSort.header("matVsCompletion", "Mat vs completion", "right")}</th>
            <th className={th}>{bomSort.header("hrsVsCompletion", "Hrs vs completion", "right")}</th>
          </tr>
        </thead>
        <tbody>
          {bomSort.sorted.map((job) => (
            <BomRow key={job.jobNumber} job={job} companies={cols} hideTrimble={hideTrimble} />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function BomRow({
  job,
  companies,
  hideTrimble,
}: {
  job: JobRow;
  companies: FinancialsCompany[];
  hideTrimble: boolean;
}) {
  const { bom } = job;
  const foundationOff = !job.sources.foundation;
  const trimbleOff = hideTrimble || !job.sources.trimble || bom.trimble == null;
  const trimble = bom.trimble;
  const ordDiff = trimble?.orderedMinusReceived;
  const ordFlag = ordDiff != null && Math.abs(ordDiff) > 0.01;

  return (
    <tr className="border-b border-ink/[0.06] last:border-0 hover:bg-white/40">
      <td className="sticky left-0 z-10 w-36 max-w-[9rem] bg-white/90 px-3 py-2.5 backdrop-blur-sm">
        <Link
          href={`/project-financials/jobs/${encodeURIComponent(job.jobNumber)}`}
          title={[job.jobNumber, job.name].filter(Boolean).join(" · ")}
          className="block max-w-[9rem] hover:underline"
        >
          <span className="block truncate text-[13px] font-semibold text-ink">{job.jobNumber}</span>
          {job.name ? (
            <span className="mt-0.5 block truncate text-[12px] text-ink/55">{job.name}</span>
          ) : null}
        </Link>
        {!trimbleOff && trimble?.projectIds[0] != null ? (
          <Link
            href={`/trimble/line-items?projectId=${trimble.projectIds[0]}`}
            className="mt-1 inline-block text-[11px] font-medium text-ink/40 hover:text-ink"
          >
            Line items
          </Link>
        ) : null}
      </td>
      {companies.map((c) => {
        const cell = bom.companies.find((row) => row.entityId === c.entityId);
        const empty =
          foundationOff && (cell?.materialCost ?? 0) === 0 && (cell?.laborHours ?? 0) === 0;
        return (
          <td key={`mat-${c.entityId}`} className={td}>
            {empty ? "—" : money(cell?.materialCost ?? 0)}
          </td>
        );
      })}
      {companies.map((c) => {
        const cell = bom.companies.find((row) => row.entityId === c.entityId);
        const empty =
          foundationOff && (cell?.materialCost ?? 0) === 0 && (cell?.laborHours ?? 0) === 0;
        return (
          <td key={`hrs-${c.entityId}`} className={td}>
            {empty ? "—" : count(cell?.laborHours ?? 0)}
          </td>
        );
      })}
      <td className={td}>{foundationOff && bom.totals.materialCost === 0 ? "—" : money(bom.totals.materialCost)}</td>
      <td className={td}>{foundationOff && bom.totals.laborHours === 0 ? "—" : count(bom.totals.laborHours)}</td>
      <td className={td}>{money(bom.clearstory.contract)}</td>
      <td className={td}>{money(bom.clearstory.approvedCos)}</td>
      <td className={td}>{money(bom.clearstory.totalContract)}</td>
      <td className={td}>{ratio(bom.clearstory.completionPct)}</td>
      {hideTrimble ? null : trimbleOff || !trimble ? (
        <>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
          <td className={td}>—</td>
        </>
      ) : (
        <>
          <td className={td}>{money(trimble.bomBudget)}</td>
          <td className={td}>{ratio(trimble.bomBudgetPct)}</td>
          <td className={td}>{money(trimble.ordered)}</td>
          <td className={td}>{money(trimble.received)}</td>
          <td className={`${td} ${ordFlag ? "font-semibold text-danger" : ""}`}>
            {money(trimble.orderedMinusReceived)}
          </td>
          <td className={td}>{money(trimble.actualCost)}</td>
          <td className={td}>{count(trimble.laborHours)}</td>
          <td className={td}>{count(trimble.estLaborHours)}</td>
          <td className={td}>{money(trimble.remaining)}</td>
          <td className={td}>{ratio(trimble.pctUsed)}</td>
        </>
      )}
      <td className={td}>{money(bom.vsCompletion.materialVsCompletion)}</td>
      <td className={td}>{count(bom.vsCompletion.laborVsCompletion)}</td>
    </tr>
  );
}
