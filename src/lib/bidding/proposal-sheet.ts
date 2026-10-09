import {
  PROPOSAL_SHEET_BUCKETS,
  type BidProcess,
  type ProcessMeta,
  type ProposalEditorSheetMeta,
  type ProposalSheet,
  type ProposalSheetAlternate,
  type ProposalSheetBucket,
  type ProposalSheetCopy,
  type ProposalSheetException,
  type ProposalSheetLine,
} from "@/lib/bidding/process-types";
import type { BidDetail, BidSystemRow } from "@/lib/bidding/types";

export function proposalSheetMeta(meta: ProcessMeta | null | undefined): ProposalEditorSheetMeta {
  const sheet = meta?.proposalEditor?.sheet;
  return sheet && typeof sheet === "object" ? sheet : {};
}

export function bucketDefs(meta: ProcessMeta | null | undefined): { value: string; label: string }[] {
  const raw = proposalSheetMeta(meta).buckets;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((b) => {
      if (typeof b === "string") {
        return { value: b, label: labelizeBucket(b) };
      }
      const value = String(b.value ?? "").trim();
      return {
        value: value || "bucket",
        label: (b.label ?? labelizeBucket(value)).trim() || labelizeBucket(value),
      };
    });
  }
  return PROPOSAL_SHEET_BUCKETS.map((value) => ({ value, label: labelizeBucket(value) }));
}

/** Fallback exception rows from ProposalExample PDFs when process-meta omits them. */
export const DEFAULT_PROPOSAL_EXCEPTIONS: { key: string; label: string }[] = [
  { key: "sound_lagging", label: "Sound/Acoustical Lagging" },
  { key: "fire_rated_enclosures", label: "Fire rated Enclosures" },
  { key: "blank_off_panels", label: "Blank of Panels" },
  { key: "victaulic_fittings", label: "Victaulic Fittings" },
  { key: "underground_piping", label: "Underground Piping" },
  { key: "pre_insulated_pipe_supports", label: "Pre-insulated Pipe Supports" },
  { key: "calsil_foamglass_inserts", label: "180 degree Calsil / Foamglass inserts" },
  { key: "ada_undersink", label: "ADA Compliant Undersink protection" },
  { key: "saddles_shields", label: "Saddles & Shields" },
  { key: "heat_tracing", label: "Heat Tracing" },
  { key: "fire_stopping", label: "Fire Stopping" },
  { key: "color_coding", label: "Color Coding" },
  { key: "labeling", label: "Labeling of Pipe of Duct" },
  { key: "lined_ductwork", label: "Lined Ductwork" },
  { key: "existing_duct", label: "Insulation of Existing Duct" },
  { key: "flexible_duct", label: "Flexible duct" },
  { key: "existing_pipe", label: "Insulation of Existing Pipe" },
  { key: "pipe_prepping", label: "Pipe prepping or coating" },
  { key: "pipe_duct_painting", label: "Pipe or Duct Painting" },
  { key: "pipe_duct_cleaning", label: "Pipe of Duct cleaning prior to installation of insulation" },
  { key: "chiller_insulation", label: "Chiller Insulation" },
  { key: "generator_exhaust", label: "Generator Exhaust" },
  { key: "overtime_shift", label: "Overtime / Shift Work" },
  { key: "mockups_by_others", label: "Pipe, Equipment, and Duct required for mock-ups is by others" },
  { key: "insulation_demo", label: "Insulation Demo or Removal" },
  { key: "thermal_imaging", label: "Thermal Imaging of Insulation" },
  { key: "composite_cleanup", label: "Composite Cleanup" },
  { key: "damage_by_others", label: "Damage to insulation by others" },
  { key: "wood_block_supports", label: "Wood block for pipe supports" },
  { key: "third_party_testing", label: "Third Party Testing" },
  { key: "bonds", label: "Bonds" },
  { key: "trap_primer_piping", label: "Trap Primer Piping" },
  { key: "sales_tax", label: "Sales Tax" },
];

/** Cover-page scope bullets — always printed, never stored (FRONTEND_PROPOSAL). */
export const DEFAULT_PROPOSAL_BOILERPLATE: string[] = [
  "Insulation Scope: Thermal insulation of New Systems as listed attached.",
  "All insulation will be installed per manufactures recommendations.",
  "Note: No existing piping and ductwork/plenums is included. Our pricing is contingent upon work being released with enough time to complete before walls and ceilings are closed up.",
  '"Ladder Last" or similar policy preventing the use of ladders is excluded from the pricing — Add 4% to price for "Ladder last".',
];

export function exceptionDefs(
  meta: ProcessMeta | null | undefined
): { key: string; label: string }[] {
  const raw = proposalSheetMeta(meta).exceptions;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PROPOSAL_EXCEPTIONS;
  return raw
    .map((row) => {
      if (typeof row === "string") {
        const key = row.trim();
        return key ? { key, label: labelizeBucket(key) } : null;
      }
      const key = String(row.key ?? "").trim();
      if (!key) return null;
      return { key, label: (row.label ?? labelizeBucket(key)).trim() || key };
    })
    .filter((x): x is { key: string; label: string } => x != null);
}

export function boilerplateLines(meta: ProcessMeta | null | undefined): string[] {
  const raw = proposalSheetMeta(meta).boilerplate;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s) => String(s ?? "").trim()).filter(Boolean);
  }
  return DEFAULT_PROPOSAL_BOILERPLATE;
}

export function showCertPage(meta: ProcessMeta | null | undefined): boolean {
  const v = proposalSheetMeta(meta).certPage;
  return v === true || v === "true" || v === "dcb" || v === "DCB";
}

export type ProposalLetterKind = "goel" | "dcb";

export interface ProposalLetterhead {
  kind: ProposalLetterKind;
  companyName: string;
  divisionLine: string;
  bidNumberLabel: string;
  estimatorLabel: string;
  addressLines: string[];
  mainPhone: string;
  website?: string;
  services: string[];
  badge: string;
  bidListEmail?: string;
  additionalContact?: {
    name: string;
    title: string;
    phone: string;
    email: string;
  };
}

const GOEL_LETTERHEAD: ProposalLetterhead = {
  kind: "goel",
  companyName: "Goel Services, Inc.",
  divisionLine: "Goel Services (Mechanical Insulation Division)",
  bidNumberLabel: "GOEL BID NUMBER",
  estimatorLabel: "GOEL ESTIMATOR",
  addressLines: ["3027 Hubbard Rd; Suite 101", "Landover, MD 20785"],
  mainPhone: "(202) 457-0111",
  website: "http://www.goelservices.com",
  services: [
    "EXCAVATION",
    "DEMOLITION (INTERIOR GUT & WRECK)",
    "ENVIRONMENTAL REMEDIATION",
    "CORE DRILLING / SAW CUTTING",
    "REMOVABLE PADS",
    "CUSTOM METAL PUMP BOXES",
  ],
  badge: "IS A FEDERAL SMALL DISADVANTAGED BUSINESS (ASIAN OWNED)",
  bidListEmail: "INSULATION.BIDS@GOELSERVICES.COM",
  additionalContact: {
    name: "Nick Rogero",
    title: "Divisional Manager — Insulation",
    phone: "202-567-3658",
    email: "Nick.rogero@goelservices.com",
  },
};

const DCB_LETTERHEAD: ProposalLetterhead = {
  kind: "dcb",
  companyName: "Delaware Cornerstone Builders, Inc.",
  divisionLine: "Delaware Cornerstone Builders",
  bidNumberLabel: "DCB PROPOSAL NUMBER",
  estimatorLabel: "ESTIMATOR TO CONTACT",
  addressLines: [
    "3027 Hubbard Road; Suite 103",
    "Landover, MD 20785",
    "4120 Menlo Drive",
    "Baltimore, MD 21215",
  ],
  mainPhone: "(301) 864-2600",
  website: undefined,
  services: [
    "Labor Temp Services — Union",
    "Masonry & Concrete Flat Work",
    "Mold, Lead Paint and Asbestos",
    "Interior Demolition",
    "Excavation & Wrecking",
    "Roll Off Dumpsters",
    "Core Drilling / Wall/Flat/Wire Sawing",
    "Mechanical Insulation Fabrication",
    "Pre-insulated Pipe Inserts",
    "Removable Pad Covers — Custom Designed",
    "Curled PVC Vapor Barriers",
    "Pittsburgh Z Pipe Cover",
  ],
  badge: "ASIAN OWNED MDOT AND BALTIMORE MWBOO SDB",
};

export function isDcbEntity(
  entityLabel: string,
  meta: ProcessMeta | null | undefined
): boolean {
  if (showCertPage(meta)) return true;
  const t = entityLabel.toLowerCase();
  return (
    t.includes("dcb") ||
    t.includes("delaware cornerstone") ||
    t.includes("cornerstone builders")
  );
}

export function letterheadForEntity(
  entityLabel: string,
  meta: ProcessMeta | null | undefined
): ProposalLetterhead {
  if (isDcbEntity(entityLabel, meta)) {
    return {
      ...DCB_LETTERHEAD,
      companyName: entityLabel?.trim() || DCB_LETTERHEAD.companyName,
    };
  }
  const name = entityLabel?.trim();
  return {
    ...GOEL_LETTERHEAD,
    companyName: name && !/^goel/i.test(name) ? name : GOEL_LETTERHEAD.companyName,
  };
}

export function formatProposalDate(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const t = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return t;
}

function labelizeBucket(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function emptyLine(bucket: string): ProposalSheetLine {
  return { bucket, systems: "", quantity: null, price: null };
}

/** Ensure lines cover known buckets (order from meta / defaults). */
export function normalizeProposalSheet(
  sheet: ProposalSheet | null | undefined,
  meta: ProcessMeta | null | undefined
): ProposalSheet {
  const buckets = bucketDefs(meta).map((b) => b.value);
  const byBucket = new Map<string, ProposalSheetLine>();
  for (const line of sheet?.lines ?? []) {
    const key = String(line.bucket ?? "").trim();
    if (key) byBucket.set(key, { ...line, bucket: key });
  }
  const lines = buckets.map((bucket) => byBucket.get(bucket) ?? emptyLine(bucket));

  const exDefs = exceptionDefs(meta);
  const byEx = new Map<string, ProposalSheetException>();
  for (const row of sheet?.exceptions ?? []) {
    const key = String(row.key ?? "").trim();
    if (key) byEx.set(key, { key, included: row.included ?? null });
  }
  const exceptions =
    exDefs.length > 0
      ? exDefs.map((d) => byEx.get(d.key) ?? { key: d.key, included: null })
      : [...byEx.values()];

  return {
    revision: sheet?.revision ?? "0",
    proposalDate: sheet?.proposalDate ?? null,
    drawings: sheet?.drawings ?? null,
    specifications: sheet?.specifications ?? null,
    wageScale: sheet?.wageScale ?? null,
    addenda: sheet?.addenda ?? null,
    mechanicalDesigner: sheet?.mechanicalDesigner ?? null,
    specialNotes: sheet?.specialNotes ?? null,
    lines,
    alternates: Array.isArray(sheet?.alternates) ? sheet!.alternates! : [],
    exceptions,
    copies: Array.isArray(sheet?.copies) ? sheet!.copies! : [],
  };
}

export function resolveBucketPrice(
  sheet: ProposalSheet,
  bucket: string,
  copy?: ProposalSheetCopy | null
): number | null {
  const override = copy?.prices?.[bucket];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  const line = (sheet.lines ?? []).find((l) => l.bucket === bucket);
  const p = line?.price;
  return typeof p === "number" && Number.isFinite(p) ? p : null;
}

export function resolveAlternatePrice(
  alt: ProposalSheetAlternate,
  index: number,
  copy?: ProposalSheetCopy | null
): number | null {
  const override = copy?.alternatePrices?.[index];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  const p = alt.price;
  return typeof p === "number" && Number.isFinite(p) ? p : null;
}

export function lumpTotal(
  sheet: ProposalSheet,
  buckets: string[],
  copy?: ProposalSheetCopy | null
): number {
  let sum = 0;
  for (const bucket of buckets) {
    const p = resolveBucketPrice(sheet, bucket, copy);
    if (typeof p === "number") sum += p;
  }
  return sum;
}

export function newCopyId(): string {
  return `copy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyCopy(id?: string): ProposalSheetCopy {
  return {
    id: id ?? newCopyId(),
    toName: "",
    toCompany: "",
    toEmail: "",
    toPhone: null,
    toAddress: "",
    showQuantities: null,
    prices: {},
    alternatePrices: [],
  };
}

export function formatProposalMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function blank(v: string | null | undefined): boolean {
  return v == null || !String(v).trim();
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumSystemPrices(systems: BidSystemRow[] | undefined, keys: string[]): number | null {
  let sum = 0;
  let any = false;
  for (const row of systems ?? []) {
    if (!keys.includes(String(row.key))) continue;
    if (row.used === false) continue;
    const n = row.mikeTotalPrice;
    if (typeof n === "number" && Number.isFinite(n)) {
      sum += n;
      any = true;
    }
  }
  return any ? Math.round(sum) : null;
}

function drawingsFromProcess(process: BidProcess, meta: ProcessMeta | null | undefined): string {
  const parts: string[] = [];
  const name = process.drawingName?.trim();
  if (name) parts.push(name);
  const cat = process.drawingCategory;
  if (cat) {
    const label =
      meta?.drawingCategoryLabels?.[cat] ||
      String(cat).replace(/_/g, " ").toUpperCase();
    if (label && !parts.some((p) => p.toLowerCase().includes(String(label).toLowerCase()))) {
      parts.push(String(label).toUpperCase());
    }
  }
  const num = process.drawingNumber?.trim();
  if (num) parts.push(num);
  return parts.join(" ").trim();
}

function addendaFromProcess(process: BidProcess): string {
  const nums: string[] = [];
  for (const inv of process.invitations ?? []) {
    for (const a of inv.addenda ?? []) {
      const n = a.number?.trim();
      if (n) nums.push(n);
    }
  }
  if (nums.length === 0) return "NONE";
  return [...new Set(nums)].join(" & ");
}

function wageScaleFromBid(bid: BidDetail, process: BidProcess): string {
  const label = bid.baseBid?.wageRateLabel?.trim();
  if (label) {
    const u = label.toUpperCase();
    if (u.includes("NON-SCALE") || u.includes("NON SCALE") || u.includes("NONE")) return "NONE";
    if (u.includes("NON-WAGE") || u.startsWith("NO")) return "NO";
    // keep a short form — full label is long for the cover cell
    const short = label.split("=")[0]?.trim() || label;
    return short.length > 48 ? `${short.slice(0, 45)}…` : short;
  }
  if (process.pla === true) return "YES";
  if (process.pla === false) return "NONE";
  if (bid.baseBid?.pla === true) return "YES";
  return "NONE";
}

function copiesFromProcess(process: BidProcess): ProposalSheetCopy[] {
  const parties = [...(process.generalContractors ?? []), ...(process.mechanicals ?? [])];
  const out: ProposalSheetCopy[] = [];
  const seen = new Set<string>();
  for (const p of parties) {
    if (p.stillBidding === false) continue;
    const company = p.company?.trim() || "";
    const name = (p.contactName || p.name || "").trim();
    if (!company && !name) continue;
    const idBase = (company || name || "copy")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24);
    let id = idBase || newCopyId();
    let n = 2;
    while (seen.has(id)) {
      id = `${idBase}_${n++}`;
    }
    seen.add(id);
    out.push({
      id,
      toName: name,
      toCompany: company,
      toEmail: p.email?.trim() || "",
      toPhone: p.phone?.trim() || null,
      toAddress: "",
      showQuantities: false,
      prices: {},
      alternatePrices: [],
    });
  }
  return out;
}

function rawBlank(
  raw: ProposalSheet | null | undefined,
  key: keyof ProposalSheet
): boolean {
  const v = raw?.[key];
  if (v == null) return true;
  if (typeof v === "string") return !v.trim();
  return false;
}

/**
 * Fill empty proposalSheet fields from intake / assignment / calculator.
 * Does not overwrite values the team already typed (checks raw sheet, not normalized defaults).
 * Prices: only when a bucket price is null — uses systems mikeTotalPrice rollups.
 */
export function hydrateProposalSheetFromBid(
  normalized: ProposalSheet,
  raw: ProposalSheet | null | undefined,
  bid: BidDetail,
  process: BidProcess,
  meta: ProcessMeta | null | undefined
): { sheet: ProposalSheet; changed: boolean; filled: string[] } {
  const next: ProposalSheet = {
    ...normalized,
    lines: (normalized.lines ?? []).map((l) => ({ ...l })),
    alternates: [...(normalized.alternates ?? [])],
    exceptions: [...(normalized.exceptions ?? [])],
    copies: [...(normalized.copies ?? [])],
  };
  const filled: string[] = [];

  if (rawBlank(raw, "revision")) {
    next.revision =
      typeof process.proposalIteration === "number"
        ? String(process.proposalIteration)
        : "0";
    filled.push("revision");
  }

  if (rawBlank(raw, "proposalDate")) {
    next.proposalDate =
      process.dateSubmitted?.slice(0, 10) ||
      bid.bidDate?.slice(0, 10) ||
      todayIso();
    filled.push("proposalDate");
  }

  if (rawBlank(raw, "drawings")) {
    const d = drawingsFromProcess(process, meta);
    if (d) {
      next.drawings = d;
      filled.push("drawings");
    }
  }

  if (rawBlank(raw, "specifications")) {
    next.specifications = "ON THE PLANS";
    filled.push("specifications");
  }

  if (rawBlank(raw, "wageScale")) {
    next.wageScale = wageScaleFromBid(bid, process);
    filled.push("wageScale");
  }

  if (rawBlank(raw, "addenda")) {
    next.addenda = addendaFromProcess(process);
    filled.push("addenda");
  }

  if (rawBlank(raw, "mechanicalDesigner")) {
    const me = process.mechanicalEngineer;
    const label = (me?.company || me?.name || me?.contactName || "").trim();
    if (label) {
      next.mechanicalDesigner = label;
      filled.push("mechanicalDesigner");
    }
  }

  const priceMap: Record<string, number | null> = {
    ductwork: sumSystemPrices(bid.systems, ["duct1", "duct2"]),
    hvac_piping: sumSystemPrices(bid.systems, ["hydronic1", "hydronic2", "vrf"]),
    plumbing: sumSystemPrices(bid.systems, ["plumbing1", "plumbing2"]),
    hvac_equipment: sumSystemPrices(bid.systems, ["equipment"]),
    plumbing_equipment: null,
  };

  const rawLines = raw?.lines ?? [];
  next.lines = (next.lines ?? []).map((line) => {
    const bucket = String(line.bucket);
    const rawLine = rawLines.find((l) => String(l.bucket) === bucket);
    const rawPriceMissing =
      rawLine == null || rawLine.price == null || !Number.isFinite(rawLine.price);
    if (rawPriceMissing && priceMap[bucket] != null) {
      filled.push(`lines.${bucket}.price`);
      return { ...line, price: priceMap[bucket] };
    }
    return line;
  });

  if ((raw?.copies ?? []).length === 0 && (next.copies ?? []).length === 0) {
    const seeded = copiesFromProcess(process);
    if (seeded.length > 0) {
      next.copies = seeded;
      filled.push("copies");
    }
  }

  return { sheet: next, changed: filled.length > 0, filled };
}

export type { ProposalSheetBucket };
