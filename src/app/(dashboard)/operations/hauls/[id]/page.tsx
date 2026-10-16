"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as opsApi from "@/lib/api/endpoints/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import type { OperationsHaul } from "@/lib/operations/types";
import { OperationsChrome } from "@/components/operations/OperationsChrome";
import { HaulForm } from "@/components/operations/HaulForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function EditHaulPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [haul, setHaul] = useState<OperationsHaul | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("Invalid haul id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void opsApi
      .getHaul(id)
      .then((row) => {
        if (!cancelled) setHaul(row);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Could not load haul"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <OperationsChrome
      title={haul ? `Haul #${haul.id}` : "Edit haul"}
      subtitle={
        haul
          ? `${haul.ticketDate} · ${haul.jobNumber || "—"} · ${haul.jobName || "—"}`
          : undefined
      }
    >
      {loading ? (
        <TableSkeleton rows={6} toolbar={false} />
      ) : error ? (
        <EmptyState message={error} />
      ) : haul ? (
        <HaulForm haul={haul} />
      ) : (
        <EmptyState message="Haul not found" />
      )}
    </OperationsChrome>
  );
}
