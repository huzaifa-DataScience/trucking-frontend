"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type SoftTabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
};

/** Soft pill/tab chrome shared by Estimates status, Projects COR buckets, saved views. */
export function SoftTab({ selected = false, className = "", children, ...rest }: SoftTabProps) {
  return (
    <button
      type="button"
      aria-selected={selected}
      aria-pressed={selected}
      className={`cs-soft-tab ${selected ? "is-active" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
