"use client";

import { BillingWorkspaceSubNav } from "@/components/dashboard/BillingWorkspaceSubNav";

export default function ClearstoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden sm:flex-row sm:gap-6">
      <BillingWorkspaceSubNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 border-t border-ink/[0.08] pt-5 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
        {children}
      </div>
    </div>
  );
}
