"use client";

import { Suspense, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { getProjectFinancialsSummary } from "@/lib/api/endpoints/project-financials";
import { demoSummary, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import { asOfLabel, foundationMissing } from "@/lib/project-financials/format";
import type { SummaryResponse } from "@/lib/project-financials/types";
import { AlertQueue } from "@/components/project-financials/AlertQueue";
import { FinancialsChrome } from "@/components/project-financials/FinancialsChrome";
import { MissingBanner } from "@/components/project-financials/MissingBanner";
import { SummaryTable } from "@/components/project-financials/SummaryTable";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

function SummaryScreen() {
  const { query } = useFinancialsQuery();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = PROJECT_FINANCIALS_USE_DEMO
      ? Promise.resolve(demoSummary(query))
      : getProjectFinancialsSummary(query);
    void load
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Couldn't load the summary"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <FinancialsChrome screen="summary" asOf={data ? asOfLabel(data.asOf) : undefined}>
      {data ? <AlertQueue alerts={data.alerts} /> : null}
      {data ? <MissingBanner missing={data.missing} /> : null}
      {foundationMissing(data?.missing) ? (
        <p className="text-[12.5px] text-ink/45">Total cost on this summary may be incomplete.</p>
      ) : null}
      {loading && !data ? (
        <TableSkeleton rows={6} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.rows.length === 0 ? (
        <EmptyState message="No project managers match these filters." />
      ) : data ? (
        <SummaryTable rows={data.rows} totals={data.totals} />
      ) : null}
    </FinancialsChrome>
  );
}

export default function ProjectFinancialsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <SummaryScreen />
    </Suspense>
  );
}
