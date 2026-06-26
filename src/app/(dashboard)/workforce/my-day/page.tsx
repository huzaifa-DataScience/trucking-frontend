"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { MyDayClock } from "@/components/workforce/MyDayClock";
import { useWorkforce } from "@/contexts/WorkforceContext";

export default function MyDayPage() {
  const { syncSubtitle } = useWorkforce();

  return (
    <WorkforceGate requireLinked>
      <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
        <PageHeader title="My day" subtitle={syncSubtitle} />
        <MyDayClock />
      </div>
    </WorkforceGate>
  );
}
