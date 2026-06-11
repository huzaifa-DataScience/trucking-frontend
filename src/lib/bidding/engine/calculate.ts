import { BID_SYSTEM_KEYS } from "../constants";
import type { BidDetail, BidSystemRow } from "../types";
import { EXCEL_HOURS_PER_MONTH, EXCEL_LIFT_MONTH_FACTOR } from "./excel-spec";
import { bool, nvl, parseBidDate, round2, roundUp, addMonths } from "./helpers";
import type {
  BaseBidEngineResult,
  EngineLookups,
  NormalizedInputs,
  SystemComputed,
} from "./types";
import { detectInputWarnings } from "./validate";
import { buildExcelGridCells } from "./grid-output";

function normalizeInputs(bid: BidDetail, lookups?: EngineLookups): NormalizedInputs {
  const base = bid.baseBid ?? {};
  const state = String(base.projectState ?? "").trim();
  let salesTaxPercent = 0;
  if (base.salesTaxApplicable !== false) {
    if (typeof base.stateSalesTaxRate === "number") {
      salesTaxPercent = base.stateSalesTaxRate;
    } else if (state && lookups?.salesTaxRateByState?.[state] != null) {
      salesTaxPercent = lookups.salesTaxRateByState[state];
    }
  }

  return {
    base,
    systems: bid.systems ?? [],
    margin: nvl(base.marginPercent as number | undefined),
    hoursPerDay: nvl(base.hoursPerDay as number | undefined),
    daysPerWeek: nvl(base.daysPerWeek as number | undefined),
    durationMonths: Math.max(nvl(base.durationMonths as number | undefined), 0),
    startInMonths: nvl(base.startInMonths as number | undefined),
    materialEscalationPerYear: nvl(base.materialEscalationPerYear as number | undefined),
    salesTaxPercent,
    compositePerHour: nvl(base.laborRateCompositePerHour as number | undefined),
  };
}

function usedSystems(systems: BidSystemRow[]) {
  return systems.filter((s) => bool(s.used));
}

/** Excel H11 = (YEAR(B11)-YEAR(B2))*H10; B10=EDATE(B2,B13), B11=EDATE(B10,B12-1). */
function materialEscalationFactor(inp: NormalizedInputs, bidDateIso?: string): number {
  const bidDate = parseBidDate(
    bidDateIso ?? (inp.base.bidDate as string | undefined) ?? undefined
  );
  if (!bidDate || inp.durationMonths <= 0) return 0;
  const b10 = addMonths(bidDate, inp.startInMonths);
  const b11 = addMonths(b10, Math.max(inp.durationMonths - 1, 0));
  const years = b11.getFullYear() - bidDate.getFullYear();
  return years * inp.materialEscalationPerYear;
}

function workDates(bidDateIso: string | undefined, startInMonths: number, durationMonths: number) {
  const bidDate = parseBidDate(bidDateIso);
  if (!bidDate) return { workBegin: null as string | null, workEnd: null as string | null };
  const b10 = addMonths(bidDate, startInMonths);
  const b11 = addMonths(b10, Math.max(durationMonths - 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { workBegin: iso(b10), workEnd: iso(b11) };
}

/** Excel H7 = ROUND(J19/B12/(1950/12),2) when no override. */
function averagePersonnel(
  totalLaborHours: number,
  durationMonths: number,
  inputOverride: number | undefined
): number {
  if (inputOverride != null && inputOverride > 0) return round2(inputOverride);
  if (durationMonths <= 0 || totalLaborHours <= 0) return 0;
  return round2(totalLaborHours / durationMonths / EXCEL_HOURS_PER_MONTH);
}

/** Excel H8 = ROUND(B12*1950/12*H7,0). */
function manHoursPeriod(durationMonths: number, avgPeople: number): number {
  if (durationMonths <= 0 || avgPeople <= 0) return 0;
  return Math.round(durationMonths * EXCEL_HOURS_PER_MONTH * avgPeople);
}

function completionPercent(base: BidDetail["baseBid"], systems: BidSystemRow[]): number {
  const checks: boolean[] = [
    Boolean(base.teamName),
    Boolean(base.projectState),
    base.marginPercent != null,
    base.hoursPerDay != null,
    base.daysPerWeek != null,
    base.durationMonths != null,
    Boolean(base.wageRateLabel),
    base.laborRateCompositePerHour != null,
    usedSystems(systems).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/**
 * Base Bid calculator — ports BiddingSheet.xlsx rows 37–48 (subtotals) + D10–D13 + J7/H8/H46.
 */
export function calculateBaseBid(
  bid: BidDetail,
  lookups?: EngineLookups
): BaseBidEngineResult {
  const inp = normalizeInputs(bid, lookups);
  const errors: { field: string; message: string }[] = [];
  const warnings: string[] = [...detectInputWarnings(inp.systems)];

  const active = usedSystems(inp.systems);
  const totalLaborHours = active.reduce((s, r) => s + nvl(r.laborHours), 0);
  const totalMaterials = active.reduce((s, r) => s + nvl(r.materials), 0);
  const mikeEstimate = active.reduce((s, r) => s + nvl(r.mikeTotalPrice), 0);

  const escFactor = materialEscalationFactor(inp, bid.bidDate);
  const avgPeople = averagePersonnel(
    totalLaborHours,
    inp.durationMonths,
    inp.base.averageNoPeople as number | undefined
  );

  const dates = workDates(bid.bidDate, inp.startInMonths, inp.durationMonths);

  /** D11 */
  const parkingPerHour =
    bool(inp.base.parking) && inp.hoursPerDay > 0
      ? nvl(inp.base.parkingCostPerDay as number | undefined) / inp.hoursPerDay
      : 0;

  /** J7 — project lift $ (Excel still evaluates when Lifts_Needed=No; D12 gates $/hr). */
  const totalLiftProject =
    nvl(inp.base.liftPercentage as number | undefined) *
    nvl(inp.base.liftCostPer4Weeks as number | undefined) *
    inp.durationMonths *
    EXCEL_LIFT_MONTH_FACTOR *
    avgPeople;

  /** D12 */
  const liftsPerHour =
    bool(inp.base.liftsNeeded) && totalLaborHours > 0
      ? totalLiftProject / totalLaborHours
      : 0;

  const composite = inp.compositePerHour;
  /** D13 = D10+D11+D12 */
  const laborRateLoaded = composite + parkingPerHour + liftsPerHour;
  /** C38:C40 stack for row 41 */
  const laborPerHourStack = composite + parkingPerHour + liftsPerHour;

  const systemsComputed: SystemComputed[] = BID_SYSTEM_KEYS.map((key) => {
    const row = inp.systems.find((s) => s.key === key);
    const used = bool(row?.used);
    if (!used) {
      return {
        key,
        used: false,
        laborHours: 0,
        materials: 0,
        laborTotal: 0,
        materialEscalation: 0,
        materialSalesTax: 0,
        subtotal: 0,
      };
    }
    const hours = nvl(row?.laborHours);
    const materials = nvl(row?.materials);
    /** C41 = hours * SUM(composite, parking, lifts) */
    const laborTotal = hours * laborPerHourStack;
    /** C43 = materials * Material_Escalation (H11 factor) */
    const materialEscalation = materials * escFactor;
    /** C44 = (C42+C43)*Sales_tax_percent */
    const materialSalesTax = (materials + materialEscalation) * inp.salesTaxPercent;
    /** C45 */
    const subtotal = laborTotal + materials + materialEscalation + materialSalesTax;
    return {
      key,
      used: true,
      laborHours: hours,
      materials,
      laborTotal: round2(laborTotal),
      materialEscalation: round2(materialEscalation),
      materialSalesTax: round2(materialSalesTax),
      subtotal: round2(subtotal),
    };
  });

  const subtotalSum = systemsComputed.reduce((s, r) => s + r.subtotal, 0);

  let costPerHourBeforeMargin = 0;
  let marginPerHour = 0;
  let costPerHourPj = 0;
  let pjEstimate = 0;
  let totalMarginDollars = 0;

  if (totalLaborHours > 0) {
    /** I45 = ROUNDUP(H45/H37,2) — H45 = sum of system subtotals */
    costPerHourBeforeMargin = roundUp(subtotalSum / totalLaborHours, 2);
    if (inp.margin > 0 && inp.margin < 1) {
      /** I46 = ROUNDUP(-I45+I45/(1-Margin),2) */
      marginPerHour = roundUp(
        -costPerHourBeforeMargin + costPerHourBeforeMargin / (1 - inp.margin),
        2
      );
    }
    /** I47 = I45+I46 */
    costPerHourPj = costPerHourBeforeMargin + marginPerHour;
    /** H47 = ROUNDUP(I47*H37,-2) */
    pjEstimate = roundUp(costPerHourPj * totalLaborHours, -2);
    /** H46 = I46*J19 (J19 ≈ total hours) */
    totalMarginDollars = round2(marginPerHour * totalLaborHours);
  } else if (subtotalSum > 0) {
    warnings.push("Total labor hours is zero; PJ estimate set to 0.");
  }

  /** I48 = H48/H37; H48 = J20 = sum(mike column row 20) */
  const costPerHourMike = totalLaborHours > 0 ? round2(mikeEstimate / totalLaborHours) : 0;

  if (inp.margin >= 1) {
    errors.push({ field: "marginPercent", message: "Margin must be less than 100% (e.g. 0.25)." });
  }

  const manHours = manHoursPeriod(inp.durationMonths, avgPeople);
  const hoursPerWeek = round2(inp.hoursPerDay * inp.daysPerWeek);

  const excelGrid = buildExcelGridCells(bid, inp, {
    systemsComputed,
    laborBuildUp: {
      compositePerHour: round2(composite),
      parkingPerHour: round2(parkingPerHour),
      liftsPerHour: round2(liftsPerHour),
      totalPerHourWithParkingAndLifts: round2(laborRateLoaded),
      totalLiftProject: round2(totalLiftProject),
    },
    escFactor,
    avgPeople,
    manHours,
    dates,
    totalLaborHours,
    totalMaterials,
    mikeEstimate,
    pjEstimate,
    costPerHourBeforeMargin,
    marginPerHour,
    costPerHourPj,
    costPerHourMike,
    totalMarginDollars,
    hoursPerWeek,
    wagePerHour: (inp.base.wage as number | undefined) ?? undefined,
    fringePerHour: (inp.base.fringe as number | undefined) ?? undefined,
  });

  const computed: Record<string, number | string | boolean | null> = {
    "baseBid.mikeEstimate": round2(mikeEstimate),
    "baseBid.pjEstimate": pjEstimate,
    "baseBid.costPerHourMike": costPerHourMike,
    "baseBid.costPerHourPj": round2(costPerHourPj),
    "baseBid.marginPercent": inp.margin,
    "baseBid.costPerHourBeforeMargin": costPerHourBeforeMargin,
    "baseBid.marginPerHour": marginPerHour,
    "baseBid.totalMarginDollars": totalMarginDollars,
    "labor.totalHours": round2(totalLaborHours),
    "labor.parkingPerHour": round2(parkingPerHour),
    "labor.liftsPerHour": round2(liftsPerHour),
    "labor.materialEscalationFactor": round2(escFactor),
    "labor.salesTaxPercent": inp.salesTaxPercent,
    "labor.totalMaterials": round2(totalMaterials),
    "labor.averagePersonnel": avgPeople,
    "labor.compositePerHour": round2(composite),
    "labor.totalPerHourLoaded": round2(laborRateLoaded),
    "labor.totalLiftProject": round2(totalLiftProject),
    "labor.manHoursPeriod": manHours,
    "labor.workBeginDate": dates.workBegin,
    "labor.workEndDate": dates.workEnd,
    "labor.hoursPerWeek": hoursPerWeek,
    "insights.completionPercent": completionPercent(inp.base, inp.systems),
    "insights.finalPricePj": pjEstimate,
    "insights.finalPriceMike": round2(mikeEstimate),
    "insights.pjVsMikeDelta": round2(pjEstimate - mikeEstimate),
  };

  return {
    computed: { ...computed, excelGrid },
    systemsComputed,
    laborBuildUp: {
      compositePerHour: round2(composite),
      parkingPerHour: round2(parkingPerHour),
      liftsPerHour: round2(liftsPerHour),
      totalPerHourWithParkingAndLifts: round2(laborRateLoaded),
      totalLiftProject: round2(totalLiftProject),
    },
    errors,
    warnings,
  };
}
