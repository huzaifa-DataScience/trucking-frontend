"use client";

import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { HaulerRatesPanel } from "@/components/operations/HaulerRatesPanel";

export default function HaulerRatesPage() {
  return (
    <OperationsChrome
      title="Hauler rate cards"
      subtitle="Add and edit in a modal. Saving a card updates cost on every haul that uses it."
    >
      <HaulerRatesPanel />
    </OperationsChrome>
  );
}
