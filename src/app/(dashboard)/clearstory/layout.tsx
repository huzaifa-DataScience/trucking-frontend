"use client";

import { ClearstorySubNav } from "@/components/clearstory/ClearstorySubNav";

export default function ClearstoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden">
      <ClearstorySubNav />
      {children}
    </div>
  );
}
