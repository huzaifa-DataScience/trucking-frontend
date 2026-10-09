/** Estimates list column prefs — FRONTEND_EST.md (local until BE stores per-user). */

export type BidListColumnKey =
  | "estimate"
  | "name"
  | "bidDate"
  | "office"
  | "client"
  | "captain"
  | "estimator"
  | "assistantEstimator"
  | "baseBid"
  | "internalBidDate"
  | "updated"
  | "stage"
  | "outcome"
  | "status"
  | "takeoffTurnedIn"
  | "workType"
  | "drawingNumber"
  | "dueDate"
  | "contractAmount"
  | "jobStartDate";

export type BidListColumnDef = {
  key: BidListColumnKey;
  label: string;
  width: string;
  /** Always visible — cannot hide. */
  locked?: boolean;
};

/** Full catalog the picker offers. */
export const BID_LIST_COLUMN_CATALOG: BidListColumnDef[] = [
  { key: "estimate", label: "Project #", width: "min-w-[7.5rem]", locked: true },
  { key: "name", label: "Name", width: "min-w-[14rem]", locked: true },
  { key: "bidDate", label: "Bid date & time", width: "min-w-[8.5rem]" },
  { key: "office", label: "Company", width: "min-w-[8rem]" },
  { key: "client", label: "Contractor", width: "min-w-[9rem]" },
  { key: "captain", label: "Team captain", width: "min-w-[9rem]" },
  { key: "estimator", label: "Estimator", width: "min-w-[8rem]" },
  { key: "assistantEstimator", label: "Asst. estimator", width: "min-w-[8.5rem]" },
  { key: "baseBid", label: "Base bid", width: "min-w-[6.5rem]" },
  { key: "internalBidDate", label: "Internal bid date", width: "min-w-[8.5rem]" },
  { key: "updated", label: "Updated", width: "min-w-[6.5rem]" },
  { key: "stage", label: "Current progress", width: "min-w-[9.5rem]" },
  { key: "outcome", label: "Outcome", width: "min-w-[5.5rem]" },
  { key: "status", label: "Record", width: "min-w-[5.5rem]" },
  { key: "takeoffTurnedIn", label: "Turned in", width: "min-w-[5.5rem]" },
  { key: "workType", label: "Work type", width: "min-w-[6.5rem]" },
  { key: "drawingNumber", label: "Drawing #", width: "min-w-[7rem]" },
  { key: "dueDate", label: "Due date", width: "min-w-[7rem]" },
  { key: "contractAmount", label: "Contract amount", width: "min-w-[7.5rem]" },
  { key: "jobStartDate", label: "Job start", width: "min-w-[7rem]" },
];

export const DEFAULT_FULL_LIST_COLUMNS: BidListColumnKey[] = [
  "estimate",
  "name",
  "bidDate",
  "office",
  "captain",
  "baseBid",
  "internalBidDate",
  "updated",
];

export const DEFAULT_INTERNAL_LIST_COLUMNS: BidListColumnKey[] = [
  "estimate",
  "name",
  "internalBidDate",
];

export const BIDDING_LIST_COLUMNS_KEY = "bidding-list-columns-v1";
export const BIDDING_LIST_COLUMNS_INTERNAL_KEY = "bidding-list-columns-internal-v1";

const ALLOWED = new Set(BID_LIST_COLUMN_CATALOG.map((c) => c.key));
const LOCKED = BID_LIST_COLUMN_CATALOG.filter((c) => c.locked).map((c) => c.key);

export function loadListColumns(
  storageKey: string,
  fallback: BidListColumnKey[]
): BidListColumnKey[] {
  if (typeof window === "undefined") return [...fallback];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...fallback];
    const keys = parsed.filter(
      (k): k is BidListColumnKey => typeof k === "string" && ALLOWED.has(k as BidListColumnKey)
    );
    for (const locked of LOCKED) {
      if (!keys.includes(locked)) keys.unshift(locked);
    }
    return keys.length > 0 ? keys : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function saveListColumns(storageKey: string, keys: BidListColumnKey[]): void {
  try {
    const next = [...keys];
    for (const locked of LOCKED) {
      if (!next.includes(locked)) next.unshift(locked);
    }
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function columnsFromKeys(keys: BidListColumnKey[]): BidListColumnDef[] {
  const byKey = new Map(BID_LIST_COLUMN_CATALOG.map((c) => [c.key, c]));
  return keys.map((k) => byKey.get(k)).filter((c): c is BidListColumnDef => c != null);
}
