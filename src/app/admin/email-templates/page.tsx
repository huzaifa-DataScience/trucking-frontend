import { redirect } from "next/navigation";

/** Email template editing lives under Settings; keep route for bookmarks and old links. */
export default function AdminEmailTemplatesRedirectPage() {
  redirect("/admin/settings");
}
