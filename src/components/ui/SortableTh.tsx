"use client";

import type { CSSProperties, ReactNode } from "react";

export type SortDir = "asc" | "desc";

type SortableThProps<T extends string = string> = {
  label: ReactNode;
  column: T;
  active: boolean;
  dir: SortDir;
  onSort: (key: T) => void;
  className?: string;
  style?: CSSProperties;
  thRef?: (el: HTMLTableCellElement | null) => void;
  align?: "left" | "right";
};

/** Estimates-style sortable column header (muted label + text ↕/↑/↓). */
export function SortableTh<T extends string = string>({
  label,
  column,
  active,
  dir,
  onSort,
  className = "",
  style,
  thRef,
  align = "left",
}: SortableThProps<T>) {
  return (
    <th
      ref={thRef}
      scope="col"
      style={style}
      className={`whitespace-nowrap px-3 py-2 ${align === "right" ? "text-right" : "text-left"} ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 font-semibold ${
          align === "right" ? "flex-row-reverse" : "text-left"
        } ${active ? "text-ink" : "text-ink/50 hover:text-ink"}`}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
