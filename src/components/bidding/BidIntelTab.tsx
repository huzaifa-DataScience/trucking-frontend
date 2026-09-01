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

const SAVE_MS = 800;

/** Intel tab shell — GCs / mechanicals / competitors */
export function BidIntelTab() {
  const { bid, canWrite, refresh } = useBidSheet();
  const [notes, setNotes] = useState("");
  const [gcs, setGcs] = useState("");
  const [mechs, setMechs] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editable = canWrite && bid?.status !== "archived";

  useEffect(() => {
    if (!bid?.process) return;
    const intel = bid.process.intelligence as ProcessIntelligence | undefined;
    setNotes(intel?.notes ?? "");
    setGcs(
      (bid.process.generalContractors ?? [])
        .map((g) => g.company || g.name || "")
        .filter(Boolean)
        .join("\n")
    );
    setMechs(
      (bid.process.mechanicals ?? [])
        .map((g) => g.company || g.name || "")
        .filter(Boolean)
        .join("\n")
    );
  }, [bid]);

  const persist = useCallback(
    async (nextNotes: string, nextGcs: string, nextMechs: string) => {
      if (!bid || !editable) return;
      setSaving(true);
      setError(null);
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
        await refresh();
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to save Intel"));
      } finally {
        setSaving(false);
      }
    },
    [bid, editable, refresh]
  );

  const schedule = (n: string, g: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(n, g, m), SAVE_MS);
  };

  if (!bid) return null;

  const area =
    "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand min-h-[6rem]";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Post-Bid</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Follow-up, GCs / mechanicals, competitors. Still Pre — pick win/lose on
          the Outcome tab next.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Autosave on" : "Read only"}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}
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
            schedule(notes, e.target.value, mechs);
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
            schedule(notes, gcs, e.target.value);
          }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink/60">Notes / competitors</span>
        <textarea
          className={area}
          disabled={!editable}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            schedule(e.target.value, gcs, mechs);
          }}
        />
      </label>
    </div>
  );
}
