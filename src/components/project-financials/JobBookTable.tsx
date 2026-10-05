"use client";

import Link from "next/link";
import { useState } from "react";
import type { JobRecon, JobRow, JobStatus } from "@/lib/project-financials/types";
import { count, money, ratio } from "@/lib/project-financials/format";

type BookView = "overview" | "contract" | "billing" | "cost";

const STATUS_LABEL: Record<JobStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  siteline_only: "Siteline only",
  clearstory_only: "Clearstory only",
};

const shell =
  "overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_6px_16px_rgba(255,123,17,0.08)] backdrop-blur-md";

export function JobBookTable({ jobs, hideCost }: { jobs: JobRow[]; hideCost: boolean }) {
  const [view, setView] = useState<BookView>("overview");
  const views: { id: BookView; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contract", label: "Contract" },
    { id: "billing", label: "Billing" },
    { id: "cost", label: "Cost" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-10 w-fit items-center rounded-lg border border-ink/10 bg-white/80 p-1 shadow-[0_4px_12px_rgba(255,123,17,0.06)]">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`h-8 rounded-md px-3 text-xs font-semibold ${
              view === item.id ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={shell}>
        <div className="hidden grid-cols-[minmax(16rem,1.5fr)_11rem_11rem_10rem_10rem] gap-3 border-b border-[rgba(255,123,17,0.22)] bg-[rgba(255,123,17,0.18)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#5a5340] lg:grid">
          <span>Job</span>
          {view === "overview" ? (
            <>
              <span className="text-right">Revised</span>
              <span className="text-right">Billed</span>
              <span className="text-right">Backlog</span>
              <span className="text-right">Cash flow</span>
            </>
          ) : null}
          {view === "contract" ? (
            <>
              <span className="text-right">Contract</span>
              <span className="text-right">Approved COs</span>
              <span className="text-right">ATP</span>
              <span className="text-right">Revised</span>
            </>
          ) : null}
          {view === "billing" ? (
            <>
              <span className="text-right">Billed</span>
              <span className="text-right">Retainage</span>
              <span className="text-right">AR</span>
              <span className="text-right">% complete</span>
            </>
          ) : null}
          {view === "cost" ? (
            <>
              <span className="text-right">LAB + BUR</span>
              <span className="text-right">Total cost</span>
              <span className="text-right">Hours</span>
              <span className="text-right">Cash flow</span>
            </>
          ) : null}
        </div>
        <ul>
          {jobs.map((job) => (
            <JobLine key={job.jobNumber} job={job} view={view} hideCost={hideCost} />
          ))}
        </ul>
      </div>
      <FullSheet jobs={jobs} hideCost={hideCost} />
    </div>
  );
}

const RECON_STATUS: Record<JobRecon["sitelineClearstory"], string> = {
  ok: "OK",
  fix: "FIX",
  not_in_siteline: "NOT IN SITELINE",
};

function JobLine({ job, view, hideCost }: { job: JobRow; view: BookView; hideCost: boolean }) {
  const difference = job.recon.difference ?? job.contract.difference;
  const diffFlag = difference != null && difference !== 0;
  const costBlank = hideCost || !job.sources.foundation;
  const billedPct = job.billing.pctBilled == null ? 0 : Math.max(0, Math.min(1, job.billing.pctBilled));
  const alerted = job.recon.alerts.length > 0;

  return (
    <li className={`border-b border-ink/[0.06] last:border-b-0 ${alerted ? "bg-red-50/80" : ""}`}>
      <Link
        href={`/project-financials/jobs/${encodeURIComponent(job.jobNumber)}`}
        className="grid gap-3 px-4 py-3 hover:bg-white/80 lg:grid-cols-[minmax(16rem,1.5fr)_11rem_11rem_10rem_10rem] lg:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{job.jobNumber}</span>
            <StatusChip status={job.status} />
            {diffFlag ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger">
                Difference
              </span>
            ) : null}
            {job.billing.retentionOnly ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Retention
              </span>
            ) : null}
            <ReconChips alerts={job.recon.alerts} />
          </div>
          <p className="mt-0.5 truncate text-[13px] text-ink/70">{job.name || "Untitled job"}</p>
          <p className="truncate text-[12px] text-ink/45" title={job.pmEmail ?? undefined}>
            {[job.customer, [job.city, job.state].filter(Boolean).join(", "), job.company, job.pm]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className={`mt-1 text-[11px] font-semibold ${alerted ? "text-danger" : "text-ink/45"}`}>
            {RECON_STATUS[job.recon.sitelineClearstory]}
            <span className="ml-2 font-medium text-ink/45">Over / under {money(job.recon.overUnderBillings)}</span>
          </p>
        </div>
        {view === "overview" ? (
          <>
            <Figure label="Revised" value={money(job.contract.revised)} />
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40 lg:hidden">Billed</p>
              <p className="text-sm font-semibold tabular-nums text-ink">{money(job.billing.billed)}</p>
              <div className="mt-1.5 ml-auto h-1.5 w-full max-w-[7rem] overflow-hidden rounded-full bg-ink/[0.06]">
                <div className="h-full rounded-full bg-[#5a5340]" style={{ width: `${billedPct * 100}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] tabular-nums text-ink/45">{ratio(job.billing.pctBilled)}</p>
            </div>
            <Figure label="Backlog" value={money(job.billing.backlog)} />
            <Figure label="Cash flow" value={money(job.cost.cashFlow)} danger={job.cost.cashFlow != null && job.cost.cashFlow < 0} />
          </>
        ) : null}
        {view === "contract" ? (
          <>
            <Figure label="Contract" value={money(job.contract.amount)} />
            <Figure label="Approved COs" value={money(job.contract.approvedCos)} />
            <Figure label="ATP" value={money(job.contract.atp)} />
            <Figure label="Revised" value={money(job.contract.revised)} />
          </>
        ) : null}
        {view === "billing" ? (
          <>
            <Figure label="Billed" value={money(job.billing.billed)} />
            <Figure label="Retainage" value={money(job.billing.retainage)} />
            <Figure label="AR" value={money(job.billing.ar)} />
            <Figure label="% complete" value={ratio(job.billing.percentComplete)} />
          </>
        ) : null}
        {view === "cost" ? (
          costBlank ? (
            <p className="text-[13px] text-ink/45 lg:col-span-4">Costs unavailable</p>
          ) : (
            <>
              <Figure label="LAB + BUR" value={money(job.cost.laborWithBurden)} />
              <Figure label="Total cost" value={money(job.cost.total)} />
              <Figure label="Hours" value={count(job.cost.labHours)} />
              <Figure
                label="Cash flow"
                value={money(job.cost.cashFlow)}
                danger={job.cost.cashFlow != null && job.cost.cashFlow < 0}
              />
            </>
          )
        ) : null}
      </Link>
    </li>
  );
}

function ReconChips({ alerts }: { alerts: JobRecon["alerts"] }) {
  if (alerts.length === 0) return null;
  return (
    <>
      {alerts.map((alert) => (
        <span key={alert.code} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger">
          {alert.label}
        </span>
      ))}
    </>
  );
}

function FullSheet({ jobs, hideCost }: { jobs: JobRow[]; hideCost: boolean }) {
  return (
    <div className={shell}>
      <h2 className="border-b border-[rgba(255,123,17,0.22)] bg-[rgba(255,123,17,0.18)] px-4 py-3 text-center text-[13px] font-semibold text-[#5a5340]">
        Full sheet
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2400px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/[0.06]">
              {[
                "Job #",
                "Name",
                "Customer",
                "City",
                "State",
                "Company",
                "PM",
                "Status",
                "Contract",
                "Approved COs",
                "ATP",
                "In review",
                "Placeholder",
                "Revised",
                "Siteline contract",
                "Difference",
                "Alerts",
                "Siteline / Clearstory",
                "Over / under billings",
                "Billed",
                "Retainage",
                "Backlog",
                "AR",
                "% billed",
                "% complete",
                "Retention only",
                ...(hideCost
                  ? []
                  : [
                      "LAB",
                      "MAT",
                      "SUB",
                      "EQU",
                      "BUR",
                      "INS",
                      "OTH",
                      "DIS",
                      "Total cost",
                      "Labor hours",
                      "Labor rate",
                      "LAB + BUR",
                      "Cash flow",
                    ]),
              ].map((label) => (
                <th
                  key={label}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#5a5340]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const difference = job.recon.difference ?? job.contract.difference;
              const alerted = job.recon.alerts.length > 0;
              const costOff = hideCost || !job.sources.foundation;
              const moneyCell = (n: number | null) => (costOff ? "—" : money(n));
              return (
                <tr key={job.jobNumber} className={`border-b border-ink/[0.06] ${alerted ? "bg-red-50/80" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-ink">
                    <Link href={`/project-financials/jobs/${encodeURIComponent(job.jobNumber)}`} className="hover:underline">
                      {job.jobNumber}
                    </Link>
                  </td>
                  <SheetCell>{job.name || "—"}</SheetCell>
                  <SheetCell>{job.customer || "—"}</SheetCell>
                  <SheetCell>{job.city || "—"}</SheetCell>
                  <SheetCell>{job.state || "—"}</SheetCell>
                  <SheetCell>{job.company || "—"}</SheetCell>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-ink/80" title={job.pmEmail ?? undefined}>
                    {job.pm || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-ink/80">{STATUS_LABEL[job.status]}</td>
                  <Num>{money(job.contract.amount)}</Num>
                  <Num>{money(job.contract.approvedCos)}</Num>
                  <Num>{money(job.contract.atp)}</Num>
                  <Num>{money(job.contract.inReview)}</Num>
                  <Num>{money(job.contract.placeholder)}</Num>
                  <Num>{money(job.contract.revised)}</Num>
                  <Num>{money(job.contract.siteline)}</Num>
                  <Num danger={difference != null && difference !== 0}>{money(difference)}</Num>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="inline-flex gap-1">
                      <ReconChips alerts={job.recon.alerts} />
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2.5 text-sm font-semibold ${alerted ? "text-danger" : "text-ink/70"}`}>
                    {RECON_STATUS[job.recon.sitelineClearstory]}
                  </td>
                  <Num>{money(job.recon.overUnderBillings)}</Num>
                  <Num>{money(job.billing.billed)}</Num>
                  <Num>{money(job.billing.retainage)}</Num>
                  <Num>{money(job.billing.backlog)}</Num>
                  <Num>{money(job.billing.ar)}</Num>
                  <Num>{ratio(job.billing.pctBilled)}</Num>
                  <Num>{ratio(job.billing.percentComplete)}</Num>
                  <SheetCell>{job.billing.retentionOnly ? "Yes" : "No"}</SheetCell>
                  {hideCost ? null : (
                    <>
                      <Num>{moneyCell(job.cost.lab)}</Num>
                      <Num>{moneyCell(job.cost.mat)}</Num>
                      <Num>{moneyCell(job.cost.sub)}</Num>
                      <Num>{moneyCell(job.cost.equ)}</Num>
                      <Num>{moneyCell(job.cost.bur)}</Num>
                      <Num>{moneyCell(job.cost.ins)}</Num>
                      <Num>{moneyCell(job.cost.oth)}</Num>
                      <Num>{moneyCell(job.cost.dis)}</Num>
                      <Num>{moneyCell(job.cost.total)}</Num>
                      <Num>{costOff ? "—" : count(job.cost.labHours)}</Num>
                      <Num>{moneyCell(job.cost.laborRate)}</Num>
                      <Num>{moneyCell(job.cost.laborWithBurden)}</Num>
                      <Num danger={!costOff && job.cost.cashFlow != null && job.cost.cashFlow < 0}>
                        {moneyCell(job.cost.cashFlow)}
                      </Num>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SheetCell({ children }: { children: string }) {
  return <td className="whitespace-nowrap px-3 py-2.5 text-sm text-ink/80">{children}</td>;
}

function Num({ children, danger }: { children: string; danger?: boolean }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums ${danger ? "font-semibold text-danger" : "text-ink/80"}`}>
      {children}
    </td>
  );
}

function Figure({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40 lg:hidden">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: JobStatus }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-800"
      : status === "siteline_only"
        ? "bg-brand/10 text-brand"
        : status === "clearstory_only"
          ? "bg-amber-50 text-amber-800"
          : "bg-ink/[0.06] text-ink/55";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
