import { redirect } from "next/navigation";

/** Alias → standalone Production detail (not bid estimate chrome). */
export default async function BiddingProductionAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/production/${encodeURIComponent(id)}`);
}
