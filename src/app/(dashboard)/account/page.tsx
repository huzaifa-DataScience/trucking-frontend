import { redirect } from "next/navigation";

/** Account was merged into My Profile — keep old links working. */
export default function AccountPage() {
  redirect("/settings/profile");
}
