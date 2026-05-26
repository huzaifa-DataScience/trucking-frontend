"use client";

import { useEffect, useState } from "react";

/** Read-only calculated value — subtle highlight when value changes. */
export function ComputedField({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(value);

  useEffect(() => {
    if (value !== prev) {
      setPrev(value);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors duration-500 ${
        flash ? "border-brand/30 bg-brand/[0.04]" : "border-ink/[0.06] bg-[#f8f9fb]"
      } ${emphasis ? "ring-1 ring-brand/10" : ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold tracking-tight text-ink ${
          emphasis ? "text-xl" : ""
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink/45">{hint}</p> : null}
    </div>
  );
}
