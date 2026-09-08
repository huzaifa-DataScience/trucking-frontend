"use client";

import { use } from "react";
import { EstimationFileDetail } from "@/components/bidding/specs/EstimationFileDetail";

export default function EstimationFileDetailRoute({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const { fileId } = use(params);
  return <EstimationFileDetail fileId={fileId} />;
}
