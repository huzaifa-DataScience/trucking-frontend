# Bidding module — implementation specification

> **Backend handoff:** Share **`/Users/apple/trucking/BIDDING_SHEET.md`** + **`BIDDING_NAMED_RANGES.md`** + `BiddingSheet.xlsx` with the NestJS team. This file adds frontend-specific routes and components.

This document is the **build plan** for replacing `BiddingSheet.xlsx` with a web application. It is derived from parsing the workbook in-repo (`BiddingSheet.xlsx`) and aligns with existing patterns in this frontend (Next.js, JWT API client, `CompanyContext` / `Ref_OurEntities`).

**Audience:** frontend, backend, and product.

**Related assets:**

| Asset | Location |
|-------|----------|
| Excel source of truth (pilot) | `BiddingSheet.xlsx` (repo root) |
| Logistics company filter | [FRONTEND_COMPANY_FILTER.md](./FRONTEND_COMPANY_FILTER.md) (this folder) |
| Backend conventions | [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) (this folder) |

---

## 1. Goals and non-goals

### Goals

1. Estimators (PJ, bid clerks, captains) **fill in a bid** via forms — same inputs as Excel.
2. **Dropdowns** load from database lookup tables (replacing Excel named ranges / list sheets).
3. When any input changes, **dependent fields recalculate** (wage + fringe → total, labor → cost/hr, bid totals, etc.).
4. **Save and reopen** bids by estimate number.
5. **Server-side calculation** is authoritative (frontend may preview for UX).

### Non-goals (initial releases)

- Bit-perfect Excel macro/VBA (none detected in file).
- Full **Followup** CRM replacement in MVP (optional phase).
- Automatic import of every historical Excel bid (one golden bid for testing only).
- Replacing Siteline billings module (separate; see [FRONTEND_SITELINE.md](./FRONTEND_SITELINE.md)).

### Definition of “working”

- User can complete **Startup → Base Bid → Labor** for a new estimate.
- Changing **Team**, **State**, **Wage rate category**, **hours**, **margin** updates downstream numbers without manual refresh bugs.
- Totals match Excel for **one completed reference bid** within $0.01 per line (documented in test fixtures).

---

## 2. Workbook inventory (source analysis)

**File:** `BiddingSheet.xlsx`  
**Format:** `.xlsx`, 13 worksheets, **~1,678 formula cells**, **~240 defined names** (12 broken `#REF!` names — see §12).

| # | Sheet | Range (approx) | Formulas | Role |
|---|--------|----------------|----------|------|
| 1 | **Startup** | A1:O71 | 14 | Project startup: job, contractor, addresses, company/domain matrix, bonding |
| 2 | **Base Bid** | A1:AH70 | 189 | Bid header, team, wage table, margin, lifts, MIKE/PJ estimates, cost/hr |
| 3 | **Budget** | A1:X15 | 1 | Small rollup budget |
| 4 | **Labor Costs** | large | 123 (+ cross-sheet) | Labor summary; feeds worksheet |
| 5 | **Labor Costs Worksheet** | very large | **953** (+ cross-sheet) | **Core calculation engine** (burden, FUTA, JM rates, hours) |
| 6 | **Spec - HVAC Pipe** | — | 28 | HVAC spec / material lists |
| 7 | **Spec - Plumbing** | — | 28 | Plumbing spec lists |
| 8 | **Spec - Duct** | — | 0 | Layout / values (minimal formulas) |
| 9 | **Quantites and Price from Mike** | — | 260 | Quantity & price lines (HVAC, duct, equipment codes) |
| 10 | **Proposal Sheet** | — | 22 | Customer-facing proposal output |
| 11 | **Exclusions** | — | 2 | Exclusion boilerplate |
| 12 | **VRF and Lists** | — | 59 | **Master lookup tables** (wage rates, %, FUTA, companies, systems) |
| 13 | **Followup** | — | 0 | **CRM** company list (~400 rows) — not per-bid |

### Calculation pipeline order (must match in code)

```text
Startup (inputs)
    ↓
Base Bid (team, wage selection, margin, lifts, hours)
    ↓
Labor Costs ↔ Labor Costs Worksheet (heavy cross-refs)
    ↓
Quantities and Price from Mike (extensions by code/system)
    ↓
Spec sheets (HVAC / Plumbing / Duct) — feed or parallel quantities
    ↓
Budget + Proposal Sheet (rollups)
    ↓
Exclusions (text, attached to proposal)
```

---

## 3. Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│  trucking-frontend (Next.js)                                      │
│  /bidding              — list bids                                │
│  /bidding/new          — create                                   │
│  /bidding/[id]/…       — wizard steps                             │
│  src/lib/api/endpoints/bidding.ts                                 │
│  src/lib/bidding/calc/*        — optional client preview          │
│  src/components/bidding/*                                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS + JWT (same as dashboards)
┌────────────────────────────▼─────────────────────────────────────┐
│  Backend API (NestJS / existing logistics API host)               │
│  modules/bidding — CRUD, lookups, calculate, export                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  SQL Server                                                       │
│  Bid_* master tables + Bids + child tables                        │
│  Ref_OurEntities (existing) — link OurEntityId on bid header      │
└──────────────────────────────────────────────────────────────────┘
```

**Auth:** Reuse existing JWT + roles. Estimators: create/edit own bids. Admin: edit lookup tables.

**Company context:** Reuse header `CompanyContext` (`companyId` string = `Ref_OurEntities.EntityID`) for “Company Bidding” where it maps to Startup / Base Bid (`Bidding_company`, `Goel`, `GoelDC`, `DCB`).

---

## 4. Data model — master (lookup) tables

Master data replaces **VRF and Lists**, list portions of **Base Bid** (team columns), **Spec** lists, and **Quantites** code tables. Seed via script from `BiddingSheet.xlsx` (see §11).

### 4.1 Core lookups (MVP)

#### `Bid_Teams`

Replaces `Team_list`, columns `Captain`, `Bid_Clerk`, `Duct_1`, `Duct_2`, `Hydronic_1`, `Hydronic_2`, etc. (Base Bid `AA:AF` rows 4–7).

| Column | Type | Notes |
|--------|------|-------|
| `TeamId` | int PK | |
| `TeamCode` | nvarchar(32) UNIQUE | Value in Base Bid `F2` (team selector) |
| `Captain` | nvarchar(128) | |
| `BidClerk` | nvarchar(128) | |
| `AssistantEstimator` | nvarchar(128) | optional |
| `Duct1`, `Duct2` | nvarchar(128) | |
| `Hydronic1`, `Hydronic2` | nvarchar(128) | |
| `Plumbing1`, `Plumbing2` | nvarchar(128) | if present in sheet |
| `IsActive` | bit | |

**Dropdown:** Base Bid “Team” → `GET /lookups/bidding/teams` → `TeamCode`.

**Dependency:** `XLOOKUP(F$2, Team_list, Captain)` → selecting team sets Captain, Bid Clerk, duct/hydronic assignees.

---

#### `Bid_WageRates`

Replaces `Wage_Rate_List`, `Wage_Rate`, `Wage_Rate_Fringe`, `Wage_Rate_Composite` (rows M:S on Base Bid).

| Column | Type | Notes |
|--------|------|-------|
| `WageRateId` | int PK | |
| `YearLabel` | nvarchar(64) | e.g. `2026 - DC/Federal in DC/CITIZEN` (column M) |
| `Category` | nvarchar(64) | e.g. `NON-SCALE` |
| `State` | nvarchar(8) | optional filter |
| `Wage` | decimal(10,2) | column N |
| `Fringe` | decimal(10,2) | column O |
| `Total` | computed or stored | N + O → column P |
| `EffectiveDate` | date | |
| `NextUpdate` | nvarchar(32) | |
| `SortOrder` | int | |

**Dropdown:** “Wage Rate Year” / category → filters list.

**Dependency chain (example row 5):**

```text
M5 (category label)   user/lookup
N5, O5                from table or XLOOKUP(Project_Wage_Rate, Wage_Rate_List, …)
P5 = N5 + O5
S5 = CONCAT display string from M5, N5, O5, P5
```

---

#### `Bid_ProjectTypes`

From Base Bid “Project Type” (e.g. `New Construction with deep shoring - small`).

| Column | Type |
|--------|------|
| `ProjectTypeId` | int PK |
| `Name` | nvarchar(256) |
| `SortOrder` | int |

---

#### `Bid_States` / sales tax

Replaces `Project_State`, `Rate_State`, `Sales_Tax_by_state`.

| Column | Type |
|--------|------|
| `StateCode` | char(2) PK |
| `Name` | nvarchar(64) |
| `SalesTaxRate` | decimal(8,6) |

---

#### `Bid_BiddingCompanies`

Replaces `Bidding_company` on VRF and Lists `S2:S7`. Align with `Ref_OurEntities` where possible.

| Column | Type |
|--------|------|
| `BiddingCompanyId` | int PK |
| `EntityId` | int FK nullable → `Ref_OurEntities.EntityID` |
| `Name` | nvarchar(128) |
| `Domain` | nvarchar(128) | Startup domain column |

---

#### `Bid_ContractTypes`

Startup / Base Bid: Prime Contractor vs Subcontractor.

| Column | Type |
|--------|------|
| `ContractTypeId` | int PK |
| `Name` | nvarchar(64) |

---

#### `Bid_LiftDefaults`

Replaces `Lift_percentage`, `Lift_cost`, `Lifts_Needed`, `Lifts_Per_Hour`, `Average_no_people`.

| Column | Type |
|--------|------|
| `Key` | nvarchar(64) PK |
| `Value` | decimal(18,6) |

Or single-row defaults table.

---

#### `Bid_PayrollRates` (VRF and Lists)

FUTA, Medicare, PFL, `Percentages`, `FUTA__Rate`, `Medicare__Rate`, etc. — used heavily in **Labor Costs Worksheet**.

| Column | Type |
|--------|------|
| `RateId` | int PK |
| `RateType` | nvarchar(32) | FUTA, Medicare, … |
| `Label` | nvarchar(64) |
| `Rate` | decimal(18,6) |
| `EffectiveYear` | int nullable |

---

#### `Bid_MechanicalSystems`

`Mechanical_System` — VRF `O2:O15`.

| Column | Type |
|--------|------|
| `SystemId` | int PK |
| `Name` | nvarchar(128) |

---

### 4.2 Quantity / spec lookups (Phase 2+)

#### `Bid_QuantityCodes`

Union of `HVAC_Code`, `DUCT_Code`, `EQUIPMENT_Code`, `Code` named ranges.

| Column | Type |
|--------|------|
| `CodeId` | int PK |
| `Trade` | nvarchar(16) | HVAC, DUCT, EQUIPMENT, PLUMBING |
| `Code` | nvarchar(32) |
| `Description` | nvarchar(256) |
| `Unit` | nvarchar(16) |
| `DefaultUnitPrice` | decimal(18,4) nullable |

#### `Bid_HvacSpecMaterials` / `Bid_PlumbingSpecMaterials`

From Spec sheets (`HVAC_Material_Code`, pipe sizes, thickness, etc.) — wide tables; consider JSON blob per spec row if schema is volatile.

---

### 4.3 CRM (optional — Phase 4)

#### `Bid_CrmCompanies`

Maps **Followup** sheet columns (`Company_ID`, `Company`, `Contact`, bid policy flags `Do_we_bid_*`, etc.). Used for contractor autocomplete, not stored on every bid line.

---

## 5. Data model — per-bid (transactional)

### 5.1 `Bids` (header)

| Column | Type | Notes |
|--------|------|-------|
| `BidId` | bigint PK | |
| `EstimateNumber` | nvarchar(32) UNIQUE | e.g. `IDC6098` |
| `BidName` | nvarchar(256) | |
| `BidDate` | date | |
| `Status` | nvarchar(16) | Draft, Submitted, Won, Lost, Archived |
| `OurEntityId` | int FK | Company bidding — maps header `companyId` |
| `CreatedByUserId` | int FK | |
| `CreatedAt`, `UpdatedAt` | datetime2 | |
| `MikeEstimateTotal` | decimal(18,2) nullable | computed snapshot |
| `PjEstimateTotal` | decimal(18,2) nullable | |
| `CostPerHour` | decimal(18,4) nullable | |
| `CostPerHourPj` | decimal(18,4) nullable | |
| `MarginPercent` | decimal(8,4) nullable | |

---

### 5.2 `Bid_Startup` (1:1)

| Column | Type | Excel reference |
|--------|------|-----------------|
| `BidId` | FK PK | |
| `JobName` | nvarchar(256) | Startup row 2 |
| `JobNumber` | nvarchar(64) | |
| `MechanicalContractor` | nvarchar(256) | row 3 |
| `ContractType` | nvarchar(64) | Prime/Sub |
| `Address1`, `Address2` | nvarchar(256) | |
| `CityStateZip` | nvarchar(128) | |
| `OfficePhone`, `Fax` | nvarchar(64) | |
| `ClientContact`, `ClientEmail`, `ClientPhone` | nvarchar | |
| `SendBillsToName`, `SendBillsEmail`, `SendBillsPhone` | nvarchar | |
| `IsBonded` | bit | |
| `SuretyName` | nvarchar(256) | |
| `StartupJson` | nvarchar(max) nullable | Rare checkboxes / domain matrix if faster than 40 columns |

**Company/domain grid** (Startup columns M:O, names `Goel`, `GoelDC`, `DCB`, `Applicable`, `Domain`): child table `Bid_StartupCompanyDomains` or JSON array:

```json
[{ "companyKey": "Goel", "domain": "goelservices.com", "applicable": "Applicable" }]
```

---

### 5.3 `Bid_BaseBidSettings` (1:1)

| Column | Type | Notes |
|--------|------|-------|
| `BidId` | FK PK | |
| `TeamCode` | nvarchar(32) | → `Bid_Teams` |
| `Captain`, `BidClerk`, `AssistantEstimator` | nvarchar | denormalized from team or overrides |
| `ProjectState` | char(2) | |
| `ProjectTypeId` | int FK nullable | |
| `MarginPercent` | decimal | `Margin` |
| `HoursPerDay` | decimal | |
| `DaysPerWeek` | decimal | |
| `HoursPerWeek` | decimal | computed or stored |
| `ProjectWageRateKey` | nvarchar(64) | selected wage row (M column / XLOOKUP key) |
| `Pla` | nvarchar(16) | PLA Yes/No |
| `LiftsNeeded` | nvarchar(16) | |
| `LiftPercentage` | decimal | |
| `LiftCost` | decimal | |
| `AverageNoPeople` | decimal | |
| `MaterialEscalation` | decimal | |
| `Parking`, `ParkingPerHour`, `ParkingCost` | decimal | |
| `Citizen`, `Apprenticable` | nvarchar/bit | |
| `Citizen` | per named cells F12, F13 | |

**Wage grid:** either store selected `WageRateId` + overrides, or child table `Bid_WageSelections` (one row per Excel row 5–11).

#### `Bid_WageSelections` (optional child)

| Column | Type |
|--------|------|
| `BidId`, `LineNo` | |
| `WageRateId` | FK |
| `WageOverride`, `FringeOverride` | nullable |
| `DisplayLabel` | from M column |

---

### 5.4 `Bid_LaborLines`

Port **Labor Costs** + **Labor Costs Worksheet** line structure (discover max rows from sheet; expect dozens, not thousands).

| Column | Type |
|--------|------|
| `LaborLineId` | bigint PK |
| `BidId` | FK |
| `SortOrder` | int |
| `Category` | nvarchar(64) | foreman, worker, apprentice, JM, … |
| `Description` | nvarchar(256) |
| `Headcount` | decimal |
| `Hours` | decimal |
| `BaseRate` | decimal |
| `OvertimeRate` | decimal nullable |
| `BurdenPercent` | decimal nullable |
| `LineTotal` | decimal | computed |
| `Source` | nvarchar(32) | worksheet row ref for debugging |

---

### 5.5 `Bid_QuantityLines`

From **Quantites and Price from Mike**.

| Column | Type |
|--------|------|
| `QuantityLineId` | bigint PK |
| `BidId` | FK |
| `Trade` | nvarchar(16) | HVAC, DUCT, EQUIPMENT |
| `Code` | nvarchar(32) |
| `SystemName` | nvarchar(128) |
| `Quantity` | decimal |
| `Unit` | nvarchar(16) |
| `UnitPrice` | decimal |
| `Extension` | decimal | Qty × Price |
| `ReleaseQty` | decimal nullable |

---

### 5.6 `Bid_SpecSections` (Phase 2)

Store per-trade spec inputs; prefer normalized line items linked to `Bid_QuantityLines` where possible.

---

### 5.7 `Bid_Exclusions`

| Column | Type |
|--------|------|
| `BidId` | FK |
| `TemplateId` | FK nullable |
| `CustomText` | nvarchar(max) |
| `SortOrder` | int |

---

### 5.8 `Bid_CalcSnapshots` (recommended)

| Column | Type |
|--------|------|
| `BidId` | FK |
| `CalculatedAt` | datetime2 |
| `CalcVersion` | nvarchar(16) | semver of calc engine |
| `PayloadJson` | nvarchar(max) | all computed keys + totals |
| `InputsHash` | nvarchar(64) | detect stale |

Allows fast reload and audit; recalc still available on demand.

---

## 6. Key dependencies and dropdown chains (MVP)

### 6.1 Base Bid — team selection

```text
User selects TeamCode (F2)
  → XLOOKUP team → Captain (A4), BidClerk (C4), Duct1/2, Hydronic1/2, …
```

**UI:** Single Team dropdown; role fields read-only unless “override” admin flag.

### 6.2 Base Bid — wage rate

```text
User selects ProjectWageRateKey and/or category (M column)
  → XLOOKUP(Project_Wage_Rate, Wage_Rate_List, Wage_Rate) → N
  → XLOOKUP(..., Wage_Rate_Fringe) → O
  → P = N + O
  → S = formatted description
```

**UI:** Wage category dropdown filtered by state/year; N/O/P/S update on change.

### 6.3 Base Bid — labor rate and cost per hour

```text
Margin (D4), HoursPerDay (F4), DaysPerWeek (F5)
  → Total hours / wages (lower grid, H48, I48, …)
  → H2 = cost/hr (MIKE path), J2 = PJ path
  → J1 = PJ_Estimate (named value), H1 = MIKE total
```

**Calc module:** `baseBid.ts` must run after wage lines and after labor worksheet returns `labor_rate`, `Total_Wage`, etc.

### 6.4 Lifts

```text
Lifts_Needed, Lift_percentage, Lift_cost, Project_Months, Average_no_people
  → J7 = Lift_percentage * Lift_cost * Project_Months * (4.4/4) * Average_no_people
```

### 6.5 Cross-sheet (Labor Costs Worksheet)

**85+ formulas** reference other sheets; engine order:

1. Load bid inputs + lookups.
2. Run `laborWorksheet.ts` (imports Base Bid scalars).
3. Write back `labor_rate`, burden totals to Base Bid rollups.
4. Run `quantities.ts` → `proposal.ts`.

---

## 7. Calculation engine (backend)

### 7.1 Location

```text
backend/src/bidding/calc/
  index.ts           — orchestrator: runAll(ctx): CalcResult
  types.ts           — BidCalcContext, CalcResult
  startup.ts
  baseBid.ts
  laborCosts.ts
  laborWorksheet.ts  — largest file; port in sub-steps
  quantities.ts
  proposal.ts
  budget.ts
  rounding.ts        — match Excel ROUND/ROUNDUP
```

**Version:** `CALC_ENGINE_VERSION = '1.0.0'` stored on snapshot.

### 7.2 Input / output contract

```typescript
interface CalcResult {
  version: string;
  computed: Record<string, number | string | boolean | null>;
  errors: { field: string; message: string }[];
  warnings: string[];
}
```

**Computed keys** use dot notation: `baseBid.costPerHour`, `baseBid.pjEstimate`, `labor.totalHours`, `quantities.hvacTotal`, `proposal.grandTotal`.

### 7.3 Porting rules from Excel

| Excel | Code |
|-------|------|
| `XLOOKUP(k, list, col)` | `lookup(k, table)` |
| `IF(a, b, c)` | `if (a) b else c` |
| `SUM(range)` | sum array |
| `ROUND(x, n)` | round half-away or Excel-compatible (document choice) |
| `EDATE` | date-fns `addMonths` |
| Named range | Load from SQL lookup DTO |
| `#REF!` names | Do not port; confirm with business |

### 7.4 Testing

```text
backend/test/bidding/
  golden-idc6098.json    — inputs extracted from filled workbook
  golden-idc6098.expected.json
  calc.engine.spec.ts  — compare computed keys
```

Tolerance: money **0.01**, rates **0.0001** unless Excel display rounding differs.

---

## 8. API specification

Base path: `/bidding` (or `/api/bidding` per existing API prefix). Auth: Bearer JWT.

### 8.1 Lookups (read-only for estimators)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/lookups/bidding/teams` | Team list |
| GET | `/lookups/bidding/wage-rates` | Query: `state`, `yearLabel` |
| GET | `/lookups/bidding/project-types` | |
| GET | `/lookups/bidding/states` | |
| GET | `/lookups/bidding/bidding-companies` | |
| GET | `/lookups/bidding/contract-types` | |
| GET | `/lookups/bidding/quantity-codes` | Query: `trade` |
| GET | `/lookups/bidding/payroll-rates` | FUTA, Medicare, … |

### 8.2 Bids

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bids` | List (filter: status, entityId, search) |
| POST | `/bids` | Create draft; body: `{ estimateNumber, bidName, ourEntityId }` |
| GET | `/bids/:id` | Full bid + lines + last `computed` |
| PATCH | `/bids/:id` | Partial update (startup, baseBid, lines) |
| DELETE | `/bids/:id` | Soft-delete / archive |
| POST | `/bids/:id/calculate` | Run engine; return `CalcResult`; upsert snapshot |
| POST | `/bids/:id/duplicate` | Copy bid |

### 8.3 Export (Phase 3)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bids/:id/export/xlsx` | Generate workbook from templates |
| GET | `/bids/:id/export/pdf` | Proposal sheet PDF |

### 8.4 Admin

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/admin/bidding/wage-rates/:id` | CRUD master tables |
| POST | `/admin/bidding/seed-from-xlsx` | Dev-only: reload from file |

### 8.5 Example: PATCH + calculate flow

```http
PATCH /bids/42
Content-Type: application/json

{
  "baseBid": {
    "teamCode": "MIKE",
    "projectState": "DC",
    "marginPercent": 0.25,
    "projectWageRateKey": "2026 - DC/Federal in DC/CITIZEN"
  }
}
```

```http
POST /bids/42/calculate
```

```json
{
  "version": "1.0.0",
  "computed": {
    "baseBid.wageTotal": 60.94,
    "baseBid.costPerHour": 89.91,
    "baseBid.pjEstimate": 47600
  },
  "errors": []
}
```

---

## 9. Frontend implementation (this repo)

### 9.1 Routes

| Route | Purpose |
|-------|---------|
| `/bidding` | Bid list table |
| `/bidding/new` | Create estimate |
| `/bidding/[id]` | Redirect to first incomplete step |
| `/bidding/[id]/startup` | Startup form |
| `/bidding/[id]/base-bid` | Base Bid form |
| `/bidding/[id]/labor` | Labor lines + summary |
| `/bidding/[id]/quantities` | Mike quantities (Phase 2) |
| `/bidding/[id]/proposal` | Review + export (Phase 3) |

Add to **Billings** sidebar group in `src/components/dashboard/Sidebar.tsx`:

```typescript
{ href: "/bidding", label: "Bidding", Icon: NavIconProposal /* or new icon */ }
```

### 9.2 File structure

```text
src/lib/bidding/
  types.ts
  field-keys.ts          — constants for computed.* keys
src/lib/api/endpoints/bidding.ts
src/hooks/useBidding.ts
src/hooks/useBiddingLookups.ts
src/components/bidding/
  BidWizardLayout.tsx
  StartupForm.tsx
  BaseBidForm.tsx
  WageRateGrid.tsx
  LaborGrid.tsx
  ComputedField.tsx      — read-only formatted money
  BidListTable.tsx
src/app/(dashboard)/bidding/
  page.tsx
  new/page.tsx
  [id]/layout.tsx
  [id]/startup/page.tsx
  [id]/base-bid/page.tsx
  [id]/labor/page.tsx
```

### 9.3 UX rules

1. **Editable:** white inputs, dropdowns.
2. **Computed:** `ComputedField` gray background, label + value from `computed.*`.
3. **onChange:** debounce 300ms → `PATCH` → `POST calculate` → merge `computed` into state.
4. **Loading:** skeleton on recalc; do not clear inputs.
5. **Errors:** map `errors[]` to field-level messages.
6. **Company:** initialize `ourEntityId` from `useCompany().companyId` on new bid.

### 9.4 API client sketch

```typescript
// src/lib/api/endpoints/bidding.ts
export async function getBids(params?: { status?: string; entityId?: number }) {
  return get<BidSummary[]>("/bids", params);
}
export async function getBid(id: string) {
  return get<BidDetail>(`/bids/${id}`);
}
export async function patchBid(id: string, body: Partial<BidDetail>) {
  return patch<BidDetail>(`/bids/${id}`, body);
}
export async function calculateBid(id: string) {
  return post<CalcResult>(`/bids/${id}/calculate`, {});
}
```

---

## 10. Implementation phases

### Phase 0 — Prep (1 week)

- [ ] Review with estimator: confirm MVP scope and golden bid (`IDC6098` or other).
- [ ] Fix or ignore 12 broken `#REF!` names in Excel.
- [ ] Add `scripts/seed-bidding-from-xlsx.ts` (Node + `xlsx`).
- [ ] Create SQL migrations for §4–§5 tables.

### Phase 1 — Foundation (2–3 weeks)

- [ ] Master tables seeded from **VRF and Lists** + team columns.
- [ ] `Bids`, `Bid_Startup`, `Bid_BaseBidSettings` CRUD APIs.
- [ ] Frontend: list, new, Startup, Base Bid (inputs only, no calc).
- [ ] Sidebar nav link.

### Phase 2 — Core calc (3–5 weeks)

- [ ] Port `baseBid.ts` + wage XLOOKUP chain.
- [ ] Port `laborWorksheet.ts` (incremental; start with rows used on pilot bid).
- [ ] `POST /bids/:id/calculate` + snapshot table.
- [ ] Frontend: live computed fields on Base Bid + Labor.
- [ ] Golden test passes.

### Phase 3 — Quantities & proposal (2–4 weeks)

- [ ] `Bid_QuantityLines`, quantity codes, Mike sheet logic.
- [ ] Spec tabs (HVAC / Plumbing / Duct) as needed.
- [ ] Proposal sheet view + PDF/Excel export.

### Phase 4 — CRM & polish (optional)

- [ ] Followup import → `Bid_CrmCompanies`.
- [ ] Exclusions templates.
- [ ] Bid duplication, revision history, permissions.

---

## 11. Seed script from `BiddingSheet.xlsx`

**Script:** `scripts/seed-bidding-from-xlsx.ts` (to be created).

| Source sheet | Target table |
|--------------|--------------|
| VRF and Lists | `Bid_WageRates`, `Bid_PayrollRates`, `Bid_BiddingCompanies`, … |
| Base Bid `AA:AF` | `Bid_Teams` |
| Quantites `Code` columns | `Bid_QuantityCodes` |
| Followup | `Bid_CrmCompanies` (optional) |

Run: `npx ts-node scripts/seed-bidding-from-xlsx.ts --file BiddingSheet.xlsx`

**Do not** seed transactional bids from template file unless using a dedicated “example bid” sheet.

---

## 12. Known issues in source workbook

| Issue | Names / location | Action |
|-------|------------------|--------|
| Broken defined names | `Bid?`, `Bid_All`, `Bid_Piping?`, `Company_Selected`, … (12 total) | Confirm unused; remove from calc port |
| `PJ_Estimate` | Base Bid `J1` | Treat as named input or computed cell; confirm with estimator |
| Duplicate name `HVAC_Unit` | Two ranges | Disambiguate in code |
| Cross-sheet fragility | Labor Costs Worksheet | Port in dependency order; integration tests |
| Date serial `46141` | Bid Date | Convert Excel serial → ISO date in seed/UI |

---

## 13. Security and compliance

- Bids may contain **pricing and margin** — restrict API by `CreatedByUserId` or role.
- Do not commit **production** `BiddingSheet.xlsx` to public repos if sensitive; use `.gitignore` + sample file.
- Audit: `Bid_CalcSnapshots` + `UpdatedAt` on `Bids`.

---

## 14. Open questions (fill before Phase 2)

| # | Question | Owner |
|---|----------|-------|
| 1 | Which completed bid is the golden test besides IDC6098? | Estimator |
| 2 | Is `Followup` required in MVP or phase 4? | Product |
| 3 | Backend repo path / module name for `bidding`? | Backend lead |
| 4 | Must exported Proposal match Excel print layout exactly? | Boss |
| 5 | Can estimators override Captain after team select? | Boss |
| 6 | Link `JobNumber` to existing `Ref_Jobs`? | Product |

---

## 15. Quick reference — Excel sheet → app module

| Excel sheet | DB / API | Frontend step |
|-------------|----------|---------------|
| Startup | `Bid_Startup` | `/startup` |
| Base Bid | `Bid_BaseBidSettings`, wage child | `/base-bid` |
| Labor Costs + Worksheet | `Bid_LaborLines`, calc | `/labor` |
| Quantites and Price from Mike | `Bid_QuantityLines` | `/quantities` |
| Spec * | `Bid_SpecSections` / codes | tabs or `/quantities` |
| Proposal Sheet | computed + export | `/proposal` |
| Exclusions | `Bid_Exclusions` | `/proposal` |
| VRF and Lists | master `Bid_*` lookups | admin |
| Followup | `Bid_CrmCompanies` | autocomplete (later) |
| Budget | calc `budget.ts` | summary widget |

---

## 16. Next steps for implementers

1. Backend: create migrations for §4.1 + §5.1–5.3 + §5.8.
2. Backend: implement lookup GET endpoints + bid CRUD.
3. Backend: `baseBid.ts` calc + golden test.
4. Frontend: `bidding.ts` client + `/bidding` list + Startup/Base Bid forms wired to PATCH/calculate.
5. Iterate Labor worksheet port until golden test passes.

When Phase 1 starts, split tickets from §10 checklists into your issue tracker.

---

*Generated from analysis of `BiddingSheet.xlsx` (13 sheets, ~1678 formulas, ~228 active defined names). Update this doc when the workbook version changes.*
