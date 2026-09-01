"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { BidActivityEntry } from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";

function formatChangedFields(
  fields: BidActivityEntry["changedFields"]
): string | null {
  if (fields == null) return null;
  if (typeof fields === "string") {
    const t = fields.trim();
    return t || null;
  }
  if (Array.isArray(fields)) {
    const parts = fields.map((f) => String(f).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  try {
    const s = JSON.stringify(fields);
    return s && s !== "{}" ? s : null;
  } catch {
    return null;
  }
}

function formatActivityWhat(e: BidActivityEntry): string {
  const summary = String(e.summary || e.message || e.area || "").trim();
  const changed = formatChangedFields(e.changedFields);
  if (summary && changed) return `${summary} (${changed})`;
  if (summary) return summary;
  if (changed) return changed;
  return "change";
}

function formatActivityWho(e: BidActivityEntry): string {
  const who = e.userEmail || e.byEmail || e.actorEmail;
  return who ? String(who) : "—";
}

function formatActivityWhen(e: BidActivityEntry): string {
  return String(e.createdAt || e.at || "");
}

/** Activity log — who / what / when (FRONTEND_INTAKE.md). */
export function BidActivityPanel() {
  const { bid } = useBidSheet();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<
    { when: string; who: string; what: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bid) return;
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
      .finally(() => setLoading(false));
  }, [open, bid]);

  if (!bid) return null;

  const summary = bid.activitySummary;

  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-surface/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-ink/70 hover:text-ink"
      >
        <span>
          Activity
          {summary?.changeCount != null ? (
            <span className="ml-2 text-xs font-normal text-ink/40">
              {summary.changeCount} changes
            </span>
          ) : null}
        </span>
        <span className="text-xs text-ink/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="max-h-48 overflow-auto border-t border-ink/[0.06] px-4 py-2">
          {loading ? (
            <p className="text-xs text-ink/40">Loading…</p>
          ) : lines.length === 0 ? (
            <p className="text-xs text-ink/40">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {lines.slice(0, 40).map((l, i) => (
                <li key={`${l.when}-${i}`} className="text-xs text-ink/60">
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    <span className="font-medium text-ink/80">{l.who}</span>
                    <span className="text-ink/35">·</span>
                    <span>{l.what}</span>
                  </div>
                  {l.when ? (
                    <div className="mt-0.5 text-ink/35">
                      {new Date(l.when).toLocaleString()}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
