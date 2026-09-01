import { redirect } from "next/navigation";

/** Prefer bid Production tab — BIDDING_FRONTEND_API §0 */
export default async function ProductionDetailRedirect({
  params,
}: {
  params: Promise<{ bidId: string }>;
}) {
  const { bidId } = await params;
  redirect(`/bidding/${encodeURIComponent(bidId)}?stage=production`);
}
