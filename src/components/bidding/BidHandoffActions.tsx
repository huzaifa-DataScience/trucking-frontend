"use client";

import { useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { getApiErrorMessage } from "@/lib/api/client";

async function flushBidSaves(opts: {
  processDirty: boolean;
  dirty: boolean;
  saveProcess: () => Promise<void>;
  saveNow: () => Promise<void>;
  /** Force process PATCH even if dirty flag missed (spec sheet / intake). */
  forceProcess?: boolean;
}) {
  if (opts.forceProcess || opts.processDirty) await opts.saveProcess();
  if (opts.dirty) await opts.saveNow();
}

function breadcrumbsOf(
  bid: {
    process?: { breadcrumbs?: { at?: string; text?: string }[] | null } | null;
  } | null
) {
  const raw = bid?.process?.breadcrumbs;
  return Array.isArray(raw) ? raw.filter((b) => b?.text?.trim()) : [];
}

/** Simple Save for estimate sheet header — always visible. */
export function BidSaveButton() {
  const {
    bid,
    canWrite,
    saving,
    unsavedChanges,
    saveProcess,
  } = useBidSheet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bid) return null;

  const editable = canWrite && bid.status !== "archived";

  const runSave = async () => {
    if (!editable) return;
    setBusy(true);
    setError(null);
    try {
      await saveProcess();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={!editable || busy || saving}
        onClick={() => void runSave()}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40"
      >
        {busy || saving ? "Saving…" : "Save"}
      </button>
      {unsavedChanges ? (
        <span className="text-[10px] font-semibold text-amber-700">
          Unsaved changes
        </span>
      ) : null}
      {error ? <p className="max-w-xs text-right text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Notes drawer footer: Complete / Return handoff + process breadcrumbs.
 * Chat lives in BidCommentsPanel — do not PATCH process.notes for conversation.
 */
export function BidHandoffActions() {
  const {
    bid,
    canWrite,
    refresh,
    saving,
    processDirty,
    dirty,
    unsavedChanges,
    saveProcess,
    saveNow,
  } = useBidSheet();
  const confirmDialog = useConfirmDialog();
  const [busy, setBusy] = useState<"complete" | "return" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState("");

  const crumbs = breadcrumbsOf(bid);

  if (!bid) return null;

  const wf = bid.workflow;
  const archived = bid.status === "archived";
  const editable = canWrite && !archived;

  const flushSaves = () =>
    flushBidSaves({
      processDirty,
      dirty,
      saveProcess,
      saveNow,
      forceProcess: true,
    });

  const runSave = async () => {
    if (!editable) return;
    setBusy("save");
    setError(null);
    try {
      await flushSaves();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
    } finally {
      setBusy(null);
    }
  };

  const runHandoff = async (action: "complete" | "return") => {
    if (!editable) return;
    if (unsavedChanges) {
      const saveFirst = await confirmDialog({
        title: "Unsaved changes",
        message:
          "You have unsaved changes. Save first, then continue with handoff?",
        confirmLabel: "Save & continue",
        cancelLabel: "Cancel",
      });
      if (!saveFirst) return;
      try {
        await flushSaves();
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to save before handoff"));
        return;
      }
    }
    setBusy(action);
    setError(null);
    try {
      const note =
        action === "complete" && handoffNote.trim()
          ? handoffNote.trim()
          : undefined;
      await biddingApi.handoffBid(bid.id, {
        action,
        notes: note,
      });
      setHandoffNote("");
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, `Failed to ${action}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink/55">
        {busy === "save" || saving
          ? "Saving…"
          : unsavedChanges
            ? "Unsaved changes"
            : editable
              ? "Save when ready — incomplete OK"
              : "Read only"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!editable || busy !== null}
          onClick={() => void runSave()}
          className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/15 disabled:opacity-40"
        >
          {busy === "save" || saving ? "Saving…" : "Save"}
        </button>
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

      {wf?.completeBlockedReason && !wf.canComplete ? (
        <p className="text-xs text-ink/50">{wf.completeBlockedReason}</p>
      ) : null}

      {editable ? (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink/40">
            Handoff note (optional — with Complete)
          </span>
          <input
            value={handoffNote}
            onChange={(e) => setHandoffNote(e.target.value)}
            className="rounded-xl border border-ink/10 bg-canvas/40 px-3 py-1.5 text-sm outline-none focus:border-brand"
            placeholder="Notes for the next owner…"
          />
        </label>
      ) : null}

      {crumbs.length > 0 ? (
        <div className="border-t border-ink/[0.06] pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
            History
          </p>
          <ul className="space-y-2.5">
            {[...crumbs].reverse().slice(0, 20).map((c, i) => (
              <li
                key={`${c.at ?? ""}-${i}`}
                className="rounded-xl border border-ink/[0.06] bg-canvas/50 px-3 py-2"
              >
                <p className="text-sm leading-relaxed text-ink/80">{c.text}</p>
                {c.at ? (
                  <p className="mt-1 text-[10px] font-medium text-ink/40">
                    {new Date(c.at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
