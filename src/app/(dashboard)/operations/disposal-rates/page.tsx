"use client";

import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { DisposalRatesPanel } from "@/components/operations/DisposalRatesPanel";

export default function DisposalRatesPage() {
  return (
    <OperationsChrome
      title="Disposal rate cards"
      subtitle="Disposal prices per load, ton or cubic yard. Inactive rates stay listed but can't be picked for new hauls."
    >
      <DisposalRatesPanel />
    </OperationsChrome>
  );
}
