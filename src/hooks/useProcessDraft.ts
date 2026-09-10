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
 * Local process draft — manual Save only (no autosave).
 * Registers dirty + save with BidSheetContext for tab/navigation warnings.
 */
export function useProcessDraft() {
  const {
    bid,
    canWrite,
    applyBidDetail,
    setProcessDirty,
    registerProcessSave,
  } = useBidSheet();
  const [draft, setDraftState] = useState<BidProcess>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const hydratedId = useRef<string | null>(null);
  const draftRef = useRef<BidProcess>({});
  const savedFp = useRef<string>("");
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
    savedFp.current = processFingerprint(next);
    setDraftState(next);
    setDirty(false);
    setProcessDirty(false);
  }, [bid, setProcessDirty]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    try {
      const snapshot = draftRef.current;
      const updated = await biddingApi.patchBid(bid.id, {
        process: snapshot,
      });
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
          updated.process?.insulationSpecs ?? snapshot.insulationSpecs ?? null,
      };
      draftRef.current = mergedProcess;
      savedFp.current = processFingerprint(mergedProcess);
      setDraftState(mergedProcess);
      setDirty(false);
      setProcessDirty(false);
      applyBidDetail({
        ...updated,
        process: mergedProcess,
      });
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save"));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [bid, editable, applyBidDetail, setProcessDirty]);

  useEffect(() => {
    registerProcessSave(persist);
    return () => registerProcessSave(null);
  }, [persist, registerProcessSave]);

  useEffect(() => {
    setProcessDirty(dirty);
    return () => setProcessDirty(false);
  }, [dirty, setProcessDirty]);

  const schedule = useCallback(
    (next: BidProcess) => {
      draftRef.current = next;
      setDraftState(next);
      if (!editable) return;
      const nextDirty = processFingerprint(next) !== savedFp.current;
      setDirty(nextDirty);
      setProcessDirty(nextDirty);
    },
    [editable, setProcessDirty]
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
    save: persist,
    dirty,
    saving,
    error,
    editable,
    inputClass:
      "h-11 w-full rounded-lg border border-[#D0D5DD] bg-surface px-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60 dark:border-ink/15",
    labelClass: "text-[13px] font-semibold text-ink/70",
  };
}
