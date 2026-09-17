import { TableSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return <TableSkeleton rows={8} toolbar={false} />;
}
