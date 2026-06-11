import { redirect } from "next/navigation";

export default async function BidBaseBidRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bidding/${id}`);
}
