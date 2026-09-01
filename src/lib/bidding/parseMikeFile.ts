/** Client Mike CSV/XLSX → rows + metadata — FRONTEND_BIDDING_SPECS.md §7 */

import * as XLSX from "xlsx";
import type { MikeParseResult, MikeRowInput } from "@/lib/bidding/specs-types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function headerKey(h: string): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cellStr(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Real Mike exports: row 1 = metadata ("Estimate,21190,…"), row 2 = headers.
 * Detect header as first row that contains Size + Thickness + Quantity.
 */
function findHeaderRowIndex(matrix: unknown[][]): number {
  const need = ["size", "thickness", "quantity"];
  const maxScan = Math.min(matrix.length, 30);
  for (let r = 0; r < maxScan; r++) {
    const keys = (matrix[r] ?? []).map((h) => headerKey(String(h ?? "")));
    if (need.every((n) => keys.includes(n))) return r;
  }
  return -1;
}

/**
 * Row 1 style: Estimate,21190,IMD4724 - University of Maryland…
 * → jobNumberHint + projectLabel for POST mike-rows auto job link.
 */
export function parseMikeMetaFromMatrix(matrix: unknown[][]): {
  jobNumberHint?: string;
  projectLabel?: string;
} {
  const headerRow = findHeaderRowIndex(matrix);
  const metaEnd = headerRow >= 0 ? headerRow : Math.min(matrix.length, 3);

  for (let r = 0; r < metaEnd; r++) {
    const cells = (matrix[r] ?? []).map(cellStr).filter(Boolean);
    if (cells.length === 0) continue;

    const firstKey = headerKey(cells[0] ?? "");
    // Estimate,<jobNumber>,<title…>
    if (firstKey === "estimate" && cells.length >= 2) {
      const jobNumberHint = cells[1] || undefined;
      const projectLabel = cells.slice(2).join(", ").trim() || undefined;
      if (jobNumberHint || projectLabel) {
        return { jobNumberHint, projectLabel };
      }
    }

    // Fallback: first numeric-looking cell as job #, rest as label
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      if (/^\d{3,}$/.test(c)) {
        const jobNumberHint = c;
        const others = [...cells.slice(0, i), ...cells.slice(i + 1)].filter(
          (x) => headerKey(x) !== "estimate"
        );
        const projectLabel = others.join(", ").trim() || undefined;
        return { jobNumberHint, projectLabel };
      }
    }
  }

  return {};
}

function idxOf(headers: string[], ...aliases: string[]): number {
  for (const a of aliases) {
    const i = headers.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

/** First column literally named `material` that holds numbers → materialCost */
function findMaterialCostIndex(headers: string[], sampleRows: unknown[][]): number {
  const candidates: number[] = [];
  headers.forEach((h, i) => {
    if (h === "material" || h === "materialcost" || h === "matcost") candidates.push(i);
  });
  for (const i of candidates) {
    for (const row of sampleRows.slice(0, 20)) {
      if (num(row?.[i]) != null) return i;
    }
  }
  return candidates[0] ?? -1;
}

/**
 * Insulation / material phrase — often an unnamed column after Spec,
 * or a text Material column (not the numeric cost).
 */
function findMaterialPhraseIndex(
  rawHeaders: string[],
  headers: string[],
  sampleRows: unknown[][],
  materialCostIdx: number
): number {
  const iSpec = idxOf(headers, "spec");
  if (iSpec >= 0 && iSpec + 1 < headers.length) {
    const after = iSpec + 1;
    const key = headers[after] ?? "";
    if (
      !key ||
      key === "material" ||
      key.includes("insul") ||
      key.includes("phrase") ||
      key.includes("fsk") ||
      key.includes("asj")
    ) {
      if (after !== materialCostIdx) return after;
    }
    for (const row of sampleRows.slice(0, 15)) {
      const v = cellStr(row?.[after]);
      if (v && num(v) == null && after !== materialCostIdx) return after;
    }
  }

  for (let i = 0; i < headers.length; i++) {
    if (i === materialCostIdx) continue;
    const h = headers[i] ?? "";
    if (h !== "material" && !h.includes("insul") && !h.includes("phrase")) continue;
    for (const row of sampleRows.slice(0, 15)) {
      const v = cellStr(row?.[i]);
      if (v && num(v) == null) return i;
    }
  }

  if (iSpec >= 0) {
    for (let i = iSpec + 1; i < Math.min(headers.length, iSpec + 4); i++) {
      if (i === materialCostIdx) continue;
      for (const row of sampleRows.slice(0, 10)) {
        const v = cellStr(row?.[i]);
        if (v && /fsk|asj|fiberglass|aluminum|#\s*\d/i.test(v)) return i;
      }
    }
  }

  return -1;
}

function rowsFromMatrix(matrix: unknown[][]): MikeRowInput[] {
  if (matrix.length === 0) return [];

  const headerRow = findHeaderRowIndex(matrix);
  if (headerRow < 0) return [];

  const rawHeaders = (matrix[headerRow] ?? []).map((h) => String(h ?? ""));
  const headers = rawHeaders.map(headerKey);
  const dataStart = headerRow + 1;
  const sampleRows = matrix.slice(dataStart, dataStart + 25);

  const iSystem = idxOf(
    headers,
    "systemandtype",
    "systemtype",
    "system",
    "discipline"
  );
  const iThickness = idxOf(headers, "thickness", "thick");
  const iSize = idxOf(headers, "size", "diameter");
  const iQty = idxOf(headers, "quantity", "qty", "qtyestimated", "qtyest");
  const iHours = idxOf(headers, "hours", "hrs");
  const iBase = idxOf(headers, "materialbase", "base");
  const iExcel = idxOf(headers, "excelrownumber", "row", "rownumber");
  const iMatCost = findMaterialCostIndex(headers, sampleRows);
  const iPhrase = findMaterialPhraseIndex(rawHeaders, headers, sampleRows, iMatCost);

  if (iSize < 0 || iThickness < 0 || iQty < 0) return [];

  const rows: MikeRowInput[] = [];
  for (let r = dataStart; r < matrix.length; r++) {
    const cells = matrix[r] ?? [];
    const size = num(cells[iSize]);
    const thickness = num(cells[iThickness]);
    const quantity = num(cells[iQty]);
    const systemAndType =
      iSystem >= 0 ? cellStr(cells[iSystem]) || undefined : undefined;
    const materialPhrase =
      iPhrase >= 0 ? cellStr(cells[iPhrase]) || null : null;

    if (size == null && thickness == null && quantity == null) continue;
    if (size == null && thickness == null && quantity == null && !systemAndType) {
      continue;
    }

    rows.push({
      excelRowNumber: iExcel >= 0 ? num(cells[iExcel]) ?? r + 1 : r + 1,
      systemAndType,
      thickness,
      size,
      quantity: quantity ?? undefined,
      hours: iHours >= 0 ? num(cells[iHours]) : null,
      materialCost: iMatCost >= 0 ? num(cells[iMatCost]) : null,
      materialPhrase,
      materialBase: iBase >= 0 ? cellStr(cells[iBase]) || null : null,
    });
  }

  return rows;
}

function parseFromMatrix(matrix: unknown[][]): MikeParseResult {
  const meta = parseMikeMetaFromMatrix(matrix);
  const rows = rowsFromMatrix(matrix);
  return { rows, meta };
}

/** Parse Mike CSV text into rows + metadata. */
export function parseMikeCsv(text: string): MikeParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  return parseFromMatrix(lines.map(splitCsvLine));
}

/** Parse Mike CSV or XLSX File → { rows, meta }. */
export async function parseMikeFile(file: File): Promise<MikeParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]!];
    if (!sheet) return { rows: [], meta: {} };
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
      blankrows: false,
    }) as unknown[][];
    return parseFromMatrix(matrix);
  }

  const text = await file.text();
  return parseMikeCsv(text);
}
