"use client";

import { useState, type ReactNode } from "react";
import { sortRows, type SortDir, type SortValue } from "@/lib/sort";

/** Clickable column label with ↕ / ↑ / ↓; goes inside the table's existing <th> so its styling stays. */
export function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: ReactNode;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 [font:inherit] [letter-spacing:inherit] [text-transform:inherit] ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-ink" : "hover:text-ink"}`}
    >
      {label}
      <span aria-hidden className={`text-[10px] ${active ? "" : "opacity-50"}`}>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

/**
 * Click-to-sort for a table. `accessors` maps each sortable column key to the value it sorts by
 * (raw numbers / dates, not formatted text). First click sorts ascending, the next one flips it.
 * Rows keep their original order until a header is clicked.
 */
export function useTableSort<T, K extends string>(
  rows: readonly T[],
  accessors: Record<K, (row: T) => SortValue>,
  initial?: { key: K; dir?: SortDir }
) {
  const [sort, setSort] = useState<{ key: K | null; dir: SortDir }>({
    key: initial?.key ?? null,
    dir: initial?.dir ?? "asc",
  });
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sorted = sort.key ? sortRows(rows, accessors[sort.key], sort.dir) : [...rows];
  const header = (key: K, label: ReactNode, align?: "left" | "right") => (
    <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggle(key)} align={align} />
  );
  return { sorted, sortKey: sort.key, sortDir: sort.dir, toggle, header };
}
