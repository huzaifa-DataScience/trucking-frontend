import { redirect } from "next/navigation";

/** Legacy path → Mike Production report */
export default async function EstimationProductionDetailRedirect({
  params,
}: {
  params: Promise<{ bidId: string }>;
}) {
  const { bidId } = await params;
  redirect(`/production/${encodeURIComponent(bidId)}`);
}
