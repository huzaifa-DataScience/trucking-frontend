"use client";

import type { ReactNode } from "react";

/** Scrollable list/table region — keeps long workforce lists usable on desktop. */
export function WorkforceScrollPanel({
  children,
  maxHeightClass = "max-h-[min(520px,60vh)]",
  className = "",
}: {
  children: ReactNode;
  maxHeightClass?: string;
  className?: string;
}) {
  return (
    <div
      className={`${maxHeightClass} overflow-auto rounded-xl border border-ink/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}
