# Bidding Base Bid — Excel parity (BiddingSheet.xlsx)

**Engine version:** `1.2.0` (`CLIENT_ENGINE_VERSION`)  
**Golden bid:** `IDC6098` on tab **Base Bid**  
**Automated checks:** `npm run test:bidding` · `npm run verify:bidding-excel`

---

## Verdict

With **correct inputs** in the system grid (Excel rows 17–21, columns B–I), the TypeScript engine matches the workbook within **$0.02** on every authoritative total (H47, H48, H37, I45–I48, C45, D45, D10–D13, J7).

Your screenshot totals (**$6.6k MIKE**, **$3.2M PJ**, **43,837 hrs**) are **not** an engine bug — they are **row 19/20/21 values shifted** (MIKE $ in Labor hrs, Quantity in MIKE $). See `docs/BIDDING_GOLDEN_TEST_IDC6098.md` §5.

---

## Excel ↔ API system columns

| Excel input col | API `systems[].key` | Row 23 “used” in IDC6098 |
|-----------------|---------------------|--------------------------|
| B | `duct1` | Yes |
| C | `duct2` | No |
| D | `hydronic1` | Yes |
| E | `hydronic2` | No |
| F | `plumbing1` | Yes (no dollars — 0 hrs) |
| G | `plumbing2` | No |
| H | `vrf` | — |
| I | `equipment` | — |

Subtotals for duct1 appear in calc column **C** (rows 41–45); hydronic1 in **D** — inputs still live in **B** and **D**.

---

## Formulas ported (authoritative path)

| Excel | Formula | Engine |
|-------|---------|--------|
| D11 | `Parking_cost / Hours_per_day` if parking Yes | `labor.parkingPerHour` |
| D12 | `Total_Lift / Total_Hours` if lifts Yes | `labor.liftsPerHour` |
| D13 | `D10+D11+D12` | `laborBuildUp.totalPerHourWithParkingAndLifts` |
| J7 | `Lift_% * Lift_cost * Months * (4.4/4) * Avg_people` | `labor.totalLiftProject` (always; D12 gates $/hr) |
| H11 | `(YEAR(B11)-YEAR(B2))*H10` | `labor.materialEscalationFactor` |
| C41 | `C37 * SUM(C38:C40)` | per-system `laborTotal` |
| C43–C44 | mat × esc; (mat+esc)×tax | per-system escalation + tax |
| C45 | `SUM(C41:C44)` | per-system `subtotal` |
| I45 | `ROUNDUP(H45/H37,2)` | `baseBid.costPerHourBeforeMargin` |
| I46 | `ROUNDUP(-I45+I45/(1-Margin),2)` | `baseBid.marginPerHour` |
| H47 | `ROUNDUP(I47*H37,-2)` | `baseBid.pjEstimate` |
| H48 | `J20` (sum row 20) | `baseBid.mikeEstimate` |
| I48 | `H48/H37` | `baseBid.costPerHourMike` |
| H8 | `ROUND(B12*1950/12*H7,0)` | `labor.manHoursPeriod` |
| H46 | `I46*J19` | `baseBid.totalMarginDollars` |

---

## Not ported (Excel rows 24–33 per-system $/hr stack)

Rows **24–33** build an alternate per-system **hourly cost stack** (B30, B33, J33). **Displayed bid totals use rows 37–45**, not J33. The web UI uses the 37–45 path only.

| Excel | Status |
|-------|--------|
| Rows 24–33 per-system cost/hr | Not in engine (display-only in Excel) |
| Labor Costs → auto `D10` | Manual / wage select → `laborRateCompositePerHour` |
| Startup / Proposal tabs | Out of scope |
| H49 FINAL PRICE product choice | Not implemented |

---

## IDC6098 expected totals (copy/paste checklist)

See **`docs/BIDDING_GOLDEN_TEST_IDC6098.md`** for full inputs.

| Metric | Excel |
|--------|------:|
| MIKE (H48) | $43,837.68 |
| PJ (H47) | $47,600.00 |
| Labor hrs (H37) | 487.59 |
| Cost/hr MIKE (I48) | $89.91 |
| Cost/hr PJ (I47) | $97.62 |

---

## Maintenance

1. Change `BiddingSheet.xlsx` → bump `CLIENT_ENGINE_VERSION` → update `fixtures/idc6098-golden.ts` → run both npm scripts.
2. Formula source of truth in code: `src/lib/bidding/engine/excel-spec.ts`, `calculate.ts`.
