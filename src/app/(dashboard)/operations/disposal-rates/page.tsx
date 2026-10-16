"use client";

import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { DisposalRatesPanel } from "@/components/operations/DisposalRatesPanel";

export default function DisposalRatesPage() {
  return (
    <OperationsChrome
      title="Disposal rate cards"
      subtitle="Load / ton / CY rates. Inactive cards stay listed here but drop out of the haul form."
    >
      <DisposalRatesPanel />
    </OperationsChrome>
  );
}
