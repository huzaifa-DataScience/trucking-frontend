"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { BidProcess, SpecSheet } from "@/lib/bidding/process-types";
import { mergeProcessTogal } from "@/lib/bidding/process-types";
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
        const serverLayers = sr.insulationLayers ?? [];
        const insulationLayers = (lr.insulationLayers ?? []).map((L, i) => ({
          ...L,
          materialName: L.materialName ?? serverLayers[i]?.materialName ?? null,
          materialCode: L.materialCode ?? serverLayers[i]?.materialCode ?? null,
          thicknessIn: L.thicknessIn ?? serverLayers[i]?.thicknessIn ?? null,
        }));
        return {
          ...lr,
          systemCode: lr.systemCode ?? sr.systemCode,
          areaCode: lr.areaCode ?? sr.areaCode,
          materialCode:
            lr.materialCode ??
            insulationLayers[0]?.materialCode ??
            sr.materialCode,
          materialName:
            lr.materialName ??
            insulationLayers[0]?.materialName ??
            sr.materialName,
          unit: lr.unit ?? sr.unit,
          insulationLayers:
            insulationLayers.length > 0
              ? insulationLayers
              : lr.insulationLayers,
        };
      }),
    };
  });
}

type ProcessDraftContextValue = {
  bid: ReturnType<typeof useBidSheet>["bid"];
  draft: BidProcess;
  setDraft: (next: BidProcess) => void;
  setField: <K extends keyof BidProcess>(key: K, value: BidProcess[K]) => void;
  setSpecSheets: (sheets: SpecSheet[]) => void;
  persist: () => Promise<void>;
  save: () => Promise<void>;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  editable: boolean;
  inputClass: string;
  labelClass: string;
};

const ProcessDraftContext = createContext<ProcessDraftContextValue | null>(null);

/**
 * One process draft for the whole bid sheet.
 * Stages must share this — separate useProcessDraft() instances were discarding
 * captain / intake edits on stage change and registering the wrong Save handler.
 */
export function ProcessDraftProvider({ children }: { children: ReactNode }) {
  const {
    bid,
    canWrite,
    applyBidDetail,
    setProcessDirty,
    registerProcessSave,
    getHeaderOurEntityId,
  } = useBidSheet();
  const { showToast } = useToast();
  const [draft, setDraftState] = useState<BidProcess>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const hydratedId = useRef<string | null>(null);
  const draftRef = useRef<BidProcess>({});
  const savedFp = useRef<string>("");
  const dirtyRef = useRef(false);
  const archived = bid?.status === "archived";
  const editable = Boolean(canWrite && !archived && bid?.canEdit !== false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!bid) return;

    const serverProcess: BidProcess = {
      ...(bid.process ?? {}),
      specSheets: normalizeSpecSheets(bid.process?.specSheets),
    };

    if (hydratedId.current !== bid.id) {
      hydratedId.current = bid.id;
      draftRef.current = serverProcess;
      savedFp.current = processFingerprint(serverProcess);
      setDraftState(serverProcess);
      setDirty(false);
      setProcessDirty(false);
      return;
    }

    // Keep local edits; when clean, pull server process (togal ids, award, etc.).
    if (!dirtyRef.current) {
      const serverFp = processFingerprint(serverProcess);
      if (serverFp !== savedFp.current) {
        draftRef.current = serverProcess;
        savedFp.current = serverFp;
        setDraftState(serverProcess);
      }
    }
  }, [bid, setProcessDirty]);

  const persist = useCallback(async () => {
    if (!bid || !editable) return;
    setSaving(true);
    setError(null);
    try {
      let snapshot: BidProcess;
      try {
        snapshot = JSON.parse(JSON.stringify(draftRef.current)) as BidProcess;
      } catch {
        throw new Error("Process draft could not be serialized for save");
      }
      snapshot = {
        ...snapshot,
        togal: mergeProcessTogal(bid.process?.togal, snapshot.togal),
        // Backend rejects null contractTiers.role
        contractTiers: (snapshot.contractTiers ?? []).map((t) => ({
          ...t,
          role: t.role || "other",
        })),
      };
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.log("[Save] PATCH /bids/%s { process }", bid.id);
      }
      const ourEntityId = getHeaderOurEntityId();
      const updated = await biddingApi.patchBid(bid.id, {
        process: snapshot,
        estimateNumber: bid.estimateNumber ?? undefined,
        bidName: bid.bidName ?? undefined,
        ...(bid.bidDate ? { bidDate: bid.bidDate } : {}),
        submitDate: bid.submitDate,
        timeEstimate: bid.timeEstimate,
        ...(typeof ourEntityId === "number" ? { ourEntityId } : {}),
        baseBid: {
          ...(bid.baseBid ?? {}),
          pla: snapshot.pla ?? (bid.baseBid as { pla?: boolean } | undefined)?.pla,
          preference:
            snapshot.mbePreference ??
            (bid.baseBid as { preference?: string } | undefined)?.preference ??
            undefined,
          ccipCoversWc:
            snapshot.ocipCcip?.coversWc ??
            (bid.baseBid as { ccipCoversWc?: boolean } | undefined)?.ccipCoversWc,
        },
      });
      const serverSheets = normalizeSpecSheets(updated.process?.specSheets ?? []);
      const localSheets = normalizeSpecSheets(snapshot.specSheets ?? []);
      const sheets =
        serverSheets.length > 0
          ? mergeProcessSheetCodes(localSheets, serverSheets)
          : localSheets;
      const mergedProcess: BidProcess = {
        ...(updated.process ?? {}),
        ...snapshot,
        assignment: updated.process?.assignment ?? snapshot.assignment,
        takeoffAssignments:
          updated.process?.takeoffAssignments ?? snapshot.takeoffAssignments,
        togal: mergeProcessTogal(updated.process?.togal, snapshot.togal),
        specSheets: sheets,
        insulationSpecs:
          updated.process?.insulationSpecs ?? snapshot.insulationSpecs ?? null,
      };
      const changedDuringSave =
        processFingerprint(draftRef.current) !== processFingerprint(snapshot);
      if (!changedDuringSave) {
        draftRef.current = mergedProcess;
        savedFp.current = processFingerprint(mergedProcess);
        setDraftState(mergedProcess);
        setDirty(false);
        setProcessDirty(false);
      }
      applyBidDetail({
        ...updated,
        ourEntityId: getHeaderOurEntityId() ?? updated.ourEntityId,
        process: changedDuringSave
          ? { ...(updated.process ?? {}), ...draftRef.current }
          : mergedProcess,
      });
    } catch (e) {
      const message = getApiErrorMessage(e, "Failed to save");
      setError(message);
      if (e instanceof ApiError && e.status === 403) {
        showToast(message, "error");
      }
      throw e;
    } finally {
      setSaving(false);
    }
  }, [bid, editable, applyBidDetail, setProcessDirty, showToast, getHeaderOurEntityId]);

  useEffect(() => {
    registerProcessSave(persist);
    return () => registerProcessSave(null);
  }, [persist, registerProcessSave]);

  useEffect(() => {
    if (!dirty || !editable) return;
    const timer = setTimeout(() => {
      void persist().catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, editable, persist, draft]);

  useEffect(() => {
    const currentFp = processFingerprint(draftRef.current);
    const actualDirty = editable && currentFp !== savedFp.current;
    if (dirty !== actualDirty) setDirty(actualDirty);
    setProcessDirty(actualDirty);
  }, [dirty, draft, editable, setProcessDirty]);

  useEffect(() => {
    return () => setProcessDirty(false);
  }, [setProcessDirty]);

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

  const setField = useCallback(
    <K extends keyof BidProcess>(key: K, value: BidProcess[K]) => {
      schedule({ ...draftRef.current, [key]: value });
    },
    [schedule]
  );

  const setSpecSheets = useCallback(
    (sheets: SpecSheet[]) => {
      schedule({ ...draftRef.current, specSheets: sheets });
    },
    [schedule]
  );

  const value = useMemo<ProcessDraftContextValue>(
    () => ({
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
    }),
    [
      bid,
      draft,
      schedule,
      setField,
      setSpecSheets,
      persist,
      dirty,
      saving,
      error,
      editable,
    ]
  );

  return (
    <ProcessDraftContext.Provider value={value}>{children}</ProcessDraftContext.Provider>
  );
}

export function useProcessDraft(): ProcessDraftContextValue {
  const ctx = useContext(ProcessDraftContext);
  if (!ctx) {
    throw new Error("useProcessDraft must be used within ProcessDraftProvider");
  }
  return ctx;
}
