# Bidding sheet product scope — Base Bid **A1:J49**

**Source:** `BiddingSheet.xlsx` tab **Base Bid**, columns **A–J**, rows **1–49** only.  
**Out of scope:** columns K+ on Base Bid, and all other tabs (Labor Costs, Startup, VRF and Lists, Mike quantities, etc.) — **lookup / reference material**; data comes from **`/lookups/bidding/*`** APIs, not from copying those sheets into the UI.

---

## How the web app maps to the grid

| Excel zone | Rows | Web app today |
|------------|------|----------------|
| **Header & mirrors** | 1–2 | Results rail: H1/J1 (MIKE/PJ), H2/J2 ($/hr) |
| **Project & team inputs** | 3–13 | Left form + team roster when team selected |
| **“INPUT FIELD” label** | 14 | — (section divider only) |
| **Systems grid** | 15–23 | Systems table (cols B–I = `duct1`…`equipment`) |
| **$/hr build-up (detail)** | 24–33 | **Not shown as Excel grid**; math differs from rows 37–45 |
| **Subtotal block** | 36–45 | **Engine uses this path**; rail shows totals + per-system subtotal |
| **Final bid** | 46–49 | **Engine:** H46–H48, I45–I48; rail hero + detail |

---

## Row-by-row checklist (A1:J49)

Legend: **Input** = user types | **Lookup** = from team/wage/state APIs | **Calc** = formula | **UI** = on web form | **Results** = results rail after calculate

### Rows 1–2 — Top summary
| Cells | Type | Engine | UI |
|-------|------|--------|-----|
| B1, D1, B2, D2 | Input | — | Form (header) |
| F2, C3, D4 | Input | margin in calc | Form |
| G3/H3 PLA | Input | — | Form (`pla` ← H3) |
| H1, J1, H2, J2 | Calc | ✅ | Results rail |

### Rows 3–7 — Schedule & crew
| Cells | Type | Engine | UI |
|-------|------|--------|-----|
| A4, B4, C4 | Lookup (team) | — | Team block (captain/clerk) |
| B5, D5, F4, F5, E7 | Input | ✅ | Form |
| F6 | Calc | ✅ `hours/day × days/week` | Results (F6) |
| G5 preference, G4 category | Input / placeholder | preference ✅ | Form; **category not in xlsx cell** |
| G7 label, **H7** avg people | Calc / override | H7 formula or input override | Form input `averageNoPeople` |
| H8 man-hours | Calc | ✅ | Results |
| J4–J6 lifts | Input | J7 ✅, D12 gated | Form |
| J7 total lift $ | Calc | ✅ | Results |

### Rows 8–13 — Wage, escalation, tax, labor stack labels
| Cells | Type | Engine | UI |
|-------|------|--------|-----|
| B8 wage label | Input | D10 via composite | Wage dropdown |
| F8–F13 flags | Input | — | Form |
| F9–F11 wage/fringe/total | Lookup | burden API | Wage panel (not F9–F11 row layout) |
| H10, H12, G12–G13 labels | Input | H11, H13 ✅ | Form |
| **B10, B11** work dates | Calc | ✅ stored | Engine only (not prominent in rail) |
| **D10–D13** | Calc | ✅ | Results (labor build-up) |
| J9–J11 parking | Input | D11 ✅ | Form |

### Rows 14–23 — Systems (cols B–I)
| Row | A label | Input cols | Engine | UI |
|-----|---------|------------|--------|-----|
| 15–16 | System / personnel | — | lookup B16–G16 | Labels + team leads |
| 17 | MIKE est # | B,D,… | **not in formulas** | Form column (stored) |
| 18 | Materials | B,D,… | ✅ row 42 path | Form |
| 19 | Labor hrs | B,D,… | ✅ | Form |
| 20 | MIKE total $ | B,D,… | ✅ H48 | Form |
| 21 | Quantity | B,D,… | **not in formulas** | Form (stored) |
| 22 | Qty this sheet | Calc | ❌ | ❌ |
| 23 | Who was used | B–G | ✅ | Checkbox |
| J18–J20 | Rollups | Calc | ✅ | Results (totals) |

### Rows 24–33 — Per-system $/hr stack (cols B–J)
| Rows | A labels | Engine | UI |
|------|----------|--------|-----|
| 24–33 | Labor/parking/lifts/mat $/hr, margin, price | **Not ported** | **Not shown** |

Excel still shows **H47/H48 from rows 37–45**, not from J33. The app matches **37–45**, not the 24–33 grid.

### Rows 36–45 — Subtotals (authoritative)
| Rows | Engine | UI |
|------|--------|-----|
| 37–40 labor hrs & $/hr | ✅ | Partial (hrs total + build-up; not full C–H grid) |
| 41–44 labor $, mat, esc, tax | ✅ per system | Results: subtotal per trade |
| 45 subtotal | ✅ | Results |
| H45, I45 | ✅ | Results |

### Rows 46–49 — Final
| Cells | Engine | UI |
|-------|--------|-----|
| C46 margin echo | echo input | Results % |
| H46 total margin $ | ✅ | Results |
| I46, I47, H47 | ✅ | Results |
| H48, I48 | ✅ | Results hero |
| **A49 / H49 FINAL PRICE** | ❌ | ❌ |

---

## What “everything in A1:J49” means for engineering

### Tier 1 — Must match Excel numbers (done for IDC6098)
- Totals path: **J19/J20, H37, rows 41–45, I45–I48, H47–H48, D10–D13, J7, H8, H11, H46**
- Tests: `npm run test:bidding`, `npm run verify:bidding-excel`

### Tier 2 — All **inputs** in A1:J49 (mostly done)
- Missing/low: **G4 category** (placeholder in sample), **row 17** in calc (field exists)

### Tier 3 — Show **every calculated cell** in A1:J49 on screen (not done)
- Need a **grid mirror** or expanded results sections for:
  - Rows **24–33** (per column B–J)
  - Rows **37–45** (C–H per system, not only subtotal)
  - **B10/B11**, **B22**, **H49**
  - **F9–F11** in Excel positions (optional; data exists in wage panel)

### Tier 4 — Other sheets (helping material)
- **Labor Costs** → only need **`labor_rate` → D10** (today: wage select + composite 51.7)
- **VRF and Lists** → project type, building type, states, preferences (lookups ✅)
- **Teams** → `Z:AH` replaced by API ✅

---

## Recommended next build (if goal = full A1:J49 UI)

1. **“Base Bid grid” read-only panel** — after calculate, render rows 24–33 and 37–45 in Excel layout (A label + B–J), scroll-sync optional.  
2. **Work dates** — show B10/B11 in results rail.  
3. **Row 22 + H49** — small formulas if estimators use them.  
4. **Optional:** port rows 24–33 into engine for estimators who compare to J33 — only if they insist J33 not H47.

---

## Summary for product

| Question | Answer |
|----------|--------|
| Is scope **A1:J49** only? | **Yes** — treat that as the product surface. |
| Are other sheets ignored? | **Yes** — as reference; APIs replace embedded tables. |
| Do totals match Excel? | **Yes** (37–45 path), verified on IDC6098. |
| Does UI show every cell in A1:J49? | **No** — inputs ~yes; **rows 24–33 grid** and **full 37–45 grid** not mirrored yet. |
