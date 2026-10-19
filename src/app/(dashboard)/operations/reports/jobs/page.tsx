"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import type { CostReportRow } from "@/lib/operations/types";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

/** Kept outside the component so the paged report does not reload on every render. */
const jobLabel = (row: CostReportRow) => row.jobNumber || "—";

export default function OpsJobsReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByJobs(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by job"
      nameHeader="Job"
      nameOf={jobLabel}
      load={load}
      loadPage={opsApi.reportByJobsPage}
    />
  );
}
