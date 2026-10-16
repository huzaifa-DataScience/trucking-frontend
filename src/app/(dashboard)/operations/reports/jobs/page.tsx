"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

export default function OpsJobsReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByJobs(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by job"
      nameHeader="Job"
      nameOf={(row) => row.jobNumber || "—"}
      load={load}
    />
  );
}
