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
import { getApiErrorMessage } from "@/lib/api/client";
import { insightsFromBid } from "@/lib/bidding/computed";
import { normalizeSystems } from "@/lib/bidding/constants";
import {
  applyEngineToBid,
  buildClientComputedSnapshot,
  buildLookupsFromBiddingHook,
} from "@/lib/bidding/snapshot";
import type {
  BaseBidInput,
  BidCompanyInfo,
  BidDetail,
  BidInsights,
  BidSystemRow,
  BurdenedRateResult,
  PatchBidBody,
} from "@/lib/bidding/types";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";

const AUTO_SAVE_MS = 1500;
const PREVIEW_DEBOUNCE_MS = 400;

type BidHeaderPatch = Partial<
  Pick<
    BidDetail,
    "estimateNumber" | "bidName" | "bidDate" | "ourEntityId" | "submitDate" | "timeEstimate"
  >
>;

type BidSheetContextValue = {
  bid: BidDetail | null;
  insights: BidInsights;
  lookups: ReturnType<typeof useBiddingLookups>;
  burdenedRate: BurdenedRateResult | null;
  initialLoading: boolean;
  saving: boolean;
  error: string | null;
  isEditable: boolean;
  canRead: boolean;
  canWrite: boolean;
  dirty: boolean;
  lastSavedAt: Date | null;
  serverVerifyWarnings: string[];
  selectedTeam: ReturnType<typeof useBiddingLookups>["teams"][number] | null;
  setBidHeader: (patch: BidHeaderPatch) => void;
  setJobId: (jobId: number | null, options?: { prefillCompany?: boolean }) => Promise<void>;
  setCompanyInfoField: (key: keyof BidCompanyInfo, value: string | null) => void;
  prefillCompanyFromJob: () => Promise<void>;
  setBaseBidField: <K extends keyof BaseBidInput>(key: K, value: BaseBidInput[K]) => void;
  setProjectState: (stateCode: string) => void;
  setSystems: (systems: BidSystemRow[]) => void;
  updateSystemRow: (key: BidSystemRow["key"], patch: Partial<BidSystemRow>) => void;
  selectWageRate: (wageRateId: number) => Promise<void>;
  previewCalculate: () => void;
  verifyServerCalc: () => Promise<void>;
  refresh: () => Promise<void>;
  saveNow: () => Promise<void>;
  saveCoverSheet: () => Promise<void>;
  markSubmitted: () => Promise<void>;
  reopenAsDraft: () => Promise<void>;
  uploadAttachment: (file: File, label?: string) => Promise<void>;
  deleteAttachment: (attachmentId: number) => Promise<void>;
};

const BidSheetContext = createContext<BidSheetContextValue | null>(null);

export function useBidSheet() {
  const ctx = useContext(BidSheetContext);
  if (!ctx) throw new Error("useBidSheet must be used within BidSheetProvider");
  return ctx;
}

function mergeSystemRow(
  row: BidSystemRow,
  patch: Partial<BidSystemRow>
): BidSystemRow {
  const merged = { ...row, ...patch, key: row.key };
  if (merged.used === false) {
    return { key: row.key, used: false };
  }
  if (patch.used === true && !row.used) {
    return {
      key: row.key,
      used: true,
      materials: 0,
      laborHours: 0,
      mikeTotalPrice: 0,
      quantity: 0,
    };
  }
  if (!merged.used) {
    return { key: row.key, used: false };
  }
  return {
    key: row.key,
    used: true,
    mikeEstimateNumber: merged.mikeEstimateNumber,
    materials: merged.materials ?? 0,
    laborHours: merged.laborHours ?? 0,
    mikeTotalPrice: merged.mikeTotalPrice ?? 0,
    quantity: merged.quantity ?? 0,
  };
}

export function BidSheetProvider({
  bidId,
  children,
}: {
  bidId: string;
  children: ReactNode;
}) {
  const lookups = useBiddingLookups();
  const { canRead, canWrite } = useBiddingAccess();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [burdenedRate, setBurdenedRate] = useState<BurdenedRateResult | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [serverVerifyWarnings, setServerVerifyWarnings] = useState<string[]>([]);
  const bidRef = useRef<BidDetail | null>(null);
  const fetchedRef = useRef(false);
  const loadGenRef = useRef(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canWriteRef = useRef(canWrite);
  canWriteRef.current = canWrite;

  bidRef.current = bid;

  const wageRatesRef = useRef(lookups.wageRates);
  wageRatesRef.current = lookups.wageRates;

  const statesRef = useRef(lookups.states);
  statesRef.current = lookups.states;

  const engineLookups = useMemo(
    () => buildLookupsFromBiddingHook(lookups.states),
    [lookups.states]
  );

  const buildContentPatch = useCallback(
    (withCalc: BidDetail): PatchBidBody => ({
      jobId: withCalc.jobId,
      estimateNumber: withCalc.estimateNumber,
      bidName: withCalc.bidName,
      bidDate: withCalc.bidDate,
      submitDate: withCalc.submitDate,
      timeEstimate: withCalc.timeEstimate,
      ourEntityId: withCalc.ourEntityId,
      companyInfo: withCalc.companyInfo,
      baseBid: withCalc.baseBid,
      systems: withCalc.systems,
      computed: buildClientComputedSnapshot(withCalc, engineLookups),
    }),
    [engineLookups]
  );

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setBid((prev) => (prev ? applyEngineToBid(prev, engineLookups) : prev));
    }, PREVIEW_DEBOUNCE_MS);
  }, [engineLookups]);

  const loadBurdenForLabel = useCallback(async (label: string | undefined) => {
    if (!label) {
      setBurdenedRate(null);
      return;
    }
    const rate = wageRatesRef.current.find((w) => w.rateLabel === label);
    if (!rate) {
      setBurdenedRate(null);
      return;
    }
    try {
      const br = await biddingApi.getBiddingWageBurdenedRate(rate.id);
      setBurdenedRate(br);
    } catch {
      setBurdenedRate(null);
    }
  }, []);

  const loadBid = useCallback(
    async (opts?: { silent?: boolean }) => {
      const gen = ++loadGenRef.current;
      if (!opts?.silent) setInitialLoading(true);
      setError(null);
      try {
        const detail = await biddingApi.getBid(bidId);
        if (gen !== loadGenRef.current) return;
        detail.systems = normalizeSystems(detail.systems);
        if (!detail.companyInfo) detail.companyInfo = {};
        if (!detail.attachments) detail.attachments = [];
        const hydrated =
          Object.keys(detail.computed ?? {}).length > 0
            ? detail
            : applyEngineToBid(detail, engineLookups);
        setBid(hydrated);
        setDirty(false);
        await loadBurdenForLabel(detail.baseBid?.wageRateLabel as string | undefined);
      } catch (e) {
        if (gen === loadGenRef.current) {
          setError(getApiErrorMessage(e, "Failed to load bid"));
        }
      } finally {
        if (gen === loadGenRef.current) {
          setInitialLoading(false);
        }
      }
    },
    [bidId, loadBurdenForLabel, engineLookups]
  );

  useEffect(() => {
    if (lookups.loading || fetchedRef.current) return;
    fetchedRef.current = true;
    void loadBid();
  }, [lookups.loading, loadBid]);

  const savePatch = useCallback(
    async (patch: PatchBidBody, fallback?: BidDetail) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await biddingApi.patchBid(bidId, patch);
        updated.systems = normalizeSystems(updated.systems);
        const serverComputed = updated.computed ?? {};
        const computed =
          Object.keys(serverComputed).length > 0
            ? serverComputed
            : (patch.computed ?? fallback?.computed ?? {});
        setBid({ ...updated, computed });
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to save bid"));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [bidId]
  );

  const autoSaveNow = useCallback(async () => {
    const current = bidRef.current;
    if (!current || current.status !== "draft" || !canWriteRef.current) return;
    const withCalc = applyEngineToBid(current, engineLookups);
    setBid(withCalc);
    const errs = withCalc.computed?.errors;
    if (Array.isArray(errs) && errs.length > 0) return;
    try {
      await savePatch(buildContentPatch(withCalc), withCalc);
      setLastSavedAt(new Date());
      setDirty(false);
    } catch {
      /* savePatch sets error */
    }
  }, [engineLookups, buildContentPatch, savePatch]);

  const scheduleAutoSave = useCallback(() => {
    if (!canWriteRef.current) return;
    const current = bidRef.current;
    if (!current || current.status !== "draft") return;
    setDirty(true);
    schedulePreview();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void autoSaveNow();
    }, AUTO_SAVE_MS);
  }, [autoSaveNow, schedulePreview]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const setBidHeader = useCallback(
    (patch: BidHeaderPatch) => {
      setBid((prev) => (prev ? { ...prev, ...patch } : prev));
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const setCompanyInfoField = useCallback(
    (key: keyof BidCompanyInfo, value: string | null) => {
      setBid((prev) => {
        if (!prev) return prev;
        const companyInfo = { ...(prev.companyInfo ?? {}), [key]: value || null };
        return {
          ...prev,
          companyInfo,
          clientCompanyName: key === "companyName" ? value : prev.clientCompanyName,
        };
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const prefillCompanyFromJob = useCallback(async () => {
    const jobId = bidRef.current?.jobId;
    if (!jobId) {
      setError("Link a job to this bid before prefilling company info.");
      return;
    }
    try {
      const suggested = await biddingApi.getCompanyInfoPrefillFromJob(jobId);
      setBid((prev) =>
        prev
          ? {
              ...prev,
              companyInfo: { ...(prev.companyInfo ?? {}), ...suggested },
              clientCompanyName: suggested.companyName ?? prev.clientCompanyName,
            }
          : prev
      );
      scheduleAutoSave();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load company info from job"));
    }
  }, [scheduleAutoSave]);

  const setJobId = useCallback(
    async (jobId: number | null, options?: { prefillCompany?: boolean }) => {
      setBid((prev) => (prev ? { ...prev, jobId } : prev));
      if (bidRef.current?.status === "draft" && canWriteRef.current) {
        try {
          await biddingApi.patchBid(bidId, { jobId });
        } catch (e) {
          setError(getApiErrorMessage(e, "Failed to link job"));
          return;
        }
      }
      if (options?.prefillCompany && jobId) {
        try {
          const suggested = await biddingApi.getCompanyInfoPrefillFromJob(jobId);
          setBid((prev) =>
            prev
              ? {
                  ...prev,
                  jobId,
                  companyInfo: { ...(prev.companyInfo ?? {}), ...suggested },
                  clientCompanyName: suggested.companyName ?? prev.clientCompanyName,
                }
              : prev
          );
        } catch (e) {
          setError(getApiErrorMessage(e, "Failed to prefill company info"));
        }
      }
      scheduleAutoSave();
    },
    [bidId, scheduleAutoSave]
  );

  const setBaseBidField = useCallback(
    <K extends keyof BaseBidInput>(key: K, value: BaseBidInput[K]) => {
      setBid((prev) => {
        if (!prev) return prev;
        return { ...prev, baseBid: { ...prev.baseBid, [key]: value } };
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const setProjectState = useCallback(
    (stateCode: string) => {
      const st = statesRef.current.find((s) => s.stateCode === stateCode);
      setBid((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          baseBid: {
            ...prev.baseBid,
            projectState: stateCode,
            stateSalesTaxRate: st?.salesTaxRate ?? prev.baseBid?.stateSalesTaxRate,
          },
        };
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const setSystems = useCallback(
    (systems: BidSystemRow[]) => {
      const normalized = normalizeSystems(systems);
      setBid((prev) => (prev ? { ...prev, systems: normalized } : prev));
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const updateSystemRow = useCallback(
    (key: BidSystemRow["key"], patch: Partial<BidSystemRow>) => {
      setBid((prev) => {
        if (!prev) return prev;
        const systems = prev.systems.map((row) =>
          row.key === key ? mergeSystemRow(row, patch) : row
        );
        return { ...prev, systems };
      });
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const selectWageRate = useCallback(
    async (wageRateId: number) => {
      const rate = lookups.wageRates.find((w) => w.id === wageRateId);
      if (!rate) return;
      setBaseBidField("wageRateLabel", rate.rateLabel);
      setBaseBidField("wage", rate.wage);
      setBaseBidField("fringe", rate.fringe);
      try {
        const br = await biddingApi.getBiddingWageBurdenedRate(wageRateId);
        setBurdenedRate(br);
        // Do not auto-fill D10 (laborRateCompositePerHour) — burdened rate ≠ crew composite per API §1.
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load burdened rate"));
      }
      scheduleAutoSave();
    },
    [lookups.wageRates, setBaseBidField, scheduleAutoSave]
  );

  const verifyServerCalc = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await biddingApi.calculateBid(bidId, { forceServerCalc: true });
      setServerVerifyWarnings(res.warnings ?? []);
      if (res.errors?.length) {
        setError(res.errors.map((e) => e.message).join("; "));
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Server verify failed"));
      setServerVerifyWarnings([]);
    } finally {
      setSaving(false);
    }
  }, [bidId]);

  const previewCalculate = useCallback(() => {
    setBid((prev) => (prev ? applyEngineToBid(prev, engineLookups) : prev));
  }, [engineLookups]);

  const saveNow = useCallback(async () => {
    const current = bidRef.current;
    if (!current) return;
    if (current.status !== "draft") {
      setError("Only draft bids can be edited. Reopen as draft to change inputs.");
      return;
    }
    const withCalc = applyEngineToBid(current, engineLookups);
    setBid(withCalc);
    const errs = withCalc.computed?.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      setError(
        (errs as { message: string }[]).map((e) => e.message).join("; ")
      );
      return;
    }
    await savePatch(buildContentPatch(withCalc), withCalc);
    setLastSavedAt(new Date());
    setDirty(false);
  }, [savePatch, engineLookups, buildContentPatch]);

  const saveCoverSheet = useCallback(async () => {
    const current = bidRef.current;
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await biddingApi.patchBid(bidId, {
        bidDate: current.bidDate,
        submitDate: current.submitDate,
        timeEstimate: current.timeEstimate,
      });
      updated.systems = normalizeSystems(updated.systems);
      setBid((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save cover sheet"));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [bidId]);

  const markSubmitted = useCallback(async () => {
    const current = bidRef.current;
    if (!current || current.status !== "draft") return;
    try {
      const withCalc = applyEngineToBid(current, engineLookups);
      await savePatch(buildContentPatch(withCalc), withCalc);
      const updated = await biddingApi.patchBid(bidId, { status: "submitted" });
      updated.systems = normalizeSystems(updated.systems);
      setBid(updated);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to update status"));
    }
  }, [bidId, savePatch, engineLookups, buildContentPatch]);

  const reopenAsDraft = useCallback(async () => {
    try {
      await savePatch({ status: "draft" });
    } catch {
      /* savePatch sets error */
    }
  }, [savePatch]);

  const uploadAttachment = useCallback(
    async (file: File, label?: string) => {
      if (bidRef.current?.status !== "draft") {
        setError("Attachments can only be added on draft bids.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await biddingApi.uploadBidAttachment(bidId, file, label);
        await loadBid({ silent: true });
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to upload attachment"));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [bidId, loadBid]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: number) => {
      if (bidRef.current?.status !== "draft") {
        setError("Attachments can only be removed on draft bids.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await biddingApi.deleteBidAttachment(bidId, attachmentId);
        await loadBid({ silent: true });
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to delete attachment"));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [bidId, loadBid]
  );

  const selectedTeam = useMemo(() => {
    const name = bid?.baseBid?.teamName as string | undefined;
    if (!name) return null;
    return lookups.teams.find((t) => t.teamName === name) ?? null;
  }, [bid?.baseBid?.teamName, lookups.teams]);

  const insights = useMemo(
    () =>
      bid
        ? insightsFromBid(bid, { isRecalculating: saving })
        : {
            mikeEstimate: 0,
            pjEstimate: 0,
            costPerHourMike: 0,
            costPerHourPj: 0,
            marginPercent: 0,
            completionPercent: 0,
            isRecalculating: saving,
          },
    [bid, saving]
  );

  const value: BidSheetContextValue = {
    bid,
    insights,
    lookups,
    burdenedRate,
    initialLoading,
    saving,
    error,
    isEditable: bid?.status === "draft" && canWrite,
    canRead,
    canWrite,
    dirty,
    lastSavedAt,
    serverVerifyWarnings,
    selectedTeam,
    setBidHeader,
    setJobId,
    setCompanyInfoField,
    prefillCompanyFromJob,
    setBaseBidField,
    setProjectState,
    setSystems,
    updateSystemRow,
    selectWageRate,
    previewCalculate,
    verifyServerCalc,
    refresh: () => loadBid({ silent: true }),
    saveNow,
    saveCoverSheet,
    markSubmitted,
    reopenAsDraft,
    uploadAttachment,
    deleteAttachment,
  };

  return (
    <BidSheetContext.Provider value={value}>{children}</BidSheetContext.Provider>
  );
}
