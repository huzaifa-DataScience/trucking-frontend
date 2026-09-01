import { redirect } from "next/navigation";

/** Alias → bid Production tab — BIDDING_FRONTEND_API §0 */
export default async function BiddingProductionAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bidding/${encodeURIComponent(id)}?stage=production`);
}
