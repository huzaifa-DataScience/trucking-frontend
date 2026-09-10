import { redirect } from "next/navigation";

/** Legacy path — Estimates list now lives on /bidding. */
export default function BiddingAllRedirectPage() {
  redirect("/bidding");
}
