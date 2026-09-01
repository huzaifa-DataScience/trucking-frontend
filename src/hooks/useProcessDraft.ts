"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidProcess, SpecSheet } from "@/lib/bidding/process-types";
import {
  normalizeSpecSheets,
  specSheetsFingerprint,
} from "@/lib/bidding/specSheetMap";

const SAVE_MS = 500;

function processFingerprint(p: BidProcess): string {
  return JSON.stringify({
    ...p,
    specSheets: specSheetsFingerprint((p.specSheets ?? []) as SpecSheet[]),
  });
}

/** Keep local row values; copy missing codes/unit from server echo. */
function mergeProcessSheetCodes(
  local: SpecSheet[],
  server: SpecSheet[]
): SpecSheet[] {
  const byId = new Map(server.map((s) => [s.id, s]));
  return local.map((ls) => {
    const ss = byId.get(ls.id);
    if (!ss) return ls;
    const rowById = new Map(ss.rows.map((r) => [r.id, r]));
    return {
      ...ls,
      rows: ls.rows.map((lr) => {
        const sr = rowById.get(lr.id);
        if (!sr) return lr;
        return {
          ...lr,
          systemCode: lr.systemCode ?? sr.systemCode,
          areaCode: lr.areaCode ?? sr.areaCode,
          materialCode: lr.materialCode ?? sr.materialCode,
          unit: lr.unit ?? sr.unit,
        };
      }),
    };
  });
}

/**
 * Debounced PATCH { process }.
 * Concurrent edits must not wipe newer local fields when an older save returns.
 */
export function useProcessDraft() {
  const { bid, canWrite, applyBidDetail } = useBidSheet();
  const [draft, setDraft] = useState<BidProcess>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedId = useRef<string | null>(null);
  const draftRef = useRef<BidProcess>({});
  const persistInFlight = useRef(false);
  const needsResave = useRef(false);
  const saveGen = useRef(0);
  const archived = bid?.status === "archived";
  const editable = Boolean(canWrite && !archived);

  useEffect(() => {
    if (!bid) return;
    if (hydratedId.current === bid.id) return;
    hydratedId.current = bid.id;
    const next: BidProcess = {
      ...(bid.process ?? {}),
      specSheets: normalizeSpecSheets(bid.process?.specSheets),
    };
    draftRef.current = next;
    saveGen.current = 0;
    needsResave.current = false;
    setDraft(next);
  }, [bid]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    if (persistInFlight.current) {
      needsResave.current = true;
      return;
    }

    persistInFlight.current = true;
    setSaving(true);
    setError(null);

    try {
      // Always send the latest draft at fire time (not a stale closure).
      const snapshot = draftRef.current;
      const genAtStart = saveGen.current;
      const updated = await biddingApi.patchBid(bid.id, {
        process: snapshot,
      });

      const localMoved =
        saveGen.current !== genAtStart ||
        processFingerprint(draftRef.current) !== processFingerprint(snapshot);

      if (localMoved) {
        // Keep newer local edits — never clobber size/facing/etc. with stale save.
        applyBidDetail({
          ...updated,
          process: draftRef.current,
        });
        needsResave.current = true;
      } else {
        // Keep what we sent; only adopt missing codes from server (never replace values).
        const serverSheets = normalizeSpecSheets(
          updated.process?.specSheets ?? []
        );
        const localSheets = normalizeSpecSheets(snapshot.specSheets ?? []);
        const sheets =
          serverSheets.length > 0
            ? mergeProcessSheetCodes(localSheets, serverSheets)
            : localSheets;
        const mergedProcess: BidProcess = {
          ...(updated.process ?? {}),
          ...snapshot,
          specSheets: sheets,
          insulationSpecs:
            updated.process?.insulationSpecs ??
            snapshot.insulationSpecs ??
            null,
        };
        draftRef.current = mergedProcess;
        setDraft(mergedProcess);
        applyBidDetail({
          ...updated,
          process: mergedProcess,
        });
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
    } finally {
      persistInFlight.current = false;
      setSaving(false);
      if (needsResave.current) {
        needsResave.current = false;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist(), SAVE_MS);
      }
    }
  }, [bid, editable, applyBidDetail]);

  const schedule = useCallback(
    (next: BidProcess, opts?: { immediate?: boolean }) => {
      draftRef.current = next;
      saveGen.current += 1;
      setDraft(next);
      if (!editable) return;
      if (timer.current) clearTimeout(timer.current);
      if (opts?.immediate) {
        void persist();
        return;
      }
      timer.current = setTimeout(() => void persist(), SAVE_MS);
    },
    [editable, persist]
  );

  const setField = <K extends keyof BidProcess>(
    key: K,
    value: BidProcess[K]
  ) => {
    schedule({ ...draftRef.current, [key]: value });
  };

  const setSpecSheets = useCallback(
    (sheets: SpecSheet[]) => {
      schedule({ ...draftRef.current, specSheets: sheets });
    },
    [schedule]
  );

  return {
    bid,
    draft,
    setDraft: schedule,
    setField,
    setSpecSheets,
    persist,
    saving,
    error,
    editable,
    inputClass:
      "w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60",
    labelClass: "text-xs font-semibold text-ink/60",
  };
}
