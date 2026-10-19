"use client";

import * as opsApi from "@/lib/api/endpoints/operations";
import { LeedReportScreen } from "@/components/operations/OpsReportScreen";

export default function OpsLeedReportPage() {
  return <LeedReportScreen loadPage={opsApi.reportLeedPage} />;
}
