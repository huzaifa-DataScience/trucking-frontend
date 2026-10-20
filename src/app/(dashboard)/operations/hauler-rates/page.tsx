"use client";

import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { HaulerRatesPanel } from "@/components/operations/HaulerRatesPanel";

export default function HaulerRatesPage() {
  return (
    <OperationsChrome
      title="Hauler rate cards"
      subtitle="Trucking prices for each hauler. Changing a rate updates the cost of every haul that uses it."
    >
      <HaulerRatesPanel />
    </OperationsChrome>
  );
}
