import { redirect } from "next/navigation";

/** Settings home → My Profile (Clearstory default) */
export default function SettingsIndexPage() {
  redirect("/settings/profile");
}
