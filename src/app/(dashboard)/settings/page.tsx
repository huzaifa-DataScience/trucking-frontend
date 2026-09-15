import { redirect } from "next/navigation";

/** Settings home → My team */
export default function SettingsIndexPage() {
  redirect("/settings/my-team");
}
