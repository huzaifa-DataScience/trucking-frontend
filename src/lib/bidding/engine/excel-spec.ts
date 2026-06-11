/**
 * Base Bid sheet — cell ↔ API mapping from BiddingSheet.xlsx.
 * Subtotal block (authoritative for H47/H48): rows 37–45, cols C–H.
 * Input grid: rows 17–23, cols B–I.
 */

import type { BidSystemKey } from "../types";

export const EXCEL_HOURS_PER_MONTH = 1950 / 12;
export const EXCEL_LIFT_MONTH_FACTOR = 4.4 / 4;

/** Input column on Base Bid row 15–23 for each API system key. */
export const EXCEL_INPUT_COLUMN: Record<BidSystemKey, string> = {
  duct1: "B",
  duct2: "C",
  hydronic1: "D",
  hydronic2: "E",
  plumbing1: "F",
  plumbing2: "G",
  vrf: "H",
  equipment: "I",
};

/** Subtotal display column in rows 37–45 (duct1→C, hydronic1→D, …). */
export const EXCEL_SUBTOTAL_COLUMN: Record<BidSystemKey, string> = {
  duct1: "C",
  duct2: "C",
  hydronic1: "D",
  hydronic2: "D",
  plumbing1: "E",
  plumbing2: "E",
  vrf: "F",
  equipment: "G",
};

export const EXCEL_FORMULAS = {
  /** D10 = labor_rate (Labor Costs F25) */
  compositePerHour: "D10",
  /** D11 = IF(Parking=Yes, Parking_cost/Hours_per_day, 0) */
  parkingPerHour: "D11",
  /** D12 = IF(Lifts, Total_Lift/Total_Hours, 0) */
  liftsPerHour: "D12",
  /** D13 = D10+D11+D12 */
  loadedLaborPerHour: "D13",
  /** H11 = (YEAR(B11)-YEAR(B2))*H10 */
  materialEscalationFactor: "H11",
  /** H37 = SUM(C37:G37) — includes H19/I19 via F37/G37 */
  totalLaborHours: "H37",
  /** J19 — hour rollup used for H7 personnel */
  totalLaborHoursRollup: "J19",
  /** I45 = ROUNDUP(H45/H37, 2) */
  costPerHourBeforeMargin: "I45",
  /** I46 = ROUNDUP(-I45+I45/(1-Margin), 2) */
  marginPerHour: "I46",
  /** I47 = I45+I46 */
  costPerHourPj: "I47",
  /** H47 = ROUNDUP(I47*H37, -2) */
  pjEstimate: "H47",
  /** H48 = J20 */
  mikeEstimate: "H48",
  /** I48 = H48/H37 */
  costPerHourMike: "I48",
  /** C41 = C37*SUM(C38:C40) — labor $ per system */
  systemLaborTotal: "C41",
  /** C45 = SUM(C41:C44) */
  systemSubtotal: "C45",
} as const;
