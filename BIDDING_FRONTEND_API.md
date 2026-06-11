# Bidding API — Frontend Handoff

Backend for the **Base Bid** estimator. Everything below is live in the backend and DB-migrated.
Use this to wire up the bidding form, dropdowns, the wage/burden admin screens, and the live calculator.

- **Base URL:** same API host as the rest of the dashboard.
- **Auth:** every endpoint requires the standard JWT (`Authorization: Bearer <token>`), same as other modules.
- **Content type:** `application/json`.
- **Money/percent convention:** rates are decimals (e.g. `0.06` = 6%, `0.009` = 0.9%). Dollar amounts are plain numbers.

---

## 1. What's new in this release

| Area | Change |
|------|--------|
| **Wage rates** | Now fully CRUD-able (add / edit / soft-delete). Seeded with the Excel wage table. |
| **Payroll burden** | New config table `Bid_PayrollBurden` (Medicare, SS, SUTA, FUTA, WC, PFL, IRA, PPO, fringe, benefits) — fully CRUD-able. |
| **Auto-derived labor rate** | New endpoint converts a wage into a **burdened labor rate** (e.g. `$30` → `47.69`). No more typing the composite by hand. |

> Note: the per-tier burdened rate (`47.69`) is live. The single **crew-weighted composite** (`51.70`) is not yet auto-derived — for now the form can still send `laborRateCompositePerHour` on the Base Bid until that step ships.

---

## 2. Dropdown / lookup endpoints

All under `GET /lookups/bidding/*`. Use these to populate selects on the form.

| Method | Path | Returns |
|--------|------|---------|
| GET | `/lookups/our-entities` | **Reuse existing** — company list `{ id, name }[]` (GOEL / GOEL DC / DCB). Do **not** build a new one. |
| GET | `/lookups/bidding/teams` | Teams with crew roles |
| GET | `/lookups/bidding/wage-rates` | Wage/fringe options |
| GET | `/lookups/bidding/payroll-burden` | Burden constants |
| GET | `/lookups/bidding/states` | `{ stateCode, salesTaxRate }[]` |
| GET | `/lookups/bidding/project-types` | `{ id, name }[]` |
| GET | `/lookups/bidding/building-types` | `{ id, name }[]` |
| GET | `/lookups/bidding/preferences` | `{ id, name }[]` |

### Teams
```jsonc
// GET /lookups/bidding/teams
[
  {
    "id": 1, "teamName": "Wilder Rodriguez",
    "captain": "Wilder Rodriguez", "bidClerk": "Hassan Riaz",
    "duct1": "John Carlo Orpilla", "duct2": null,
    "hydronic1": "Jonathan Bruce", "hydronic2": "Brian Angelo Limon",
    "plumbing1": "Hennan Berberio", "plumbing2": "Mark Chua"
  }
]
```
Team admin:
- `POST /lookups/bidding/teams` body `{ "teamName": "New Team" }`
- `DELETE /lookups/bidding/teams/:id` (soft remove)

### Wage rates (CRUD)
```jsonc
// GET /lookups/bidding/wage-rates
[
  {
    "id": 1, "rateLabel": "NON-SCALE",
    "wage": 30, "fringe": 7.29, "total": 37.29,
    "displayLabel": "NON-SCALE - W: ($30 + F: $7.29) = Total of $37.29",
    "wageAsOf": "2026-03-03"
  }
]
```
| Method | Path | Body |
|--------|------|------|
| POST | `/lookups/bidding/wage-rates` | `{ rateLabel, wage, fringe, displayLabel?, wageAsOf? }` |
| PATCH | `/lookups/bidding/wage-rates/:id` | any subset of the above |
| DELETE | `/lookups/bidding/wage-rates/:id` | — (soft delete) |

- `total` and a default `displayLabel` are computed by the backend from `wage + fringe`; you don't need to send them.
- `wageAsOf` is ISO date `YYYY-MM-DD`.

### Payroll burden (CRUD)
```jsonc
// GET /lookups/bidding/payroll-burden
[
  { "id": 1, "code": "medicare", "label": "Medicare", "rateType": "pct_wage",
    "rate": 0.009, "annualCap": null, "hoursBasis": null, "includeInBaseRate": true },
  { "id": 3, "code": "suta", "label": "SUTA", "rateType": "capped_annual",
    "rate": 0.033, "annualCap": 9000, "hoursBasis": 1500, "includeInBaseRate": true },
  { "id": 8, "code": "ppo_health", "label": "PPO Health", "rateType": "per_hour",
    "rate": 2.4, "annualCap": null, "hoursBasis": null, "includeInBaseRate": true }
]
```
`rateType` is one of:
| rateType | Meaning | Per-hour amount |
|----------|---------|-----------------|
| `pct_wage` | percent of wage | `rate × wage` |
| `capped_annual` | capped annual tax | `(annualCap × rate) / hoursBasis` |
| `per_hour` | flat per-hour cost | `rate` |

| Method | Path | Body |
|--------|------|------|
| POST | `/lookups/bidding/payroll-burden` | `{ code, label, rateType, rate, annualCap?, hoursBasis?, includeInBaseRate? }` |
| PATCH | `/lookups/bidding/payroll-burden/:id` | any subset |
| DELETE | `/lookups/bidding/payroll-burden/:id` | — (soft delete) |

### Auto-derived burdened rate
```jsonc
// GET /lookups/bidding/wage-rates/:id/burdened-rate
{
  "wageRateId": 1, "rateLabel": "NON-SCALE",
  "wage": 30, "burdenedRate": 47.69, "totalBurden": 17.69,
  "lines": [
    { "code": "medicare", "label": "Medicare", "amountPerHour": 0.27 },
    { "code": "social_security", "label": "Social Security", "amountPerHour": 2.03 }
    // ... one line per active burden item
  ]
}
```
Call this when the user picks a wage rate to show the burdened rate + breakdown. `lines` is presentation-rounded; `burdenedRate` is the authoritative figure.

---

## 3. Bids (CRUD) — under `/bids`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/bids?status=&entityId=&search=` | List (all filters optional) |
| POST | `/bids` | Create a draft |
| GET | `/bids/:id` | Full detail (inputs + last computed) |
| PATCH | `/bids/:id` | Update header + Base Bid inputs + systems |
| DELETE | `/bids/:id` | Soft delete |
| POST | `/bids/:id/calculate` | Run the calc engine, returns + stores a snapshot |

### List item
```jsonc
// GET /bids
[
  {
    "id": "12", "estimateNumber": "IDC6098", "bidName": "Some Project",
    "status": "draft", "ourEntityId": 1, "companyName": "GOEL",
    "bidDate": "2026-03-01", "updatedAt": "2026-05-29T10:00:00.000Z"
  }
]
```
`status` is `draft | submitted | archived`. `id` is returned as a **string**.

### Create
```jsonc
// POST /bids
{ "ourEntityId": 1, "jobId": null, "estimateNumber": "IDC6098", "bidName": "Optional", "bidDate": "2026-03-01" }
```
Returns the full detail object (same shape as `GET /bids/:id`).

### Detail
```jsonc
// GET /bids/:id
{
  "id": "12", "estimateNumber": "IDC6098", "bidName": "...", "status": "draft",
  "ourEntityId": 1, "companyName": "GOEL", "jobId": null,
  "bidDate": "2026-03-01", "updatedAt": "...",
  "baseBid": { /* the saved Base Bid inputs (see §4) */ },
  "systems": [ /* the saved system rows (see §4) */ ],
  "computed": { /* last calculate() result, or {} if never run */ }
}
```

### Update (header + inputs)
`PATCH /bids/:id` accepts any subset. `baseBid` is **merged** into existing inputs; `systems` **replaces** the array.
```jsonc
{
  "status": "submitted",
  "baseBid": { "marginPercent": 0.15, "projectState": "MD", "wageRateLabel": "NON-SCALE" },
  "systems": [ { "key": "duct1", "used": true, "materials": 10000, "laborHours": 200, "mikeTotalPrice": 50000, "quantity": 1500 } ]
}
```

---

## 4. Base Bid input shape (`baseBid`)

All fields optional; send what the form has. Percent fields are decimals.

| Field | Type | Notes |
|-------|------|-------|
| `marginPercent` | number | e.g. `0.15` |
| `projectState` | string | state code, drives sales tax |
| `salesTaxApplicable` | boolean | |
| `stateSalesTaxRate` | number | optional override; else resolved from `projectState` |
| `hoursPerDay` / `daysPerWeek` | number | schedule |
| `durationMonths` / `startInMonths` | number | schedule |
| `bidDate` | string | `YYYY-MM-DD` |
| `gsfOfBuilding` | number | |
| `parking` | boolean | + `parkingCostPerDay`, `parkingPeoplePercent` |
| `liftsNeeded` | boolean | + `liftPercentage`, `liftCostPer4Weeks` |
| `averageNoPeople` | number | optional crew-size override |
| `materialEscalationPerYear` | number | e.g. `0.04` |
| `laborRateCompositePerHour` | number | composite (until auto-derive ships) |
| `teamName` / `assistantEstimator` | string | |
| `projectType` / `buildingType` / `preference` | string | from lookups |
| `wageRateLabel` | string | selected wage rate label |
| `ccipCoversWc` / `citizenProject` / `apprenticeable` / `pla` | boolean | flags |

### System row (`systems[]`)
| Field | Type | Notes |
|-------|------|-------|
| `key` | enum | one of `duct1, duct2, hydronic1, hydronic2, plumbing1, plumbing2, vrf, equipment` |
| `used` | boolean | include in totals |
| `mikeEstimateNumber` | number | reference |
| `materials` | number | materials before escalation |
| `laborHours` | number | |
| `mikeTotalPrice` | number | total price per MIKE |
| `quantity` | number | LF/SF |

---

## 5. Calculate — client engine + optional `POST /bids/:id/calculate`

**Frontend (current):** Base Bid math runs in the **browser** (`CLIENT_ENGINE_VERSION` in `src/lib/bidding/snapshot.ts`). On **Save**, the client sends `computed` on `PATCH /bids/:id` — the backend stores it verbatim. **Preview calculate** updates the UI locally without saving.

**Legacy server calculate** — still available but not used for normal saves:
```jsonc
{
  "version": "1.0.0",
  "computed": {
    "baseBid.mikeEstimate": 43837.68,
    "baseBid.pjEstimate": 47600,
    "baseBid.costPerHourMike": 0,
    "baseBid.costPerHourPj": 0,
    "baseBid.marginPercent": 0.15,
    "baseBid.costPerHourBeforeMargin": 0,
    "baseBid.marginPerHour": 0,
    "labor.totalHours": 0,
    "labor.parkingPerHour": 0,
    "labor.liftsPerHour": 0,
    "labor.materialEscalationFactor": 0,
    "labor.salesTaxPercent": 0,
    "insights.completionPercent": 70
  },
  "errors": [ { "field": "...", "message": "..." } ],
  "warnings": [ "..." ]
}
```
- Keys are **dot-namespaced** (`baseBid.*`, `labor.*`, `insights.*`) — map them straight to the UI sections.
- `insights.completionPercent` drives the progress bar.
- Re-fetch `GET /bids/:id` afterward and read `computed` to show the last result on load.

---

## 6. Suggested UI wiring (implemented)

1. **On bid open:** `GET /bids/:id` → hydrate form from `baseBid` + `systems`, show last `computed` (or run client engine if empty).
2. **Lookups:** load `/lookups/bidding/*` + `our-entities` once via `useBiddingLookups`.
3. **On wage-rate select:** `GET /lookups/bidding/wage-rates/:id/burdened-rate` → fill composite (D10) + show breakdown.
4. **On save:** run client engine → `PATCH /bids/:id` with `baseBid`, `systems`, and `computed` snapshot.
5. **Layout:** 3:1 form (left) + sticky results rail (right) at 1280px+.
6. **Admin (later):** wage-rate and payroll-burden CRUD tables using POST/PATCH/DELETE in §2.

---

## 7. DB migration (for the backend/devops, not frontend)

One file: `scripts/sql/add-bidding-tables.sql` (idempotent). Run via `npm run bidding-migrate`. Already applied in this environment.
