import { redirect } from "next/navigation";

/** Alias → bid Specs tab — BIDDING_FRONTEND_API §0 */
export default async function BiddingSpecsAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bidding/${encodeURIComponent(id)}?stage=takeoff`);
}
