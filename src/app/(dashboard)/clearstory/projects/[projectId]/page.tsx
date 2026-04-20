"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { CorPayloadModal, ProjectPayloadModal } from "@/components/clearstory/ApiPayloadFetchModal";
import { useClearstoryCors, useClearstoryProjectSummary } from "@/hooks/useClearstory";
import {
  formatUsdDetailed,
  formatUsdWhole,
  normalizeMoney,
  type ClearstoryCorBucket,
} from "@/lib/api/endpoints/clearstory";

const BUCKETS: { key: ClearstoryCorBucket | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "ATP", label: "ATP" },
  { key: "IN_REVIEW", label: "In review" },
  { key: "PLACEHOLDER", label: "Placeholder" },
  { key: "VOID", label: "Void" },
];

const TABLE_SCROLL = "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function bucketLabel(bucket: string | undefined): string {
  if (!bucket) return "—";
  const row = BUCKETS.find((b) => b.key === bucket);
  return row?.label ?? bucket;
}

export default function ClearstoryProjectDetailPage() {
  const params = useParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : null;

  const [corModalId, setCorModalId] = useState<string | null>(null);
  const [projectJsonOpen, setProjectJsonOpen] = useState(false);

  const { data: summary, error: summaryError, loading: summaryLoading } = useClearstoryProjectSummary(
    projectId,
    !!projectId
  );

  const [bucketKey, setBucketKey] = useState<ClearstoryCorBucket | "ALL">("ALL");
  const [statusInput, setStatusInput] = useState("");
  const [stageInput, setStageInput] = useState("");
  const [debouncedStatus, setDebouncedStatus] = useState("");
  const [debouncedStage, setDebouncedStage] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStatus(statusInput.trim()), 400);
    return () => clearTimeout(t);
  }, [statusInput]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedStage(stageInput.trim()), 400);
    return () => clearTimeout(t);
  }, [stageInput]);

  const apiBucket = bucketKey === "ALL" ? undefined : bucketKey;

  const { data: cors, error: corsError, loading: corsLoading } = useClearstoryCors(
    projectId,
    !!projectId,
    apiBucket,
    debouncedStatus || undefined,
    debouncedStage || undefined
  );

  const project = summary?.project;
  const title = project?.name ?? project?.jobNumber ?? "Project";
  const subtitle = project
    ? [project.jobNumber, project.customerName, project.office].filter(Boolean).join(" · ")
    : undefined;

  const totals = summary?.totals;
  const revised = normalizeMoney(summary?.revisedContractValue);
  const base = normalizeMoney(project?.baseContractValue);

  const kpi = useMemo(
    () => [
      { label: "Base contract", value: formatUsdWhole(base) },
      { label: "Approved CORs", value: formatUsdWhole(normalizeMoney(totals?.approved)) },
      { label: "ATP", value: formatUsdWhole(normalizeMoney(totals?.atp)) },
      { label: "In review", value: formatUsdWhole(normalizeMoney(totals?.inReview)) },
      { label: "Placeholder", value: formatUsdWhole(normalizeMoney(totals?.placeholder)) },
      { label: "Void", value: formatUsdWhole(normalizeMoney(totals?.void)) },
      { label: "Revised contract value", value: formatUsdWhole(revised) },
    ],
    [base, revised, totals]
  );

  const items = cors?.items ?? [];

  if (!projectId) {
    return (
      <p className="text-sm text-ink/55" role="alert">
        Invalid project link.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/clearstory/projects"
          className="w-fit text-sm font-medium text-brand hover:text-brand-secondary"
        >
          ← All projects
        </Link>
        <button
          type="button"
          onClick={() => setProjectJsonOpen(true)}
          className="w-fit rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-brand/30 hover:text-ink"
        >
          Full project JSON
        </button>
      </div>

      <PageHeader title={title} subtitle={subtitle} />

      {summaryLoading ? (
        <div className="flex justify-center py-12">
          <LogoLoader size={32} />
        </div>
      ) : summaryError ? (
        <p className="text-sm text-red-600" role="alert">
          {summaryError}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {kpi.map((row) => (
            <Card key={row.label} className="!p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">{row.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{row.value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader
          title="Change order register"
          subtitle="Lean list from the mirror. Open full JSON for a row to match Swagger (e.g. integration metadata). Filter by bucket or raw status / stage."
        />
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="COR bucket">
            {BUCKETS.map(({ key, label }) => {
              const selected = bucketKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBucketKey(key)}
                  aria-pressed={selected}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected ? "bg-brand text-white" : "bg-ink/[0.06] text-ink/70 hover:bg-ink/[0.09]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div>
              <label htmlFor="cor-status-filter" className="mb-1 block text-[10px] font-semibold uppercase text-ink/40">
                Status
              </label>
              <input
                id="cor-status-filter"
                type="search"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                placeholder="Raw status"
                className="w-full min-w-[8rem] rounded-lg border border-ink/10 bg-[#f8f9fb] px-2 py-1.5 text-sm sm:w-40"
              />
            </div>
            <div>
              <label htmlFor="cor-stage-filter" className="mb-1 block text-[10px] font-semibold uppercase text-ink/40">
                Stage
              </label>
              <input
                id="cor-stage-filter"
                type="search"
                value={stageInput}
                onChange={(e) => setStageInput(e.target.value)}
                placeholder="Raw stage"
                className="w-full min-w-[8rem] rounded-lg border border-ink/10 bg-[#f8f9fb] px-2 py-1.5 text-sm sm:w-40"
              />
            </div>
          </div>
        </div>

        {corsLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <LogoLoader size={32} />
          </div>
        ) : corsError ? (
          <p className="text-sm text-red-600" role="alert">
            {corsError}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/55">
            No CORs for this filter. Clearstory may have no rows in this bucket, or data has not synced yet.
          </p>
        ) : (
          <div className={TABLE_SCROLL}>
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <caption className="sr-only">Change orders for {title}</caption>
              <thead>
                <tr className="border-b border-ink/[0.08] text-xs font-semibold uppercase tracking-wide text-ink/45">
                  <th scope="col" className="sticky left-0 z-[1] bg-surface px-2 py-2.5">
                    COR #
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Bucket
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Status
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Stage
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Requested
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Void
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Updated
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    <span className="sr-only">Full JSON</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const statusText = row.status?.trim() || "—";
                  const stageText = row.stage?.trim() || "—";
                  return (
                    <tr key={row.id} className="border-b border-ink/[0.06] hover:bg-ink/[0.02]">
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] bg-surface px-2 py-2.5 text-left font-mono text-xs font-normal text-ink"
                      >
                        {row.corNumber ?? row.issueNumber ?? row.numericId ?? row.id.slice(0, 8)}
                      </th>
                      <td className="px-2 py-2.5 text-ink/80">{bucketLabel(row.statusBucket)}</td>
                      <td className="max-w-[10rem] truncate px-2 py-2.5 text-ink/80" title={row.status}>
                        {statusText}
                      </td>
                      <td className="max-w-[10rem] truncate px-2 py-2.5 text-ink/80" title={row.stage}>
                        {stageText}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ink">
                        {formatUsdDetailed(normalizeMoney(row.requestedAmount))}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ink">
                        {formatUsdDetailed(normalizeMoney(row.totalAmount))}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ink/70">
                        {formatUsdDetailed(normalizeMoney(row.voidAmount))}
                      </td>
                      <td className="px-2 py-2.5 text-xs text-ink/55">{formatDate(row.updatedAt)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setCorModalId(row.id)}
                          className="text-xs font-semibold text-brand hover:text-brand-secondary"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CorPayloadModal corId={corModalId} onClose={() => setCorModalId(null)} />
      <ProjectPayloadModal
        projectId={projectJsonOpen ? projectId : null}
        onClose={() => setProjectJsonOpen(false)}
      />
    </div>
  );
}
