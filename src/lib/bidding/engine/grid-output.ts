/**
 * Builds display values for Base Bid cells A1:J49 (Excel layout).
 */
import type { BidDetail, BidSystemKey, BidSystemRow } from "../types";
import { bool, nvl, round2, roundUp } from "./helpers";
import type { LaborBuildUp, NormalizedInputs, SystemComputed } from "./types";

export type ExcelGridCells = Record<string, string | number | null>;

type PairId = "duct" | "hydronic" | "plumbing" | "vrf" | "equipment";

const PAIRS: {
  id: PairId;
  primary: BidSystemKey;
  alt: BidSystemKey;
  hourlyCol: string;
  subtotalCol: string;
}[] = [
  { id: "duct", primary: "duct1", alt: "duct2", hourlyCol: "B", subtotalCol: "C" },
  { id: "hydronic", primary: "hydronic1", alt: "hydronic2", hourlyCol: "D", subtotalCol: "D" },
  { id: "plumbing", primary: "plumbing1", alt: "plumbing2", hourlyCol: "F", subtotalCol: "E" },
  { id: "vrf", primary: "vrf", alt: "vrf", hourlyCol: "H", subtotalCol: "F" },
  { id: "equipment", primary: "equipment", alt: "equipment", hourlyCol: "I", subtotalCol: "G" },
];

function set(grid: ExcelGridCells, addr: string, v: number | string | null) {
  if (v === "" || v === null || v === undefined) return;
  grid[addr] = v;
}

function pairActive(systems: BidSystemRow[], primary: BidSystemKey, alt: BidSystemKey) {
  const p = systems.find((s) => s.key === primary);
  const a = primary === alt ? p : systems.find((s) => s.key === alt);
  const usePrimary = bool(p?.used);
  return {
    usePrimary,
    primaryUsed: usePrimary,
    altUsed: !usePrimary && bool(a?.used),
    row: usePrimary ? p : bool(a?.used) ? a : p,
    hoursPrimary: nvl(p?.laborHours),
    hoursAlt: nvl(a?.laborHours),
    matPrimary: nvl(p?.materials),
    matAlt: nvl(a?.materials),
    mikePrimary: nvl(p?.mikeTotalPrice),
    mikeAlt: nvl(a?.mikeTotalPrice),
    qtyPrimary: nvl(p?.quantity),
    qtyAlt: nvl(a?.quantity),
    mikeNumPrimary: p?.mikeEstimateNumber,
    mikeNumAlt: a?.mikeEstimateNumber,
  };
}

function hourlyStackForPair(
  pair: ReturnType<typeof pairActive>,
  escFactor: number,
  salesTax: number,
  laborLoaded: number,
  parkingPerHour: number,
  liftsPerHour: number,
  composite: number,
  margin: number,
  parkingOn: boolean,
  liftsOn: boolean
) {
  const hours = pair.primaryUsed
    ? pair.hoursPrimary
    : pair.altUsed
      ? pair.hoursAlt
      : 0;
  const materials = pair.primaryUsed
    ? pair.matPrimary
    : pair.altUsed
      ? pair.matAlt
      : 0;

  if (hours <= 0 && materials <= 0) {
    return null;
  }

  const laborPerHr = laborLoaded - parkingPerHour;
  const r24 = hours > 0 ? laborPerHr : null;
  const r25 = parkingOn ? parkingPerHour : null;
  const r26 = liftsOn ? liftsPerHour : null;
  const r27 = hours > 0 ? materials / hours : null;
  const r28 = r27 != null ? r27 * escFactor : null;
  const r29 = r27 != null ? (r27 + nvl(r28)) * salesTax : null;
  const r30 =
    r24 != null
      ? nvl(r24) + nvl(r25) + nvl(r26) + nvl(r27) + nvl(r28) + nvl(r29)
      : null;
  let r31: number | null = null;
  let r32: number | null = null;
  let r33: number | null = null;
  if (r30 != null && margin > 0 && margin < 1) {
    r31 = r30 / (1 - margin) - r30;
    r32 = r30 + r31;
    r33 = hours > 0 ? (r30 * hours) / (1 - margin) : null;
  }

  return { hours, materials, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33 };
}

export function buildExcelGridCells(
  bid: BidDetail,
  inp: NormalizedInputs,
  ctx: {
    systemsComputed: SystemComputed[];
    laborBuildUp: LaborBuildUp;
    escFactor: number;
    avgPeople: number;
    manHours: number;
    dates: { workBegin: string | null; workEnd: string | null };
    totalLaborHours: number;
    totalMaterials: number;
    mikeEstimate: number;
    pjEstimate: number;
    costPerHourBeforeMargin: number;
    marginPerHour: number;
    costPerHourPj: number;
    costPerHourMike: number;
    totalMarginDollars: number;
    hoursPerWeek: number;
    wagePerHour?: number;
    fringePerHour?: number;
  }
): ExcelGridCells {
  const grid: ExcelGridCells = {};
  const systems = inp.systems;
  const lb = ctx.laborBuildUp;
  const margin = inp.margin;
  const parkingOn = bool(inp.base.parking);
  const liftsOn = bool(inp.base.liftsNeeded);

  set(grid, "H1", round2(ctx.mikeEstimate));
  set(grid, "J1", ctx.pjEstimate);
  set(grid, "H2", ctx.costPerHourMike);
  set(grid, "J2", round2(ctx.costPerHourPj));
  set(grid, "F6", ctx.hoursPerWeek);
  set(grid, "H7", ctx.avgPeople);
  set(grid, "H8", ctx.manHours);
  set(grid, "J7", round2(lb.totalLiftProject));
  if (ctx.wagePerHour != null) set(grid, "F9", ctx.wagePerHour);
  if (ctx.fringePerHour != null) set(grid, "F10", ctx.fringePerHour);
  if (ctx.wagePerHour != null && ctx.fringePerHour != null) {
    set(grid, "F11", round2(ctx.wagePerHour + ctx.fringePerHour));
  }
  set(grid, "B10", ctx.dates.workBegin);
  set(grid, "B11", ctx.dates.workEnd);
  set(grid, "D10", lb.compositePerHour);
  set(grid, "D11", lb.parkingPerHour);
  set(grid, "D12", lb.liftsPerHour);
  set(grid, "D13", lb.totalPerHourWithParkingAndLifts);
  set(grid, "H11", round2(ctx.escFactor));
  set(grid, "H13", inp.salesTaxPercent);

  let j18 = 0;
  let j19 = 0;
  let j20 = 0;

  for (const p of PAIRS) {
    const pair = pairActive(systems, p.primary, p.alt);
    if (pair.primaryUsed) {
      j18 += pair.matPrimary;
      j19 += pair.hoursPrimary;
      j20 += pair.mikePrimary;
    } else if (pair.altUsed) {
      j18 += pair.matAlt;
      j19 += pair.hoursAlt;
      j20 += pair.mikeAlt;
    } else if (p.id === "vrf" || p.id === "equipment") {
      const r = systems.find((s) => s.key === p.primary);
      if (bool(r?.used)) {
        j18 += nvl(r?.materials);
        j19 += nvl(r?.laborHours);
        j20 += nvl(r?.mikeTotalPrice);
      }
    }

    const stack = hourlyStackForPair(
      pair,
      ctx.escFactor,
      inp.salesTaxPercent,
      lb.totalPerHourWithParkingAndLifts,
      lb.parkingPerHour,
      lb.liftsPerHour,
      lb.compositePerHour,
      margin,
      parkingOn,
      liftsOn
    );

    if (stack) {
      const hc = p.hourlyCol;
      if (stack.r24 != null) set(grid, `${hc}24`, round2(stack.r24));
      if (stack.r25 != null) set(grid, `${hc}25`, round2(stack.r25));
      if (stack.r26 != null) set(grid, `${hc}26`, round2(stack.r26));
      if (stack.r27 != null) set(grid, `${hc}27`, round2(stack.r27));
      if (stack.r28 != null) set(grid, `${hc}28`, round2(stack.r28));
      if (stack.r29 != null) set(grid, `${hc}29`, round2(stack.r29));
      if (stack.r30 != null) set(grid, `${hc}30`, round2(stack.r30));
      if (stack.r31 != null) set(grid, `${hc}31`, round2(stack.r31));
      if (stack.r32 != null) set(grid, `${hc}32`, round2(stack.r32));
      if (stack.r33 != null) set(grid, `${hc}33`, round2(stack.r33));
    }

    const sc = ctx.systemsComputed.find((s) =>
      pair.primaryUsed ? s.key === p.primary : pair.altUsed ? s.key === p.alt : false
    );
    const subCol = p.subtotalCol;
    if (sc?.used) {
      set(grid, `${subCol}37`, sc.laborHours);
      set(grid, `${subCol}38`, lb.compositePerHour);
      set(grid, `${subCol}39`, lb.parkingPerHour);
      set(grid, `${subCol}40`, lb.liftsPerHour);
      set(grid, `${subCol}41`, sc.laborTotal);
      set(grid, `${subCol}42`, sc.materials);
      set(grid, `${subCol}43`, sc.materialEscalation);
      set(grid, `${subCol}44`, sc.materialSalesTax);
      set(grid, `${subCol}45`, sc.subtotal);
    }

    if (pair.primaryUsed && pair.row) {
      const ic = p.primary === "duct1" ? "B" : p.primary === "hydronic1" ? "D" : p.primary === "plumbing1" ? "F" : p.primary === "vrf" ? "H" : "I";
      if (pair.mikeNumPrimary != null) set(grid, `${ic}17`, pair.mikeNumPrimary);
      set(grid, `${ic}18`, pair.matPrimary);
      set(grid, `${ic}19`, pair.hoursPrimary);
      set(grid, `${ic}20`, pair.mikePrimary);
      set(grid, `${ic}21`, pair.qtyPrimary);
      set(grid, `${ic}22`, pair.qtyPrimary);
    } else if (pair.altUsed && pair.row) {
      const ic = p.alt === "duct2" ? "C" : p.alt === "hydronic2" ? "E" : "G";
      if (pair.mikeNumAlt != null) set(grid, `${ic}17`, pair.mikeNumAlt);
      set(grid, `${ic}18`, pair.matAlt);
      set(grid, `${ic}19`, pair.hoursAlt);
      set(grid, `${ic}20`, pair.mikeAlt);
      set(grid, `${ic}21`, pair.qtyAlt);
      set(grid, `${ic}22`, pair.qtyAlt);
    }
  }

  set(grid, "J18", round2(j18));
  set(grid, "J19", round2(j19));
  set(grid, "J20", round2(j20));
  set(grid, "J24", lb.compositePerHour);
  set(grid, "J25", lb.parkingPerHour);
  set(grid, "J26", lb.liftsPerHour);

  const j27 = j19 > 0 ? j18 / j19 : 0;
  set(grid, "J27", round2(j27));
  set(grid, "J28", round2(j27 * ctx.escFactor));
  set(grid, "J29", round2((j27 + j27 * ctx.escFactor) * inp.salesTaxPercent));

  let j30 = lb.compositePerHour + lb.parkingPerHour + lb.liftsPerHour + j27 + j27 * ctx.escFactor + (j27 + j27 * ctx.escFactor) * inp.salesTaxPercent;
  set(grid, "J30", round2(j30));
  if (margin > 0 && margin < 1) {
    const j31 = j30 / (1 - margin) - j30;
    set(grid, "J31", round2(j31));
    set(grid, "J32", round2(j30 + j31));
    set(grid, "J33", roundUp((j30 * j19) / (1 - margin), -3));
  }

  set(grid, "H37", round2(ctx.totalLaborHours));
  set(grid, "H38", lb.compositePerHour);
  set(grid, "H39", lb.parkingPerHour);
  set(grid, "H40", lb.liftsPerHour);
  set(grid, "H41", round2(ctx.systemsComputed.reduce((s, r) => s + r.laborTotal, 0)));
  set(grid, "H42", round2(ctx.totalMaterials));
  set(grid, "H43", round2(ctx.totalMaterials * ctx.escFactor));
  set(grid, "H44", round2((ctx.totalMaterials + ctx.totalMaterials * ctx.escFactor) * inp.salesTaxPercent));
  const h45 = ctx.systemsComputed.reduce((s, r) => s + r.subtotal, 0);
  set(grid, "H45", round2(h45));
  set(grid, "I45", ctx.costPerHourBeforeMargin);
  set(grid, "C46", margin);
  set(grid, "H46", round2(ctx.totalMarginDollars));
  set(grid, "I46", ctx.marginPerHour);
  set(grid, "H47", ctx.pjEstimate);
  set(grid, "I47", round2(ctx.costPerHourPj));
  set(grid, "H48", round2(ctx.mikeEstimate));
  set(grid, "I48", ctx.costPerHourMike);
  set(grid, "H49", ctx.pjEstimate);

  set(grid, "B44", inp.salesTaxPercent);

  return grid;
}

