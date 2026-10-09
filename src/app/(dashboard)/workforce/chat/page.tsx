import { redirect } from "next/navigation";

/** Legacy path — Messages is a standalone module at `/messages`. */
export default function WorkforceChatRedirect() {
  redirect("/messages");
}
