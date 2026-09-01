import { redirect } from "next/navigation";

/** Legacy path → Mike Production list */
export default function EstimationProductionHubRedirect() {
  redirect("/production");
}
