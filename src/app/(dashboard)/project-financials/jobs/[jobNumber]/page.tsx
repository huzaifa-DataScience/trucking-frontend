"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { getProjectFinancialsJob } from "@/lib/api/endpoints/project-financials";
import { demoJob, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import { count, money, ratio } from "@/lib/project-financials/format";
import type { JobRow } from "@/lib/project-financials/types";
import { useToast } from "@/components/ui/ToastProvider";
import { FormSkeleton } from "@/components/ui/Skeleton";

export default function ProjectFinancialsJobPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber ?? "");
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<JobRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobNumber) return;
    let cancelled = false;
    const load = (async () => {
      if (PROJECT_FINANCIALS_USE_DEMO) {
        const found = demoJob(jobNumber);
        if (!found) throw new ApiError(`${jobNumber} not found`, 404);
        return found;
      }
      return getProjectFinancialsJob(jobNumber);
    })();
    void load
      .then((next) => {
        if (!cancelled) setJob(next);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = getApiErrorMessage(e, "Couldn't open that job");
        if (e instanceof ApiError && e.status === 404) {
          showToast(message, "error");
          router.replace("/project-financials/jobs");
          return;
        }
        setError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [jobNumber, router, showToast]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }
  if (!job) return <FormSkeleton fields={6} />;

  const costOff = !job.sources.foundation;
  const difference = job.recon.difference ?? job.contract.difference;
  const diffFlag = difference != null && difference !== 0;
  const alerted = job.recon.alerts.length > 0;
  const place = [job.city, job.state].filter(Boolean).join(", ");
  const revised = job.contract.revised;
  const backlogLeft = revised > 0 && job.billing.backlog != null ? job.billing.backlog / revised : null;
  const costParts = [
    ["LAB", job.cost.lab, "#5a5340"],
    ["MAT", job.cost.mat, "#ff7b11"],
    ["SUB", job.cost.sub, "#c4a574"],
    ["EQU", job.cost.equ, "#6b7280"],
    ["BUR", job.cost.bur, "#b45309"],
    ["INS", job.cost.ins, "#78716c"],
    ["OTH", job.cost.oth, "#a8a29e"],
    ["DIS", job.cost.dis, "#d6d3d1"],
  ] as const;
  const costTotal = costParts.reduce((sum, part) => sum + part[1], 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/project-financials/jobs" className="text-xs font-semibold text-ink/45 hover:text-ink">
          Job book
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">
          {job.jobNumber}
          {job.name ? <span className="font-medium text-ink/70"> · {job.name}</span> : null}
        </h1>
        {alerted ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.recon.alerts.map((alert) => (
              <span key={alert.code} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">
                {alert.label}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1 text-sm text-ink/55">
          {[job.customer, place, job.company, job.pm].filter(Boolean).join(" · ") || "No customer on this job"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Hero label="Revised contract" value={money(revised)} />
        <Hero
          label="Cash flow"
          value={money(job.cost.cashFlow)}
          danger={job.cost.cashFlow != null && job.cost.cashFlow < 0}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-white/70 bg-white/55 px-4 py-3 shadow-[0_6px_16px_rgba(255,123,17,0.08)] backdrop-blur-md">
        <Track label="Billed" value={ratio(job.billing.pctBilled)} ratio={job.billing.pctBilled} />
        <Track label="Complete" value={ratio(job.billing.percentComplete)} ratio={job.billing.percentComplete} />
        <Track label="Backlog remaining" value={backlogLeft == null ? "—" : ratio(backlogLeft)} ratio={backlogLeft} />
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Contract">
          <Row label="Contract" value={money(job.contract.amount)} />
          <Row label="Approved COs" value={money(job.contract.approvedCos)} />
          <Row label="Approved to proceed" value={money(job.contract.atp)} />
          <Row label="In review" value={money(job.contract.inReview)} />
          <Row label="Placeholder" value={money(job.contract.placeholder)} />
          <Row label="Revised" value={money(job.contract.revised)} />
          <Row label="Siteline contract" value={money(job.contract.siteline)} />
          <Row label="Difference" value={money(difference)} flag={diffFlag} />
        </Panel>
        <Panel title="Errors">
          <Row
            label="Status"
            value={
              job.recon.sitelineClearstory === "fix"
                ? "FIX"
                : job.recon.sitelineClearstory === "not_in_siteline"
                  ? "NOT IN SITELINE"
                  : "OK"
            }
            flag={alerted}
          />
          <Row label="Over / under billings" value={money(job.recon.overUnderBillings)} />
          <div className="flex flex-wrap gap-1.5">
            {job.recon.alerts.length === 0 ? (
              <span className="text-[13px] text-ink/45">No alerts</span>
            ) : (
              job.recon.alerts.map((alert) => (
                <span key={alert.code} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {alert.label}
                </span>
              ))
            )}
          </div>
        </Panel>
        <Panel title="Billing">
          <Row label="Billed" value={money(job.billing.billed)} />
          <Row label="Retainage" value={money(job.billing.retainage)} />
          <Row label="Backlog" value={money(job.billing.backlog)} />
          <Row label="AR" value={money(job.billing.ar)} />
          <Row label="% billed" value={ratio(job.billing.pctBilled)} />
          <Row label="% complete" value={ratio(job.billing.percentComplete)} />
          <Row label="Retention only" value={job.billing.retentionOnly ? "Yes" : "No"} />
        </Panel>
        <Panel title="Cost">
          {costOff ? (
            <p className="text-[13px] text-ink/50">Costs unavailable. Foundation did not return this job.</p>
          ) : (
            <>
              {costTotal > 0 ? (
                <div className="mb-3">
                  <div className="flex h-3 overflow-hidden rounded-full bg-ink/[0.06]">
                    {costParts.map(([label, amount, color]) =>
                      amount > 0 ? (
                        <div
                          key={label}
                          title={`${label} ${money(amount)}`}
                          style={{ width: `${(amount / costTotal) * 100}%`, background: color }}
                        />
                      ) : null
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {costParts.map(([label, amount, color]) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-ink/55">
                        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <Row label="LAB" value={money(job.cost.lab)} />
              <Row label="MAT" value={money(job.cost.mat)} />
              <Row label="SUB" value={money(job.cost.sub)} />
              <Row label="EQU" value={money(job.cost.equ)} />
              <Row label="BUR" value={money(job.cost.bur)} />
              <Row label="INS" value={money(job.cost.ins)} />
              <Row label="OTH" value={money(job.cost.oth)} />
              <Row label="DIS" value={money(job.cost.dis)} />
              <Row label="Total cost" value={money(job.cost.total)} />
              <Row label="Labor hours" value={count(job.cost.labHours)} />
              <Row label="Labor rate" value={money(job.cost.laborRate)} />
              <Row label="LAB + BUR" value={money(job.cost.laborWithBurden)} />
              <Row label="Cash flow" value={money(job.cost.cashFlow)} flag={job.cost.cashFlow != null && job.cost.cashFlow < 0} />
            </>
          )}
        </Panel>
        <Panel title="Sources">
          <Row label="Siteline" value={job.sources.siteline ? "Yes" : "No"} />
          <Row label="Clearstory" value={job.sources.clearstory ? "Yes" : "No"} />
          <Row label="Ref job" value={job.sources.refJob ? "Yes" : "No"} />
          <Row label="Foundation" value={job.sources.foundation ? "Yes" : "No"} />
          {job.pmEmail ? <Row label="PM email" value={job.pmEmail} /> : null}
        </Panel>
      </div>
    </div>
  );
}

function Hero({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/55 px-4 py-4 shadow-[0_6px_16px_rgba(255,123,17,0.08)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Track({ label, value, ratio: share }: { label: string; value: string; ratio: number | null }) {
  const width = share == null ? 0 : Math.max(0, Math.min(100, share * 100));
  return (
    <div className="py-2">
      <div className="mb-1.5 flex justify-between text-[12px]">
        <span className="text-ink/55">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <div className="h-full rounded-full bg-[#5a5340]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_6px_16px_rgba(255,123,17,0.08)] backdrop-blur-md">
      <h2 className="border-b border-[rgba(255,123,17,0.22)] bg-[rgba(255,123,17,0.18)] px-4 py-3 text-center text-[13px] font-semibold text-[#5a5340]">
        {title}
      </h2>
      <dl className="flex flex-col gap-2 px-4 py-3">{children}</dl>
    </section>
  );
}

function Row({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <dt className="text-ink/50">{label}</dt>
      <dd className={`tabular-nums ${flag ? "font-semibold text-danger" : "font-medium text-ink"}`}>{value}</dd>
    </div>
  );
}
