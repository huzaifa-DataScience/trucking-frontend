"use client";

import {
  Skeleton,
  SkeletonStatRow,
  SkeletonTableRows,
} from "@/components/ui/Skeleton";

/** Shared Mike / Specs / Production loading shells — match surface cards + ink pulse. */

export function MikePageHeaderSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-2 h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
    </div>
  );
}

export function MikeTabNavSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden>
      <Skeleton className="h-9 w-20 rounded-xl" />
      <Skeleton className="h-9 w-28 rounded-xl" />
    </div>
  );
}

/** Production detail — charts + table shape */
export function ProductionDetailSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      role="status"
      aria-label="Loading production report"
    >
      <MikePageHeaderSkeleton />
      <MikeTabNavSkeleton />
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Chart A */}
      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
        <div className="mb-3 flex justify-between gap-3">
          <div>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="mt-3">
          <SkeletonStatRow count={5} />
        </div>
      </section>

      {/* Chart B */}
      <section className="rounded-2xl border border-ink/[0.08] bg-surface p-4 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
        <Skeleton className="mb-3 h-4 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </section>

      {/* Table */}
      <div>
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="mb-3 h-3 w-52" />
        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-3">
          <SkeletonTableRows rows={8} />
        </div>
      </div>
    </div>
  );
}

/** Production list table (page header stays mounted) */
export function ProductionHubSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]"
      role="status"
      aria-label="Loading production list"
    >
      <SkeletonTableRows rows={6} />
    </div>
  );
}

/** Specs page — setup strip + grid */
export function SpecsPageSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      role="status"
      aria-label="Loading specs"
    >
      <MikePageHeaderSkeleton />
      <MikeTabNavSkeleton />

      <div className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex flex-wrap justify-between gap-2">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-3">
        <SkeletonTableRows rows={10} />
      </div>
    </div>
  );
}

/** Estimation library table (page header stays mounted) */
export function EstimationLibrarySkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface p-3 shadow-[0_1px_3px_rgba(1,1,1,0.04)]"
      role="status"
      aria-label="Loading estimation files"
    >
      <SkeletonTableRows rows={7} />
    </div>
  );
}
