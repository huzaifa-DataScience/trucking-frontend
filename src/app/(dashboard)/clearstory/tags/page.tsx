"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { ClearstoryTagsList } from "@/components/clearstory/ClearstoryTagsList";

export default function ClearstoryTagsTablePage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 ui-animate-in [--radius:10px] [--radius-md:8px]">
      <PageHeader title="T&M Tags" subtitle="Track T&M tags from Clearstory and see which still need a signature" />
      <ClearstoryTagsList />
    </div>
  );
}
