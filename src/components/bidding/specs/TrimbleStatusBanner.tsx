"use client";

import Link from "next/link";
import type { JobLinkInfo } from "@/lib/bidding/specs-types";

export type TrimbleLinkStatus = "no_job" | "no_trimble" | "linked";

export function getTrimbleLinkStatus(
  jobId: number | null | undefined,
  trimbleProjectId: number | null | undefined
): TrimbleLinkStatus {
  if (trimbleProjectId != null) return "linked";
  if (jobId == null) return "no_job";
  return "no_trimble";
}

/**
 * Specs §6 — status only. No Trimble picker.
 * Recv needs jobId → auto Trimble. Job can be set via Mike hints or Job select.
 */
export function TrimbleStatusBanner({
  jobId,
  trimbleProjectId,
  jobLink,
  bidEditHref,
}: {
  jobId: number | null | undefined;
  trimbleProjectId: number | null | undefined;
  jobLink?: JobLinkInfo | null;
  /** Optional link to full bid cover sheet */
  bidEditHref?: string | null;
}) {
  const status = getTrimbleLinkStatus(jobId, trimbleProjectId);

  if (status === "linked") {
    return (
      <p className="rounded-xl border border-ink/[0.08] bg-surface px-3 py-2 text-xs text-ink/70">
        <span className="font-semibold uppercase tracking-wide text-ink/40">
          Job / Trimble{" "}
        </span>
        <span className="font-medium text-ink">
          Linked · project {trimbleProjectId}
        </span>
        <span className="text-ink/45"> · Qty Received from materials</span>
        {jobLink?.status === "auto_linked" && jobLink.message ? (
          <span className="text-ink/45"> · {jobLink.message}</span>
        ) : null}
      </p>
    );
  }

  if (status === "no_trimble") {
    return (
      <p className="rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-xs text-warning">
        <span className="font-semibold uppercase tracking-wide">Job / Trimble · </span>
        Job is set but no Trimble materials project matched. Qty Received stays 0.
        {jobLink?.message ? ` ${jobLink.message}` : ""}
        {bidEditHref ? (
          <>
            {" "}
            <Link href={bidEditHref} className="font-semibold underline underline-offset-2">
              Open bid
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <p className="rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-xs text-warning">
      <span className="font-semibold uppercase tracking-wide">Job / Trimble · </span>
      {jobLink?.message
        ? jobLink.message
        : "No job — Qty Received stays 0. Pick a Job below (you can change it anytime)."}
      {bidEditHref ? (
        <>
          {" · "}
          <Link href={bidEditHref} className="font-semibold underline underline-offset-2">
            Open bid
          </Link>
        </>
      ) : null}
    </p>
  );
}
