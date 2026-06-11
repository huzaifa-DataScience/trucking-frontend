"use client";

import { useEffect, useState } from "react";

/** Compact read-only metric for the results rail. */
export function BidResultMetric({
  label,
  value,
  mono = true,
  emphasis = false,
  excelRef,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
  excelRef?: string;
}) {
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(value);

  useEffect(() => {
    if (value !== prev) {
      setPrev(value);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 550);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div
      className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-500 ${
        flash ? "bg-brand/[0.08]" : "hover:bg-ink/[0.02]"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
        {excelRef ? (
          <p className="text-[9px] font-mono text-ink/30">{excelRef}</p>
        ) : null}
      </div>
      <p
        className={`shrink-0 text-right font-semibold tracking-tight text-ink ${
          mono ? "font-mono" : ""
        } ${emphasis ? "text-base" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}
