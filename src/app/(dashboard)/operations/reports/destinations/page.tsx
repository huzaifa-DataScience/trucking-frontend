"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import type { CostReportRow } from "@/lib/operations/types";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

/** Kept outside the component so the paged report does not reload on every render. */
const destinationLabel = (row: CostReportRow) => row.destination || "—";

export default function OpsDestinationsReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByDestinations(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by destination"
      nameHeader="Destination"
      nameMaxWidth="max-w-[15rem]"
      nameOf={destinationLabel}
      load={load}
      loadPage={opsApi.reportByDestinationsPage}
    />
  );
}
