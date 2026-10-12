import { redirect } from "next/navigation";

/** Old Ops page; sync status, manual sync and stored overviews now live on Clearstory Settings. */
export default function ClearstoryOpsRedirectPage() {
  redirect("/clearstory/settings");
}
