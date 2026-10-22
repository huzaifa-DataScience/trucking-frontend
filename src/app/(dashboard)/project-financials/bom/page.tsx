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
import { ListPager } from "@/components/bidding/ListPager";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

/** Jobs per page (server-side). */
const JOBS_PAGE_SIZE = 50;

function BomScreen() {
  const { query } = useFinancialsQuery();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [companies, setCompanies] = useState<FinancialsCompany[]>(DEMO_FILTERS.companies);
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
      : getProjectFinancialsBom(query, { page, pageSize: JOBS_PAGE_SIZE, sortBy: sort?.key, sortDir: sort?.dir });
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
  }, [query, page, sort]);

  // An older backend (or demo data) sends every job: then the table pages nothing and sorts itself.
  const paged = data?.total != null;
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
        <div>
          <BomTable loading={loading} jobs={data.jobs} companies={companies} hideTrimble={hideTrimble} serverSort={paged ? { sort, onSort } : undefined} />
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

export default function ProjectFinancialsBomPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <BomScreen />
    </Suspense>
  );
}
