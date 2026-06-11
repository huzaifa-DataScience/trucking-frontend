import type { BidSystemKey } from "./types";

export const BID_SYSTEM_KEYS: BidSystemKey[] = [
  "duct1",
  "duct2",
  "hydronic1",
  "hydronic2",
  "plumbing1",
  "plumbing2",
  "vrf",
  "equipment",
];

export const BID_SYSTEM_LABELS: Record<BidSystemKey, string> = {
  duct1: "Duct 1",
  duct2: "Duct 2",
  hydronic1: "Hydronic 1",
  hydronic2: "Hydronic 2",
  plumbing1: "Plumbing 1",
  plumbing2: "Plumbing 2",
  vrf: "VRF",
  equipment: "Equipment",
};

export function defaultSystemRows(): import("./types").BidSystemRow[] {
  return BID_SYSTEM_KEYS.map((key) => ({
    key,
    used: false,
  }));
}

export function normalizeSystems(
  systems: import("./types").BidSystemRow[] | undefined
): import("./types").BidSystemRow[] {
  const map = new Map(systems?.map((s) => [s.key, s]) ?? []);
  return BID_SYSTEM_KEYS.map((key) => {
    const merged = {
      ...defaultSystemRows().find((r) => r.key === key)!,
      ...map.get(key),
      key,
    };
    if (!merged.used) {
      return { key, used: false };
    }
    return {
      key,
      used: true,
      mikeEstimateNumber: merged.mikeEstimateNumber,
      materials: merged.materials ?? 0,
      laborHours: merged.laborHours ?? 0,
      mikeTotalPrice: merged.mikeTotalPrice ?? 0,
      quantity: merged.quantity ?? 0,
    };
  });
}
