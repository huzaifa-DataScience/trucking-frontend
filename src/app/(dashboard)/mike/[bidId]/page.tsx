import { redirect } from "next/navigation";

/** Legacy /mike/[bidId] → Estimation Specs */
export default async function MikeBidIdRedirect({
  params,
}: {
  params: Promise<{ bidId: string }>;
}) {
  const { bidId } = await params;
  redirect(`/estimation-files/specs/${encodeURIComponent(bidId)}`);
}
