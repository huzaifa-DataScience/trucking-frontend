"use client";

import { useCallback } from "react";
import * as opsApi from "@/lib/api/endpoints/operations";
import { LeedReportScreen } from "@/components/operations/OpsReportScreen";

export default function OpsLeedReportPage() {
  const load = useCallback(
    (q: { from: string; to: string }) => opsApi.reportLeed(q),
    []
  );
  return <LeedReportScreen load={load} />;
}
