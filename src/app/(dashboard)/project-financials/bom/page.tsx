"use client";

import { Suspense, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  getProjectFinancialsBom,
  getProjectFinancialsFilters,
} from "@/lib/api/endpoints/project-financials";
import { DEMO_FILTERS, demoBom, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import { asOfLabel, trimbleBomMissing } from "@/lib/project-financials/format";
import type { FinancialsCompany, JobsResponse } from "@/lib/project-financials/types";
import { BomTable } from "@/components/project-financials/BomTable";
import { FinancialsChrome } from "@/components/project-financials/FinancialsChrome";
import { MissingBanner } from "@/components/project-financials/MissingBanner";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

function BomScreen() {
  const { query } = useFinancialsQuery();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [companies, setCompanies] = useState<FinancialsCompany[]>(DEMO_FILTERS.companies);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (PROJECT_FINANCIALS_USE_DEMO) {
      setCompanies(DEMO_FILTERS.companies);
      return;
    }
    void getProjectFinancialsFilters()
      .then((f) => setCompanies(f.companies.length ? f.companies : DEMO_FILTERS.companies))
      .catch(() => setCompanies(DEMO_FILTERS.companies));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = PROJECT_FINANCIALS_USE_DEMO
      ? Promise.resolve(demoBom(query))
      : getProjectFinancialsBom(query);
    void load
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Couldn't load BOM tracking"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const hideTrimble = trimbleBomMissing(data?.missing);

  return (
    <FinancialsChrome screen="bom" asOf={data ? asOfLabel(data.asOf) : undefined}>
      {data ? <MissingBanner missing={data.missing} /> : null}
      {loading && !data ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.jobs.length === 0 ? (
        <EmptyState message="No jobs match these filters." />
      ) : data ? (
        <BomTable jobs={data.jobs} companies={companies} hideTrimble={hideTrimble} />
      ) : null}
    </FinancialsChrome>
  );
}

export default function ProjectFinancialsBomPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <BomScreen />
    </Suspense>
  );
}
