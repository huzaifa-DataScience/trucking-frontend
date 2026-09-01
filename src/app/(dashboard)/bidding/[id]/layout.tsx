"use client";

import { Suspense, use } from "react";
import { BidSheetProvider } from "@/contexts/BidSheetContext";
import { BidSheetLayout } from "@/components/bidding/BidSheetLayout";
import { LogoLoader } from "@/components/ui/LogoLoader";

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
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-24">
            <LogoLoader />
          </div>
        }
      >
        <BidSheetLayout>{children}</BidSheetLayout>
      </Suspense>
    </BidSheetProvider>
  );
}
