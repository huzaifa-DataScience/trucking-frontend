import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export interface StatTile {
  label: string;
  value: ReactNode;
  /** Plain-text value for the hover title when the tile truncates (long site / company names). */
  title?: string;
}

/** Slim header stat tiles for the trucking dashboards — label over value, beside the page title. */
export function StatTiles({ items, loading }: { items: StatTile[]; loading?: boolean }) {
  return (
    <dl className="flex flex-wrap gap-2">
      {items.map((k) => (
        <div
          key={k.label}
          className="min-w-0 max-w-[240px] rounded-[10px] border border-[var(--border-subtle)] bg-white px-3 py-[5px] shadow-[0_1px_2px_rgba(1,1,1,0.05)]"
        >
          <dt className="text-[11.5px] leading-[1.3] text-ink-muted">{k.label}</dt>
          <dd
            className="truncate whitespace-nowrap text-[15px] font-semibold leading-[1.35] tabular-nums text-ink"
            title={k.title}
          >
            {loading ? <Skeleton className="my-[3px] h-4 w-20" /> : k.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
