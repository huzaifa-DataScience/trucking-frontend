"use client";

import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { HaulForm } from "@/components/operations/HaulForm";

export default function NewHaulPage() {
  return (
    <OperationsChrome
      title="Add haul"
      subtitle="One Trucking Record row. Save rate IDs — costs come back from the API."
    >
      <HaulForm />
    </OperationsChrome>
  );
}
