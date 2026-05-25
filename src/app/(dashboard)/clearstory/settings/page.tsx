import { redirect } from "next/navigation";

/** Alias for Ops / sync per frontend-clearstory-api.md (UX routing). */
export default function ClearstorySettingsRedirectPage() {
  redirect("/clearstory/ops");
}
