/**
 * Shape-matched loading skeletons (UX doc §5) — content areas use these
 * instead of a centered LogoLoader; LogoLoader is for full-page boot only.
 */

import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`animate-pulse rounded-lg bg-ink/[0.06] ${className}`} style={style} aria-hidden />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.05)] ${className}`}
      aria-hidden
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-6 h-3 w-28" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading stats"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-ink/[0.08] bg-surface p-4"
          aria-hidden
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading rows">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Shape-matched loading state for a single table/list page: optional toolbar row + N table rows. */
export function TableSkeleton({ rows = 8, toolbar = true }: { rows?: number; toolbar?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-4 py-2" role="status" aria-label="Loading table">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-ink/[0.08]">
        <Skeleton className="h-10 w-full rounded-none" />
        <div className="space-y-0">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="border-t border-ink/[0.06] px-3 py-3">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Shape-matched loading state for icon+text list rows (chat inbox, notification lists). */
export function SkeletonListRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink/[0.05]" role="status" aria-label="Loading list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shape-matched loading state for a chat message thread: alternating bubble widths. */
export function SkeletonChatBubbles({ rows = 6 }: { rows?: number }) {
  const widths = [45, 60, 35, 55, 40, 65, 50, 30];
  return (
    <div className="flex flex-col gap-3 py-4" role="status" aria-label="Loading messages">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex ${i % 3 === 1 ? "justify-end" : "justify-start"}`}>
          <Skeleton className="h-9 rounded-2xl" style={{ width: `${widths[i % widths.length]}%`, maxWidth: 320 }} />
        </div>
      ))}
    </div>
  );
}

/** Shape-matched loading state for form/wizard pages: label+field blocks. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-5 py-2" role="status" aria-label="Loading form">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
