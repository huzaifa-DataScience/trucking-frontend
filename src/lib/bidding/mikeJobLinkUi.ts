import type { ToastType } from "@/components/ui/Toast";
import type { MikeUploadBuildResult } from "@/lib/bidding/specs-types";
import { jobLinkNeedsManualSelect } from "@/lib/bidding/uploadMikeSpecs";

export function toastForMikeUpload(
  result: MikeUploadBuildResult,
  showToast: (message: string, type: ToastType) => void
): void {
  showToast(
    `Mike ${result.imported} rows → ${result.created} Spec lines (all files merged)`,
    "success"
  );
  const link = result.jobLink;
  if (!link) return;
  if (link.status === "auto_linked") {
    showToast(link.message || "Job auto-linked — Qty Received can load", "success");
  } else if (link.status === "already_set") {
    if (link.message) showToast(link.message, "info");
  } else if (jobLinkNeedsManualSelect(link.status)) {
    showToast(
      link.message || "Could not auto-link job — select a Job for Qty Received",
      "error"
    );
  }
}
