"use client";

import type { MikeFileInfo } from "@/lib/bidding/specs-types";

/**
 * One physical Mike takeoff per bid — show user-chosen fileName.
 * FRONTEND_BIDDING_SPECS.md §1 / §7
 */
export function MikeFilesList({
  files,
  canWrite,
  busyId,
  onDelete,
}: {
  files: MikeFileInfo[];
  canWrite: boolean;
  busyId?: number | null;
  onDelete: (fileId: number) => void;
}) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-canvas/40 px-4 py-3 text-sm text-ink/50">
        No takeoff yet — upload Mike CSV / XLSX. You choose the takeoff name +
        job; extra files append into the same takeoff.
      </div>
    );
  }

  const primary = files[0];
  const totalRows = files.reduce((n, f) => n + (f.rowCount || 0), 0);
  const name = primary.fileName || "Mike takeoff";
  const busy = busyId === primary.id;

  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-canvas/30 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Takeoff
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{name}</p>
          <p className="mt-0.5 text-xs text-ink/50">
            {totalRows.toLocaleString()} rows · one Mike file on this bid
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  `Delete takeoff “${name}”? All Mike rows on this bid will be removed.`
                )
              ) {
                onDelete(primary.id);
              }
            }}
            className="text-xs font-semibold text-danger hover:underline disabled:opacity-45"
          >
            {busy ? "…" : "Delete takeoff"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
