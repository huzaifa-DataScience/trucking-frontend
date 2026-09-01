import { redirect } from "next/navigation";

/** Legacy /mike → global estimation-files library */
export default function MikeRedirectPage() {
  redirect("/estimation-files");
}
