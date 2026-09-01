"use client";

import { useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * Save draft = autosave PATCH process.
 * Complete / Return only — win/lose lives on Outcome tab (§0).
 */
export function BidHandoffActions() {
  const { bid, canWrite, refresh, saving } = useBidSheet();
  const [busy, setBusy] = useState<"complete" | "return" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  if (!bid) return null;

  const wf = bid.workflow;
  const archived = bid.status === "archived";
  const editable = canWrite && !archived;

  const runHandoff = async (action: "complete" | "return") => {
    if (!editable) return;
    setBusy(action);
    setError(null);
    try {
      await biddingApi.handoffBid(bid.id, {
        action,
        notes: action === "complete" && notes.trim() ? notes.trim() : undefined,
      });
      setNotes("");
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, `Failed to ${action}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-ink/[0.08] bg-surface/90 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink/45">
          {saving ? "Saving draft…" : "Incomplete OK — draft autosaves"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={
              !editable ||
              busy !== null ||
              (wf != null && wf.canReturn === false)
            }
            onClick={() => void runHandoff("return")}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.03] disabled:opacity-40"
          >
            {busy === "return" ? "Returning…" : "Return"}
          </button>
          <button
            type="button"
            disabled={
              !editable ||
              busy !== null ||
              (wf != null && wf.canComplete === false)
            }
            title={wf?.completeBlockedReason || undefined}
            onClick={() => void runHandoff("complete")}
            className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
          >
            {busy === "complete" ? "Handing off…" : "Complete & Hand Off"}
          </button>
        </div>
      </div>

      {wf?.completeBlockedReason && !wf.canComplete ? (
        <p className="text-xs text-ink/50">{wf.completeBlockedReason}</p>
      ) : null}

      {editable ? (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink/40">
            Handoff notes (optional)
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-sm outline-none focus:border-brand"
            placeholder="Notes for the next owner…"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
