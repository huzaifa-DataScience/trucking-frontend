import { redirect } from "next/navigation";

export default async function BidDetailIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bidding/${id}/startup`);
}
