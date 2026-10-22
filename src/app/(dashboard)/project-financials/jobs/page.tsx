"use client";

import { Suspense, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { getProjectFinancialsJobs } from "@/lib/api/endpoints/project-financials";
import { demoJobs, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import { asOfLabel, foundationMissing } from "@/lib/project-financials/format";
import type { JobsResponse } from "@/lib/project-financials/types";
import { FinancialsChrome } from "@/components/project-financials/FinancialsChrome";
import { JobBookTable } from "@/components/project-financials/JobBookTable";
import { MissingBanner } from "@/components/project-financials/MissingBanner";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";
import { ListPager } from "@/components/bidding/ListPager";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

/** Jobs per page (server-side). */
const JOBS_PAGE_SIZE = 50;

function JobBookScreen() {
  const { query } = useFinancialsQuery();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Paged and sorted on the server (same click rule as the table: up, then down). A new filter or sort
  // starts again at page 1.
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const onSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const pageKey = JSON.stringify([query, sort]);
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 });
  const page = pageState.key === pageKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: pageKey, page: next });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = PROJECT_FINANCIALS_USE_DEMO
      ? Promise.resolve(demoJobs(query))
      : getProjectFinancialsJobs(query, { page, pageSize: JOBS_PAGE_SIZE, sortBy: sort?.key, sortDir: sort?.dir });
    void load
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Couldn't load the job book"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, page, sort]);

  // An older backend (or demo data) sends every job: then the table pages nothing and sorts itself.
  const paged = data?.total != null;
  const hideCost = foundationMissing(data?.missing);

  return (
    <FinancialsChrome screen="jobs" asOf={data ? asOfLabel(data.asOf) : undefined}>
      {data ? <MissingBanner missing={data.missing} /> : null}
      {loading && !data ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.jobs.length === 0 ? (
        <EmptyState message="No jobs match these filters." />
      ) : data ? (
        <div>
          <JobBookTable loading={loading} jobs={data.jobs} hideCost={hideCost} serverSort={paged ? { sort, onSort } : undefined} />
          {paged ? (
            <div className="mt-3">
              <ListPager page={data.page ?? page} pageSize={data.pageSize ?? JOBS_PAGE_SIZE} total={data.total ?? 0} noun="job" busy={loading} onPage={setPage} />
            </div>
          ) : null}
        </div>
      ) : null}
    </FinancialsChrome>
  );
}

export default function ProjectFinancialsJobsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <JobBookScreen />
    </Suspense>
  );
}
