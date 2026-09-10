"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { BidActivityEntry } from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { SkeletonListRows } from "@/components/ui/Skeleton";

/**
 * Backend summaries can carry a raw field-by-field dump, e.g.
 * "Process updated (stage, outcome, workType, …)" plus a `changedFields`
 * array of dotted paths duplicating the same list. Neither is readable as
 * prose, so collapse both down to a short lead phrase + a field count.
 */
function formatActivityWhat(e: BidActivityEntry): { lead: string; fieldCount: number | null } {
  const rawSummary = String(e.summary || e.message || e.area || "").trim();
  const match = rawSummary.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const lead = (match ? match[1] : rawSummary).trim() || "Update";

  let fieldCount: number | null = null;
  if (Array.isArray(e.changedFields)) {
    fieldCount = e.changedFields.filter(Boolean).length || null;
  } else if (match) {
    const count = match[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length;
    fieldCount = count || null;
  }

  return { lead, fieldCount };
}

function formatActivityWho(e: BidActivityEntry): string {
  const who = e.userEmail || e.byEmail || e.actorEmail;
  return who ? String(who) : "Unknown";
}

function formatActivityWhen(e: BidActivityEntry): string {
  return String(e.createdAt || e.at || "");
}

function initialsFor(who: string): string {
  const name = who.includes("@") ? who.split("@")[0] : who;
  const parts = name.split(/[._\s-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

/** Activity log content — rendered inside the bid sheet's "Activity" sidebar drawer. */
export function BidActivityPanel({ open }: { open: boolean }) {
  const { bid } = useBidSheet();
  const [lines, setLines] = useState<
    { when: string; who: string; what: { lead: string; fieldCount: number | null } }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!open || !bid || loadedOnce) return;
    setLoading(true);
    void biddingApi
      .getBidActivity(bid.id)
      .then((raw) => {
        const list = Array.isArray(raw)
          ? raw
          : (raw.entries ?? raw.items ?? []);
        setLines(
          list.map((e) => ({
            when: formatActivityWhen(e),
            who: formatActivityWho(e),
            what: formatActivityWhat(e),
          }))
        );
      })
      .catch(() => setLines([]))
      .finally(() => {
        setLoading(false);
        setLoadedOnce(true);
      });
  }, [open, bid, loadedOnce]);

  if (!bid) return null;

  return (
    <div>
      {loading ? (
        <SkeletonListRows rows={6} />
      ) : lines.length === 0 ? (
        <p className="text-sm text-ink/50">No activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {lines.slice(0, 40).map((l, i) => (
            <li key={`${l.when}-${i}`} className="flex gap-3">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand"
              >
                {initialsFor(l.who)}
              </span>
              <div className="min-w-0 flex-1 border-b border-ink/[0.06] pb-4">
                <p className="text-sm font-semibold text-ink">{l.who}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink/80">
                  {l.what.lead}
                  {l.what.fieldCount ? (
                    <span className="text-ink/40">
                      {" "}
                      · {l.what.fieldCount} field{l.what.fieldCount === 1 ? "" : "s"} changed
                    </span>
                  ) : null}
                </p>
                {l.when ? (
                  <p className="mt-1 text-xs font-medium text-ink/40">
                    {new Date(l.when).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
