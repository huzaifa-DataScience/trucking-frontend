import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateBaseBid } from "./calculate";
import {
  IDC6098_ENGINE_LOOKUPS,
  IDC6098_GOLDEN_BID,
  IDC6098_GOLDEN_EXPECTED,
} from "./fixtures/idc6098-golden";

const TOL = 0.02;

function near(actual: number, expected: number, tol = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${expected}, got ${actual} (Δ ${actual - expected})`
  );
}

test("IDC6098 golden — matches BiddingSheet.xlsx Base Bid totals", () => {
  const result = calculateBaseBid(IDC6098_GOLDEN_BID, IDC6098_ENGINE_LOOKUPS);
  const c = result.computed;

  for (const [key, expected] of Object.entries(IDC6098_GOLDEN_EXPECTED)) {
    if (key === "systemsSubtotals") continue;
    const actual = c[key];
    assert.equal(typeof actual, "number", `${key} should be a number`);
    near(actual as number, expected as number);
  }

  for (const [key, expected] of Object.entries(IDC6098_GOLDEN_EXPECTED.systemsSubtotals)) {
    const row = result.systemsComputed.find((r) => r.key === key);
    assert.ok(row?.used, `${key} should be used`);
    near(row!.subtotal, expected);
  }

  const lb = result.laborBuildUp;
  near(lb.compositePerHour, 51.7);
  near(lb.parkingPerHour, 3.125);
  near(lb.liftsPerHour, 0);
  near(lb.totalPerHourWithParkingAndLifts, 54.825);
});
