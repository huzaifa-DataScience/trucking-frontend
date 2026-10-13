"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LinkPending } from "@/components/ui/LinkPending";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SkeletonStatRow, TableSkeleton } from "@/components/ui/Skeleton";
import { CountCard } from "@/components/ui/CountCard";
import { SoftTab } from "@/components/ui/SoftTab";
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

const TABLE_SCROLL =
  "min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]";

const SOFT_FIELD =
  "cs-field h-9 w-full min-w-[8rem] border px-2.5 text-[13px] font-medium text-ink sm:w-40";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
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
      <p className="text-sm text-ink-muted" role="alert">
        Invalid project link.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 ui-animate-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Same back pill + breadcrumb as the Billing project page. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href="/clearstory/projects"
            className="inline-flex h-7 w-fit items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-white pl-2 pr-2.5 text-[13px] font-medium text-ink transition-colors hover:border-[#d1d5db] hover:bg-[#f3f4f6]"
          >
            <LinkPending
              iconSide="start"
              icon={
                <svg className="h-3.5 w-3.5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              All projects
            </LinkPending>
          </Link>
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex flex-wrap items-center gap-0.5 text-[12.5px] text-ink-muted">
              <li>Clearstory</li>
              <li aria-hidden className="mx-0.5 text-ink-soft">
                ›
              </li>
              <li>
                <Link
                  href="/clearstory/projects"
                  className="rounded px-1 py-0.5 font-medium transition-colors hover:bg-brand-tint hover:text-brand-secondary"
                >
                  Projects
                </Link>
              </li>
              {project?.jobNumber ? (
                <>
                  <li aria-hidden className="mx-0.5 text-ink-soft">
                    ›
                  </li>
                  <li className="font-medium text-ink" aria-current="page">
                    {project.jobNumber}
                  </li>
                </>
              ) : null}
            </ol>
          </nav>
        </div>
        <button
          type="button"
          onClick={() => setProjectJsonOpen(true)}
          className="cs-soft-control shrink-0"
        >
          Full project JSON
        </button>
      </div>

      <PageHeader title={title} subtitle={subtitle} />

      {summaryLoading ? (
        <SkeletonStatRow count={7} />
      ) : summaryError ? (
        <p className="cs-helper text-red-600" role="alert">
          {summaryError}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {kpi.map((row) => (
            <CountCard key={row.label} tile value={row.value} label={row.label} />
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div>
          <h2 className="cs-section-title">Change order register</h2>
          <p className="cs-helper mt-1">
            Lean list from the mirror. Open full JSON for a row to match Swagger. Filter by bucket or raw status /
            stage.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div
            className="flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-[var(--border-subtle)] pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1"
            role="tablist"
            aria-label="COR bucket"
          >
            {BUCKETS.map(({ key, label }) => (
              <SoftTab key={key} selected={bucketKey === key} onClick={() => setBucketKey(key)}>
                {label}
              </SoftTab>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div>
              <label htmlFor="cor-status-filter" className="cs-form-label mb-1 block">
                Status
              </label>
              <input
                id="cor-status-filter"
                type="search"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                placeholder="Raw status"
                className={SOFT_FIELD}
              />
            </div>
            <div>
              <label htmlFor="cor-stage-filter" className="cs-form-label mb-1 block">
                Stage
              </label>
              <input
                id="cor-stage-filter"
                type="search"
                value={stageInput}
                onChange={(e) => setStageInput(e.target.value)}
                placeholder="Raw stage"
                className={SOFT_FIELD}
              />
            </div>
          </div>
        </div>

        {corsLoading ? (
          <TableSkeleton rows={6} toolbar={false} />
        ) : corsError ? (
          <p className="cs-helper text-red-600" role="alert">
            {corsError}
          </p>
        ) : items.length === 0 ? (
          <p className="cs-helper">
            No CORs for this filter. Clearstory may have no rows in this bucket, or data has not synced yet.
          </p>
        ) : (
          <div className={`cs-data-table cs-table-shell ${TABLE_SCROLL}`}>
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <caption className="sr-only">Change orders for {title}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-[1] whitespace-nowrap bg-[#f3f4f6] px-3 py-2">
                    COR #
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">
                    Bucket
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">
                    Status
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">
                    Stage
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">
                    Requested
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">
                    Total
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">
                    Void
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">
                    Updated
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">
                    <span className="sr-only">Full JSON</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const statusText = row.status?.trim() || "—";
                  const stageText = row.stage?.trim() || "—";
                  const zebra = idx % 2 === 1;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${
                        zebra ? "bg-canvas/50" : "bg-white"
                      }`}
                    >
                      <th
                        scope="row"
                        className={`sticky left-0 z-[1] whitespace-nowrap px-3 py-2.5 text-left align-middle font-medium text-ink ${
                          zebra ? "bg-canvas/50" : "bg-white"
                        }`}
                      >
                        {row.corNumber ?? row.issueNumber ?? row.numericId ?? row.id.slice(0, 8)}
                      </th>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px]">
                        {bucketLabel(row.statusBucket)}
                      </td>
                      <td
                        className="max-w-[10rem] truncate whitespace-nowrap px-3 py-2.5 align-middle text-[13px]"
                        title={row.status}
                      >
                        {statusText}
                      </td>
                      <td
                        className="max-w-[10rem] truncate whitespace-nowrap px-3 py-2.5 align-middle text-[13px]"
                        title={row.stage}
                      >
                        {stageText}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[13px] ui-num">
                        {formatUsdDetailed(normalizeMoney(row.requestedAmount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[13px] ui-num">
                        {formatUsdDetailed(normalizeMoney(row.totalAmount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[13px] text-ink-muted ui-num">
                        {formatUsdDetailed(normalizeMoney(row.voidAmount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink-muted">
                        {formatDate(row.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => setCorModalId(row.id)}
                          className="text-[13px] font-medium text-brand hover:underline"
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
      </div>

      <CorPayloadModal corId={corModalId} onClose={() => setCorModalId(null)} />
      <ProjectPayloadModal
        projectId={projectJsonOpen ? projectId : null}
        onClose={() => setProjectJsonOpen(false)}
      />
    </div>
  );
}
