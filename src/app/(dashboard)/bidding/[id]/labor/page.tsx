import { redirect } from "next/navigation";

export default async function BidLaborRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bidding/${id}`);
}
