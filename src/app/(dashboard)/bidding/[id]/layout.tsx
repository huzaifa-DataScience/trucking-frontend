"use client";

import { use } from "react";
import { BidSheetProvider } from "@/contexts/BidSheetContext";
import { BidSheetLayout } from "@/components/bidding/BidSheetLayout";

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
      <BidSheetLayout>{children}</BidSheetLayout>
    </BidSheetProvider>
  );
}
