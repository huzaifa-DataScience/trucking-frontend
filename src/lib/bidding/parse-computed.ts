import type { BidComputed } from "./types";
import type { LaborBuildUp, SystemComputed } from "./engine/types";

export function parseSystemsComputed(computed: BidComputed | undefined): SystemComputed[] {
  const raw = computed?.systemsComputed;
  if (Array.isArray(raw)) return raw as SystemComputed[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as SystemComputed[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseLaborBuildUp(computed: BidComputed | undefined): LaborBuildUp | null {
  const raw = computed?.laborBuildUp;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as LaborBuildUp;
  }
  return null;
}

export function parseWarnings(computed: BidComputed | undefined): string[] {
  const w = computed?.warnings;
  if (Array.isArray(w)) return w.map(String);
  return [];
}

export type ExcelGridCells = Record<string, string | number | null>;

export function parseExcelGrid(computed: BidComputed | undefined): ExcelGridCells {
  const raw = computed?.excelGrid;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ExcelGridCells;
  }
  return {};
}
