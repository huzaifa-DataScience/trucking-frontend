import { describe, expect, it } from "vitest";
import { calculateBaseBid } from "./calculate";
import type { BidDetail } from "../types";

describe("calculateBaseBid", () => {
  it("computes PJ and MIKE totals from used systems", () => {
    const bid: BidDetail = {
      id: "1",
      estimateNumber: "IDC6098",
      bidName: "Test",
      status: "draft",
      ourEntityId: 1,
      companyName: "GOEL",
      bidDate: "2026-03-01",
      updatedAt: "",
      jobId: null,
      baseBid: {
        marginPercent: 0.25,
        hoursPerDay: 8,
        daysPerWeek: 5,
        durationMonths: 2,
        startInMonths: 0,
        materialEscalationPerYear: 0.04,
        laborRateCompositePerHour: 51.7,
        parking: true,
        parkingCostPerDay: 25,
        liftsNeeded: false,
        projectState: "DC",
        salesTaxApplicable: true,
        stateSalesTaxRate: 0.06,
      },
      systems: [
        {
          key: "duct1",
          used: true,
          materials: 3268.95,
          laborHours: 228.52,
          mikeTotalPrice: 19515.92,
          quantity: 5455.98,
        },
        {
          key: "hydronic1",
          used: true,
          materials: 5187.54,
          laborHours: 259.07,
          mikeTotalPrice: 24321.76,
          quantity: 1129.84,
        },
      ],
      computed: {},
    };

    const result = calculateBaseBid(bid, { salesTaxRateByState: { DC: 0.06 } });
    expect(result.computed["labor.totalHours"]).toBeGreaterThan(0);
    expect(result.computed["baseBid.mikeEstimate"]).toBeCloseTo(43837.68, 0);
    expect(result.computed["baseBid.pjEstimate"]).toBeGreaterThan(0);
    expect(result.laborBuildUp.parkingPerHour).toBeCloseTo(3.125, 2);
  });
});
