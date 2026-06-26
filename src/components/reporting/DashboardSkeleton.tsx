import { Skeleton, SkeletonStatRow, SkeletonTableRows } from "@/components/ui/Skeleton";

/**
 * Shape-matched loading state for the operations dashboards
 * (KPI strip + two summary tables), per UX doc §9.
 */
export function DashboardSkeleton({ kpiCount = 3 }: { kpiCount?: number }) {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Loading dashboard">
      <SkeletonStatRow count={kpiCount} />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.06)]"
            aria-hidden
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-1.5 h-3 w-52" />
            <div className="mt-5">
              <SkeletonTableRows rows={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
