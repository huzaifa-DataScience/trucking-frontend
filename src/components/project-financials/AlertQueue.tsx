"use client";

import Link from "next/link";
import { queryToSearch } from "@/components/project-financials/FinancialsChrome";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";
import type { FinancialsAlert, FinancialsAlertCounts } from "@/lib/project-financials/types";

const ITEMS: { id: FinancialsAlert; label: string; countKey: keyof FinancialsAlertCounts }[] = [
  { id: "fix", label: "FIX", countKey: "fix" },
  { id: "not_in_siteline", label: "NOT IN SITELINE", countKey: "notInSiteline" },
];

export function AlertQueue({ alerts }: { alerts: FinancialsAlertCounts }) {
  const { query } = useFinancialsQuery();

  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const on = query.alert === item.id;
        return (
          <Link
            key={item.id}
            href={`/project-financials/jobs${queryToSearch({ ...query, alert: item.id })}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              on ? "border-red-200 bg-red-50 text-danger" : "border-ink/10 bg-white/80 text-ink"
            }`}
          >
            {item.label}
            <span className="tabular-nums">{alerts[item.countKey]}</span>
          </Link>
        );
      })}
    </div>
  );
}
