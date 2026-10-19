"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import type { CostReportRow } from "@/lib/operations/types";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

/** Kept outside the component so the paged report does not reload on every render. */
const haulerLabel = (row: CostReportRow) => row.hauler || "—";

export default function OpsHaulersReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByHaulers(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by hauler"
      nameHeader="Hauler"
      nameOf={haulerLabel}
      load={load}
      loadPage={opsApi.reportByHaulersPage}
    />
  );
}
