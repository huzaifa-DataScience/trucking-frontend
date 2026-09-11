"use client";

import { useEffect, useState } from "react";
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

function processNotesOf(bid: { process?: { notes?: string | null } | null } | null) {
  return String(bid?.process?.notes ?? "");
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
    applyBidDetail,
  } = useBidSheet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bid) return null;

  const editable = canWrite && bid.status !== "archived";

  const runSave = async () => {
    if (!editable) return;
    // Spec/intake/setup: only process PATCH. Do not also chain estimate saveNow
    // (that could leave a second "Saving…" if math dirty is stale).
    setBusy(true);
    setError(null);
    try {
      await saveProcess();
      // Keep drawer notes on the bid even when Save is pressed from the header.
      const notesEl = document.getElementById(
        "bid-sheet-notes"
      ) as HTMLTextAreaElement | null;
      if (notesEl) {
        const notes = notesEl.value.trim() || null;
        if (notes !== (processNotesOf(bid).trim() || null)) {
          const updated = await biddingApi.patchBid(bid.id, {
            process: { notes },
          });
          applyBidDetail(updated);
        }
      }
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
 * Notes drawer: persistent bid notes + Complete / Return handoff.
 * Save writes `process.notes` so they show after save/reload.
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
    applyBidDetail,
  } = useBidSheet();
  const confirmDialog = useConfirmDialog();
  const [busy, setBusy] = useState<"complete" | "return" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(() => processNotesOf(bid));
  const [handoffNote, setHandoffNote] = useState("");

  useEffect(() => {
    setNotes(processNotesOf(bid));
  }, [bid?.id]);

  useEffect(() => {
    // Don't clobber in-progress edits while a save/handoff is running.
    if (busy !== null) return;
    setNotes(processNotesOf(bid));
  }, [bid?.process?.notes, busy]);

  const savedNotes = processNotesOf(bid);
  const notesDirty = notes !== savedNotes;
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

  const persistNotes = async () => {
    const next = notes.trim() || null;
    const prev = savedNotes.trim() || null;
    if (next === prev) return bid;
    const updated = await biddingApi.patchBid(bid.id, {
      process: { notes: next },
    });
    applyBidDetail(updated);
    return updated;
  };

  const runSave = async () => {
    if (!editable) return;
    setBusy("save");
    setError(null);
    try {
      await flushSaves();
      await persistNotes();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
    } finally {
      setBusy(null);
    }
  };

  const runHandoff = async (action: "complete" | "return") => {
    if (!editable) return;
    if (unsavedChanges || notesDirty) {
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
        await persistNotes();
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
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
          Bid notes
        </span>
        <textarea
          id="bid-sheet-notes"
          disabled={!editable}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="resize-y rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-brand disabled:opacity-60"
          placeholder="Working notes for this bid…"
        />
        {notesDirty ? (
          <span className="text-[10px] font-semibold text-amber-700">
            Unsaved notes
          </span>
        ) : notes.trim() ? (
          <span className="text-[10px] font-medium text-ink/40">Saved</span>
        ) : null}
      </label>

      <p className="text-sm text-ink/55">
        {busy === "save" || saving
          ? "Saving…"
          : unsavedChanges || notesDirty
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
