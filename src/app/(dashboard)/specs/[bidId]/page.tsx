import { redirect } from "next/navigation";

export default async function SpecsBidRedirect({
  params,
}: {
  params: Promise<{ bidId: string }>;
}) {
  const { bidId } = await params;
  redirect(`/estimation-files/specs/${encodeURIComponent(bidId)}`);
}
