"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

export default function OpsHaulersReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByHaulers(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by hauler"
      nameHeader="Hauler"
      nameOf={(row) => row.hauler || "—"}
      load={load}
    />
  );
}
