"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { CostReportScreen } from "@/components/operations/OpsReportScreen";

export default function OpsDestinationsReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportByDestinations(q),
    []
  );
  return (
    <CostReportScreen
      title="Cost by destination"
      nameHeader="Destination"
      nameOf={(row) => row.destination || "—"}
      load={load}
    />
  );
}
