# Golden test — IDC6098 (from `BiddingSheet.xlsx`)

Use these values on **`/bidding/new`** then the Base Bid sheet to confirm the client calculator matches Excel (within **$0.01** on totals).

**Source:** `Base Bid` tab, filled sample bid **IDC6098** (cached formula results in the workbook).

---

## 1. Header (estimate record)

| Field | Value |
|-------|--------|
| Estimate number | `IDC6098` |
| Bid / project name | `SCU Replacement Basement to 6th Floor, East & West` |
| Bid date | `2026-04-29` |
| Company bidding | **Goel Services, Inc.** (pick matching `ourEntityId` in dropdown) |

---

## 2. Team & schedule

| Field | Value | Notes |
|-------|--------|--------|
| Team | `Bil Shams` | Lookup |
| Assistant estimator | `Assistant Estimator` | |
| Project state | `DC` | Sets sales tax **6%** from lookup |
| Margin | `0.25` | Decimal = 25% |
| Hours / day | `8` | |
| Days / week | `5` | |
| Duration (months) | `2` | |
| Start in # months from bid | `6` | |
| Project type | `New Construction with deep shoring - small` | Lookup |
| Building type | *(optional — not filled in xlsx)* | |
| Preference | *(optional — placeholder in xlsx)* | |
| GSF of building | *(optional — placeholder in xlsx)* | |
| Material escalation / year | `0.04` | 4% |
| Sales tax applicable | **Yes** | |
| PLA | **No** | Excel `H3` = No (not the `G3` label cell) |
| Backcheck hours | *(optional — placeholder in xlsx)* | |

---

## 3. Wage rate & flags

| Field | Value |
|-------|--------|
| Wage rate | **NON-SCALE** — select the row whose label matches `NON-SCALE - W: ($30 + F: $7.29) = Total of $37.29` |
| Labor rate composite / hr | **`51.7`** | Excel `D10` / Labor Costs `F25`; auto-fills if burdened rate rounds to 51.7 — **confirm 51.7** after wage select |
| CCIP covers WC | No |
| Citizen project | No |
| Apprenticeable | Yes |

**Burden panel (F9–F11):** wage **$30**, fringe **$7.29**, total **$37.29** (from lookup).

---

## 4. Parking & lifts

| Field | Value |
|-------|--------|
| Parking | **Yes** |
| % people that park | **`1`** | Excel `J10` = 100% |
| Parking cost / day | **`25`** |
| Lifts needed | **No** |
| Lift % | `1` | Ignored when lifts off |
| Lift cost / 4 weeks | `550` | |
| Average # people | **`1.5`** | Excel cached `H7` (formula); API field `averageNoPeople` |

---

## 5. Systems — column order (common mistake)

The web grid matches Excel **rows 17–21**. Each value must go in the **labeled** column:

| Excel row | Column on web | Duct 1 example | Wrong column symptom |
|-----------|---------------|----------------|----------------------|
| 17 | R17 MIKE # | `7969.02` | (optional reference #) |
| 18 | R18 Materials | `3268.95` | |
| **19** | **R19 Labor hrs** | **`228.52`** | If you put `19515.92` here → PJ ≈ **$3.2M** |
| **20** | **R20 MIKE $** | **`19515.92`** | If you put `5455.98` here → MIKE ≈ **$6.6k** |
| 21 | R21 Qty | `5455.98` | |

If your totals look like **43,837 hours** and **$6,586 MIKE**, you shifted values one column to the right.

---

## 6. Systems (only these trades are used in Excel)

Check **Include** and enter:

### Duct 1 ✅

| Field | Value |
|-------|--------|
| MIKE est # | `7969.02` |
| Materials | `3268.95` |
| Labor hrs | `228.52` |
| MIKE total | `19515.92` |
| Quantity | `5455.98` |

### Hydronic 1 ✅

| Field | Value |
|-------|--------|
| MIKE est # | `7969.04` |
| Materials | `5187.54` |
| Labor hrs | `259.07` |
| MIKE total | `24321.76` |
| Quantity | `1129.84` |

### All other systems ❌

Leave **unchecked** (Duct 2, Hydronic 2, Plumbing 1 & 2, VRF, Equipment).

> Excel row 23 marks Plumbing 1 “Yes” with **no** dollar inputs; subtotals are **$0** there. For parity with MIKE/PJ totals, **leave Plumbing 1 off** in the web app.

---

## 7. Expected results (after **Preview calculate** or **Save & calculate**)

Compare to Excel **cached** totals (`H47`–`H48`, `I45`–`I48`, `H37`):

| Metric | Excel | Web `computed` key |
|--------|------:|---------------------|
| MIKE estimate | **43,837.68** | `baseBid.mikeEstimate` |
| PJ estimate | **47,600.00** | `baseBid.pjEstimate` |
| Cost / hr (MIKE) | **89.91** | `baseBid.costPerHourMike` |
| Cost / hr (PJ) | **97.62** | `baseBid.costPerHourPj` |
| Total labor hours | **487.59** | `labor.totalHours` |
| Cost / hr before margin | **73.21** | `baseBid.costPerHourBeforeMargin` |
| Margin / hr | **24.41** | `baseBid.marginPerHour` |
| Material escalation factor | **0** | `labor.materialEscalationFactor` |
| Sales tax % | **6%** (`0.06`) | `labor.salesTaxPercent` |
| Parking / hr | **3.125** | `labor.parkingPerHour` |
| Lifts / hr | **0** | `labor.liftsPerHour` |
| Loaded labor / hr (D13) | **54.825** | `laborBuildUp.totalPerHourWithParkingAndLifts` |

### Per-system subtotals (breakdown table)

| System | Subtotal (≈) |
|--------|-------------:|
| duct1 | **15,993.70** |
| hydronic1 | **19,702.31** |

---

## 8. Quick test steps

1. Create bid with header §1.
2. Enter §2–§5.
3. Select wage rate → verify composite **51.7** (adjust if burden API differs).
4. Click **Preview calculate** — check §6.
5. **Save & calculate** → reload bid → totals unchanged.
6. Optional: **Mark submitted** → confirm lock → **Reopen as draft**.

---

## 9. If numbers don’t match

| Symptom | Check |
|---------|--------|
| PJ/MIKE off | Composite not **51.7**; wrong systems included |
| Tax off | State **DC**, sales tax applicable **Yes**, rate **0.06** |
| Hours off | Only duct1 + hydronic1 checked with hrs above |
| Escalation off | Bid date + start months + duration (expect **0** for this sample) |

Client engine v**1.2.0** is verified automatically:

```bash
npm run test:bidding
npm run verify:bidding-excel
```

See **`docs/BIDDING_EXCEL_PARITY.md`** for the full formula audit.
