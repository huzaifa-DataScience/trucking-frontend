"use client";

import { Suspense, use } from "react";
import { BidSheetProvider } from "@/contexts/BidSheetContext";
import { ProcessDraftProvider } from "@/contexts/ProcessDraftContext";
import { BidSheetLayout } from "@/components/bidding/BidSheetLayout";
import { BidSheetSkeleton } from "@/components/ui/Skeleton";

export default function BidSheetRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <BidSheetProvider bidId={id}>
      <ProcessDraftProvider>
        <Suspense fallback={<BidSheetSkeleton />}>
          <BidSheetLayout>{children}</BidSheetLayout>
        </Suspense>
      </ProcessDraftProvider>
    </BidSheetProvider>
  );
}
