# Bidding module — frontend design specification

**Audience:** product, design, frontend.  
**Prototype routes:** `/bidding`, `/bidding/new`, `/bidding/[id]/*`  
**Backend spec:** share `trucking/BIDDING_SHEET.md` + `BiddingSheet.xlsx` (backend repo + xlsx at frontend repo root).

---

## Design intent

| Principle | How we apply it |
|-----------|------------------|
| **Formal** | White cards on `#f0f1f4` canvas, ink typography, brand orange only as accent — same as Job/Billings dashboards. |
| **Insightful** | Persistent **insight strip**: MIKE vs PJ, delta %, margin, completion — not buried in Excel cells. |
| **Not overdone** | No charts-for-charts-sake; one progress bar, color only when delta &gt; ~12%. |
| **Motion with purpose** | Fade-in on step change, flash on computed value change, shimmer only while recalculating. Respects `prefers-reduced-motion`. |

---

## Visual system (reuse existing brand)

- **Canvas:** `bg-canvas` (`#f0f1f4`)
- **Cards:** `rounded-2xl`, `border-ink/[0.08]`, soft shadow
- **Accent:** `--brand` `#FF7B11`, `--brand-secondary` `#F26620`
- **Type:** Geist (already in root layout); money in `font-mono` for alignment
- **Motion classes:** `bid-animate-in`, `bid-stagger`, `bid-recalc-pulse`, `bid-shimmer-bar` in `globals.css`

---

## Information architecture

```text
/bidding                    → List (cards + filters)
/bidding/new                → Create estimate (minimal fields)
/bidding/[id]/startup       → Wizard step 1
/bidding/[id]/base-bid      → Wizard step 2 (+ live computed totals)
/bidding/[id]/labor         → Wizard step 3
/bidding/[id]/review        → Wizard step 4 (proposal preview + checklist)
```

**Sidebar:** Workspace dropdown → **Bidding sheet** (third module alongside Operations & Billing). Nav item: **Bidding sheet** → `/bidding`.

---

## Key components

| Component | Role |
|-----------|------|
| `BidInsightStrip` | Top KPI row on every wizard step |
| `BidWizardSteps` | Horizontal stepper with done/active states |
| `BidWizardLayout` | Shell: back link, header, insights, steps, content |
| `ComputedField` | Read-only calc; brief brand flash on change |
| `BidFormField` | Label + input/select with shared focus ring |
| `BidListCard` | List view card with MIKE/PJ/delta + progress |
| `BidStatusBadge` | Draft / in review / submitted / won / lost |

---

## Insight strip (what estimators see at a glance)

1. **MIKE estimate** + cost/hr sublabel  
2. **PJ estimate** + cost/hr (brand accent bar)  
3. **PJ vs MIKE** — dollar + percent delta; amber if &gt; 12% gap  
4. **Margin** + wage total context  
5. **Bid progress** — % complete + bar (shimmer when `isRecalculating`)

When backend ships: drive from `POST /bids/:id/calculate` → `computed.*` keys.

---

## Interaction patterns

| Action | UX |
|--------|-----|
| Change team / wage / margin | Debounce 300ms → PATCH → POST calculate → update insight strip + `ComputedField`s |
| Recalculating | `isRecalculating` on insights; pulse on base-bid computed grid (prototype simulates 900ms) |
| Step navigation | Stepper links; optional “Continue” in sticky aside on startup |
| New bid | Estimate #, name, company → redirect to startup |
| List | Search + status chips; cards hover lift |

---

## Layout patterns

- **List:** Responsive card grid (1 / 2 / 3 columns).  
- **Wizard:** Full-width insight + stepper; form in 2-col grid where helpful; **sticky aside** on startup for tips + CTA.  
- **Base bid:** Computed totals **above** inputs so PJ/MIKE never off-screen.  
- **Labor:** Table with hover row highlight; footer total.  
- **Review:** Hero card with PJ total; checklist for phase-2 sections (quantities, exclusions).

---

## Animation reference

```css
/* globals.css */
bid-fade-up     — page/section enter (450ms ease-out)
bid-stagger     — list cards / insight columns (55ms steps)
bid-recalc-pulse — orange ring while calculating
bid-shimmer-bar — progress bar during recalc
```

Disable all when `prefers-reduced-motion: reduce`.

---

## API wiring (when ready)

```typescript
// src/lib/api/endpoints/bidding.ts (to add)
getBids() / getBid(id) / patchBid(id) / calculateBid(id)
getBiddingLookups() // teams, wage-rates, states, …
```

Map `computed.baseBid.pjEstimate` etc. to `BidInsightStrip` and `ComputedField` values.

---

## Phase alignment

| UI phase | Screens | Backend dependency |
|----------|---------|-------------------|
| **Now (prototype)** | All routes with mock data | None |
| **P1** | List + CRUD forms, no live calc | Bid CRUD + lookups |
| **P2** | Live `ComputedField` + insight strip | `POST /calculate` |
| **P3** | Quantities grid, PDF export | Quantity lines + export |

---

## Files added (prototype)

```text
src/lib/bidding/types.ts
src/lib/bidding/mock-data.ts
src/components/bidding/*
src/app/(dashboard)/bidding/**
src/app/globals.css          — bidding motion utilities
BIDDING_FRONTEND_DESIGN.md   — this doc
```

---

*Matches executive dashboard patterns in `PageHeader`, `Card`, `KPICards`; extends them for estimator workflow.*
