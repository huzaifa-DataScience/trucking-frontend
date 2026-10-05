"use client";

import { Suspense, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { getProjectFinancialsJobs } from "@/lib/api/endpoints/project-financials";
import { demoJobs, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import { asOfLabel, foundationMissing } from "@/lib/project-financials/format";
import type { JobsResponse } from "@/lib/project-financials/types";
import { AlertQueue } from "@/components/project-financials/AlertQueue";
import { FinancialsChrome } from "@/components/project-financials/FinancialsChrome";
import { JobBookTable } from "@/components/project-financials/JobBookTable";
import { MissingBanner } from "@/components/project-financials/MissingBanner";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

function JobBookScreen() {
  const { query } = useFinancialsQuery();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = PROJECT_FINANCIALS_USE_DEMO
      ? Promise.resolve(demoJobs(query))
      : getProjectFinancialsJobs(query);
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
  }, [query]);

  const hideCost = foundationMissing(data?.missing);

  return (
    <FinancialsChrome screen="jobs" asOf={data ? asOfLabel(data.asOf) : undefined}>
      {data ? <AlertQueue alerts={data.alerts} /> : null}
      {data ? <MissingBanner missing={data.missing} /> : null}
      {loading && !data ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.jobs.length === 0 ? (
        <EmptyState message="No jobs match these filters." />
      ) : data ? (
        <JobBookTable jobs={data.jobs} hideCost={hideCost} />
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
