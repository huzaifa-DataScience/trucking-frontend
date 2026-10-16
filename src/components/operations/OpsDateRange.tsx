"use client";

import { opsFieldClass } from "@/components/operations/OperationsChrome";

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
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-[9rem] flex-col gap-1">
        <span className="text-[11px] font-medium text-ink/45">From</span>
        <input
          type="date"
          className={opsFieldClass}
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
        />
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1">
        <span className="text-[11px] font-medium text-ink/45">To</span>
        <input
          type="date"
          className={opsFieldClass}
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
        />
      </label>
    </div>
  );
}
