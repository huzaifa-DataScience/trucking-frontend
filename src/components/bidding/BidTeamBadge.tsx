"use client";

import { teamColorForId } from "@/lib/bidding/team-colors";

export function BidTeamBadge({
  teamId,
  teamName,
  compact = false,
}: {
  teamId?: number | null;
  teamName?: string | null;
  compact?: boolean;
}) {
  const colors = teamColorForId(teamId ?? null);
  const label =
    teamName?.trim() ||
    (teamId != null && Number.isFinite(teamId) ? `Team #${teamId}` : "Unassigned");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium ${colors.border} ${colors.bg} ${colors.text} ${
        compact ? "text-[10px]" : "text-[11px]"
      }`}
      title={label}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
