"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  BidProcess,
  ProcessGcOrMech,
  ProcessIntelligence,
} from "@/lib/bidding/process-types";

/** Intel tab shell — GCs / mechanicals / competitors — manual Save */
export function BidIntelTab() {
  const {
    bid,
    canWrite,
    refresh,
    setProcessDirty,
    registerProcessSave,
  } = useBidSheet();
  const [notes, setNotes] = useState("");
  const [gcs, setGcs] = useState("");
  const [mechs, setMechs] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef({ notes: "", gcs: "", mechs: "" });
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid?.process) return;
    const intel = bid.process.intelligence as ProcessIntelligence | undefined;
    const nextNotes = intel?.notes ?? "";
    const nextGcs = (bid.process.generalContractors ?? [])
      .map((g) => g.company || g.name || "")
      .filter(Boolean)
      .join("\n");
    const nextMechs = (bid.process.mechanicals ?? [])
      .map((g) => g.company || g.name || "")
      .filter(Boolean)
      .join("\n");
    setNotes(nextNotes);
    setGcs(nextGcs);
    setMechs(nextMechs);
    stateRef.current = { notes: nextNotes, gcs: nextGcs, mechs: nextMechs };
    setDirty(false);
    setProcessDirty(false);
  }, [bid, setProcessDirty]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    const { notes: nextNotes, gcs: nextGcs, mechs: nextMechs } =
      stateRef.current;
    const toList = (text: string): ProcessGcOrMech[] =>
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => ({ company: line, name: line }));
    const process: Partial<BidProcess> = {
      generalContractors: toList(nextGcs),
      mechanicals: toList(nextMechs),
      intelligence: {
        ...(bid.process?.intelligence ?? {}),
        notes: nextNotes || null,
      },
    };
    try {
      await biddingApi.patchBid(bid.id, { process });
      setDirty(false);
      setProcessDirty(false);
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save Intel"));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [bid, editable, refresh, setProcessDirty]);

  useEffect(() => {
    registerProcessSave(persist);
    return () => registerProcessSave(null);
  }, [persist, registerProcessSave]);

  useEffect(() => {
    setProcessDirty(dirty);
    return () => setProcessDirty(false);
  }, [dirty, setProcessDirty]);

  const markDirty = (n: string, g: string, m: string) => {
    stateRef.current = { notes: n, gcs: g, mechs: m };
    if (!editable) return;
    setDirty(true);
    setProcessDirty(true);
  };

  if (!bid) return null;

  const area =
    "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand min-h-[6rem]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Post-Bid</h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Follow-up, GCs / mechanicals, competitors. Still Pre — pick win/lose
            on the Outcome tab next.
          </p>
          <p className="mt-1 text-xs text-ink/40">
            {saving
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : editable
                  ? "Save to keep changes"
                  : "Read only"}
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void persist()}
            className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink/60">
          General contractors
        </span>
        <textarea
          className={area}
          disabled={!editable}
          value={gcs}
          onChange={(e) => {
            setGcs(e.target.value);
            markDirty(notes, e.target.value, mechs);
          }}
          placeholder="Clark Construction&#10;…"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink/60">Mechanicals</span>
        <textarea
          className={area}
          disabled={!editable}
          value={mechs}
          onChange={(e) => {
            setMechs(e.target.value);
            markDirty(notes, gcs, e.target.value);
          }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink/60">
          Notes / competitors
        </span>
        <textarea
          className={area}
          disabled={!editable}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty(e.target.value, gcs, mechs);
          }}
        />
      </label>
    </div>
  );
}
