import { redirect } from "next/navigation";

/** Old path; canonical route is `/clearstory/change-notifications` (frontend-clearstory-api.md). */
export default function ClearstoryNotificationsLegacyRedirectPage() {
  redirect("/clearstory/change-notifications");
}
