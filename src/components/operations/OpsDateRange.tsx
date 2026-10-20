"use client";

import { DatePicker } from "@/components/ui/DatePicker";

/** Same date field as the trucking dashboards (app calendar, rounded), not the browser's native picker. */
const dateClass = "h-9 w-full min-w-0 max-w-full rounded-lg border border-ink/10 bg-surface px-2.5 text-sm";

export function OpsDateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex w-[150px] min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium text-ink/45">From</span>
        <DatePicker ariaLabel="From date" value={from} onChange={(v) => onChange({ from: v, to })} className={dateClass} />
      </label>
      <label className="flex w-[150px] min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium text-ink/45">To</span>
        <DatePicker ariaLabel="To date" value={to} onChange={(v) => onChange({ from, to: v })} className={dateClass} />
      </label>
    </div>
  );
}
