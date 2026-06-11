import type { BaseBidInput, BidSystemKey, BidSystemRow } from "../types";

export interface EngineLookups {
  salesTaxRateByState?: Record<string, number>;
}

export interface SystemComputed {
  key: BidSystemKey;
  used: boolean;
  laborHours: number;
  materials: number;
  laborTotal: number;
  materialEscalation: number;
  materialSalesTax: number;
  subtotal: number;
}

export interface LaborBuildUp {
  compositePerHour: number;
  parkingPerHour: number;
  liftsPerHour: number;
  totalPerHourWithParkingAndLifts: number;
  totalLiftProject: number;
}

export interface BaseBidEngineResult {
  /** Scalar keys plus `excelGrid` (A1:J49 cell map). */
  computed: Record<string, unknown>;
  systemsComputed: SystemComputed[];
  laborBuildUp: LaborBuildUp;
  errors: { field: string; message: string }[];
  warnings: string[];
}

export interface NormalizedInputs {
  base: BaseBidInput;
  systems: BidSystemRow[];
  margin: number;
  hoursPerDay: number;
  daysPerWeek: number;
  durationMonths: number;
  startInMonths: number;
  materialEscalationPerYear: number;
  salesTaxPercent: number;
  compositePerHour: number;
}
