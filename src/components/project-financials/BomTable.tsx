"use client";

import Link from "next/link";
import type { FinancialsCompany, JobRow } from "@/lib/project-financials/types";
import { count, money, ratio } from "@/lib/project-financials/format";
import {
  FINANCIALS_TABLE_SCROLL,
  FINANCIALS_TABLE_STICKY_HEAD,
} from "@/components/project-financials/tableScroll";

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

  return (
    <div className={shell}>
      <div className={FINANCIALS_TABLE_SCROLL}>
      <table className="min-w-max w-full border-collapse text-left">
        <thead>
          <tr className={`border-b border-[rgba(91,173,232,0.22)] ${FINANCIALS_TABLE_STICKY_HEAD}`}>
            <th className="sticky left-0 z-[2] w-36 max-w-[9rem] bg-[rgba(91,173,232,0.18)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#333333]">
              Job
            </th>
            {cols.map((c) => (
              <th key={`mat-${c.entityId}`} className={th} title={`${c.company} material`}>
                {c.company} mat
              </th>
            ))}
            {cols.map((c) => (
              <th key={`hrs-${c.entityId}`} className={th} title={`${c.company} labor hours`}>
                {c.company} hrs
              </th>
            ))}
            <th className={th}>Mat total</th>
            <th className={th}>Hrs total</th>
            <th className={th}>CS contract</th>
            <th className={th}>CS COs</th>
            <th className={th}>Total contract</th>
            <th className={th}>Completion</th>
            {hideTrimble ? null : (
              <>
                <th className={th}>BOM budget</th>
                <th className={th}>Budget % used</th>
                <th className={th}>Ordered</th>
                <th className={th}>Received</th>
                <th className={th}>Ord − Rec</th>
                <th className={th}>Actual cost</th>
                <th className={th}>Trimble hrs</th>
                <th className={th}>Est hrs</th>
                <th className={th}>Remaining</th>
                <th className={th}>% used</th>
              </>
            )}
            <th className={th}>Mat vs completion</th>
            <th className={th}>Hrs vs completion</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
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
