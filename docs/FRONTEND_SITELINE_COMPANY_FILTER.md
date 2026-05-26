# Siteline billing — company filter (frontend)

**Problem today:** The app has a global “Our company” dropdown (GOEL / GOEL DC / DCB), but **Siteline screens do not pass that selection to the API**. The backend stores **separate** Siteline data per company and only returns the correct slice when you send **`entityId`**.

**Rule:** Use the **same `entityId`** as Job / Material / Hauler dashboards (`GET /lookups/our-entities`). Do **not** send `companyId` — it is **ignored** on Siteline routes.

---

## 1. Company IDs (must match everywhere)

| entityId | Name (dropdown label) | Siteline legal name (from API) |
|----------|------------------------|--------------------------------|
| **1** | GOEL | Goel Services, Inc |
| **2** | GOEL DC | Goel DC, LLC |
| **3** | DCB | Delaware Cornerstone Builders, Inc. (DCB) |m
| 4 | TBD / Unassigned | *(no Siteline token — hide on billing screens)* |

**Default when user picks “All companies” on other dashboards:** Siteline billing should **not** use “all” — either require a company or default to **`entityId=2` (GOEL DC)** to match backend config (`SITELINE_AGING_PRIMARY_ENTITY_ID`).

---

## 2. Company ID selection — naming, UI, and mapping

Siteline billing must follow the **same company picker** as Job / Material / Hauler. This section documents how that selection works in the repo today and what to change for Billings.

### 2.1 Three different “company” identifiers (do not mix them)

| What it is | Where it lives | Send to API? | Example |
|------------|----------------|--------------|---------|
| **Our entity id** (`Ref_OurEntities.EntityID`) | Header dropdown, `CompanyContext.companyId` (string) | **Yes** — as query param **`entityId`** (number) on dashboards and Siteline aging | `"2"` → `entityId=2` |
| **Siteline company UUID** | `GET /siteline/entity-config` → `sitelineCompanyId` | **No** — backend maps `entityId` → token / UUID internally | `c85ffa3f-9161-4564-af4e-c4f428c46478` |
| **`companyId` query param** | Some legacy docs / Clearstory | **No** on Siteline routes — **ignored** by aging/overdue | `?companyId=2` ❌ |

The global header stores **our entity id**, not the Siteline UUID. The React context field is named `companyId` for historical reasons; the REST API for logistics and Siteline snapshots expects **`entityId`**.

### 2.2 Where the user selects a company

| Piece | File | Behavior |
|-------|------|----------|
| Dropdown UI | `src/components/dashboard/Header.tsx` | `<select>` with **“All companies”** (`value="all"` → `null`) plus one option per row from `/lookups/our-entities` |
| Global state | `src/contexts/CompanyContext.tsx` | `companyId: string \| null`, `setCompanyId`, `companies`, `company` (selected label) |
| Persistence | `localStorage` key `construction-logistics-company-id` | `"all"` when no filter; otherwise `"1"`, `"2"`, `"3"`, or `"4"` |
| Provider scope | `src/app/(dashboard)/layout.tsx` | Wraps dashboard routes (Job, Material, Hauler, **Billings**, etc.) |

**Dropdown values (strings in the UI):**

| UI value | Meaning | Use on Siteline aging/overdue? |
|----------|---------|--------------------------------|
| `null` (“All companies”) | No `entityId` on Job/Material/Hauler | **No** — resolve to default `2` or block billing |
| `"1"` | GOEL | Yes |
| `"2"` | GOEL DC | Yes (backend default if param omitted) |
| `"3"` | DCB | Yes |
| `"4"` | TBD / Unassigned | **No** — hide or disable on billing screens |

On first load, `CompanyContext` restores the last choice from `localStorage` if it still exists in the entities list; otherwise it starts at **All** (`null`).

### 2.3 How Job / Material / Hauler already wire selection (pattern to copy)

Dashboard pages read the header selection and pass it to the API as **`entityId`** (coerced to a number in the API client):

```typescript
// src/app/(dashboard)/job/page.tsx (same idea on material + hauler)
const { companyId } = useCompany();

useJobDashboard({
  companyId: companyId ?? undefined,  // legacy field on filter type; not sent as companyId query
  entityId: companyId ?? undefined,   // → ?entityId=1|2|3 on /job-dashboard/*
  // ...
});
```

```typescript
// src/lib/api/endpoints/job-dashboard.ts
entityId: f.entityId ? Number(f.entityId) : undefined,
```

When `companyId` is `null`, dashboards **omit** `entityId` and the backend returns **all** our entities. Siteline must **not** mirror that behavior for synced aging data.

### 2.4 Resolving `companyId` → Siteline `entityId`

Use one helper everywhere Siteline reads the global picker:

```typescript
const SITELINE_ENTITY_IDS = new Set(["1", "2", "3"]);
const DEFAULT_SITELINE_ENTITY_ID = 2;

/** Header stores string ids; Siteline query wants a number. */
function sitelineEntityIdFromContext(companyId: string | null | undefined): number {
  if (companyId != null && SITELINE_ENTITY_IDS.has(companyId)) {
    return Number(companyId);
  }
  return DEFAULT_SITELINE_ENTITY_ID; // when user chose "All" or invalid id
}
```

| `useCompany().companyId` | Siteline `entityId` to send |
|--------------------------|----------------------------|
| `"1"` | `1` |
| `"2"` | `2` |
| `"3"` | `3` |
| `null` (“All”) | **`2`** (recommended default) **or** show “Select a company…” and skip fetch |
| `"4"` | Do not call aging APIs; prompt user to pick GOEL / GOEL DC / DCB |

### 2.5 Billings page — current gap (must fix)

| Area | Status today | Required |
|------|--------------|----------|
| `src/app/(dashboard)/billings/page.tsx` | Does **not** call `useCompany()`; aging/overdue fetches ignore header | `const { companyId, company } = useCompany()`; pass resolved `entityId` into every aging fetch |
| `src/lib/api/endpoints/siteline.ts` | `getSitelineAgingReport` / `getSitelineAgingOverdue` have **no** `entityId` in params | Add `entityId?: number` to `SitelineAgingFilters` (or a dedicated arg) and include it in `get(...)` query |
| Refetch on company change | No `useEffect` dependency on `companyId` | When `companyId` changes → clear tables, set loading, refetch active tab |

**Target wiring on Billings:**

```typescript
const { companyId, company } = useCompany();
const entityId = sitelineEntityIdFromContext(companyId);

// In loadAgingReport / loadAgingOverdue:
await getSitelineAgingReport({ ...filters, entityId });
await getSitelineAgingOverdue({ ...filters, entityId });

// Refetch when header company changes:
useEffect(() => {
  if (!configured) return;
  if (activeTab === "aging") loadAgingReport();
  else if (activeTab === "overdue") loadAgingOverdue();
}, [configured, activeTab, companyId, loadAgingReport, loadAgingOverdue]);
```

Show the selected name in the subtitle, e.g. `Aging report — GOEL DC`, using `company?.name` from context (not `GET /siteline/company`, which is a different, live Siteline object).

### 2.6 Optional: hide “All” on billing routes only

If product wants to **force** a company on Billings without changing Job Dashboard:

- On `/billings`, if `companyId === null`, call `setCompanyId("2")` once on mount, **or**
- Render the aging tabs disabled until the user picks a company in the header (no auto-default).

Do **not** add a second company dropdown on the Billings page unless UX explicitly requires it.

### 2.7 `sitelineCompanyId` vs header selection

`GET /siteline/entity-config` returns both `entityId` and `sitelineCompanyId` per row. Use it only to:

- Confirm backend has a Siteline token mapped for that entity (ops/debug).
- Show “last resolved” sync metadata in an admin or debug panel.

**Never** set the header `companyId` from `sitelineCompanyId` — types and values differ (integer entity vs UUID).

---

## 3. Load the dropdown (same as other dashboards)

**Preferred** — already used on Job Dashboard:

```http
GET /lookups/our-entities
Authorization: Bearer <token>
```

```json
[
  { "id": 1, "name": "GOEL" },
  { "id": 2, "name": "GOEL DC" },
  { "id": 3, "name": "DCB" },
  { "id": 4, "name": "TBD" }
]
```

**Optional** — Siteline-specific metadata (Siteline UUID, last sync time):

```http
GET /siteline/entity-config
Authorization: Bearer <token>
```

```json
[
  {
    "entityId": 1,
    "entityName": "GOEL",
    "sitelineCompanyId": "c85ffa3f-9161-4564-af4e-c4f428c46478",
    "sitelineCompanyName": "Goel Services, Inc",
    "lastResolvedAt": "2026-05-20T17:02:26.458Z"
  },
  ...
]
```

Use **`entityId`** + **`entityName`** for labels. `sitelineCompanyId` is for debugging only — do not send it as a query param.

**UI:** On Siteline / Billing pages, filter dropdown to **ids 1, 2, 3 only** (exclude 4).

---

## 4. Global state — wire the existing company picker

This app already exposes selection via **`CompanyContext`** (see §2.2–2.5):

```typescript
const { companyId, company, setCompanyId, companies } = useCompany();
// companyId: string | null  — "1" | "2" | "3" | "4" or null for "All"
```

### Required behavior on Siteline routes

1. **Read** `companyId` from `useCompany()` (same as Job Dashboard).
2. **Resolve** to numeric `entityId` with `sitelineEntityIdFromContext(companyId)` before each Siteline aging/overdue call.
3. **When the user changes company** in the header dropdown → **refetch every Siteline API** on the current page (do not keep showing the previous company’s data).
4. **If `companyId` is `null` (“All”)** → for Siteline only, use **`entityId=2`** (GOEL DC) or disable the billing view: *“Select a company to view Siteline billing.”*

### Do not do this

```http
GET /siteline/aging-report
GET /siteline/aging-report?companyId=2
```

### Do this

```http
GET /siteline/aging-report?entityId=2
GET /siteline/aging-overdue?entityId=2
```

---

## 5. Endpoints that MUST include `entityId`

Whenever `companyId` resolves to a valid entity (or defaults to `2`), append **`entityId`** to these calls:

| Screen / feature | Method | Endpoint | Required query |
|------------------|--------|----------|----------------|
| Aging pivot table | GET | `/siteline/aging-report` | `entityId`, optional `startDate`, `endDate`, `search`, `overdueOnly`, … |
| Overdue AR list | GET | `/siteline/aging-overdue` | `entityId`, optional filters |
| Live Siteline company (optional) | GET | `/siteline/company` | `entityId` — uses that company’s API token |
| Entity lookup (optional) | GET | `/siteline/entity-config` | none |

**Not filtered by `entityId` today (live Siteline / global):**

- `GET /siteline/status` — no filter
- `GET /siteline/contracts/:id` — single contract by UUID (no entity param yet)
- `GET /siteline/pay-apps/paginated` — uses default token only

If you add a **contracts list** or **pay apps grid** per company later, backend will need `entityId` on those too — plan for it now in the shared fetch helper.

---

## 6. Example: shared fetch helper

Prefer extending `getSitelineAgingReport` / `getSitelineAgingOverdue` in `src/lib/api/endpoints/siteline.ts` so all Billings calls stay typed. Example resolver + client shape:

```typescript
// src/lib/siteline-entity.ts (or inline in billings page)
const SITELINE_ENTITY_IDS = new Set(["1", "2", "3"]);
const DEFAULT_SITELINE_ENTITY_ID = 2;

export function sitelineEntityIdFromContext(companyId: string | null | undefined): number {
  if (companyId != null && SITELINE_ENTITY_IDS.has(companyId)) return Number(companyId);
  return DEFAULT_SITELINE_ENTITY_ID;
}

// siteline.ts — add to SitelineAgingFilters:
export interface SitelineAgingFilters {
  entityId?: number;
  search?: string;
  // ...
}

export async function getSitelineAgingReport(filters?: SitelineAgingFilters) {
  return get<AgingReportResponse | SitelineError>("siteline/aging-report", {
    entityId: filters?.entityId,
    search: filters?.search,
    // ...
  });
}

// billings/page.tsx
const { companyId } = useCompany();
const entityId = sitelineEntityIdFromContext(companyId);

await getSitelineAgingReport({ ...agingFiltersRef.current, entityId });
```

Call aging/overdue loaders from:

- Initial page load (with resolved `entityId`)
- `useEffect` when **`companyId`** from `useCompany()` changes (see §2.5)
- When tab or date/search filters change (keep the same `entityId`)

---

## 7. Example URLs (copy-paste for QA)

Replace `localhost:3005` with your API host.

```http
# GOEL
GET /siteline/aging-report?entityId=1

# GOEL DC (default backend behavior if param omitted)
GET /siteline/aging-report?entityId=2

# DCB
GET /siteline/aging-report?entityId=3

# Overdue view
GET /siteline/aging-overdue?entityId=2&minDaysPastDue=51
```

**Sanity check:** Row counts and dollar totals should **change** when switching `entityId` (after backend sync has finished for all three companies).

---

## 8. UI checklist (implementation tickets)

### A. Global wiring

- [ ] `billings/page.tsx` uses `useCompany()` (`companyId` string from `CompanyContext`).
- [ ] `siteline.ts` aging helpers accept and send **`entityId`** (number).
- [ ] `sitelineEntityIdFromContext(companyId)` applied on every aging/overdue request.
- [ ] Changing header dropdown triggers **refetch** (loading state + clear old rows while loading).
- [ ] Subtitle shows `company?.name` for the active `entityId`.

### B. Aging report page

- [ ] `GET /siteline/aging-report?entityId={selected}` on load and on company change.
- [ ] Show selected company name in page title or subtitle (e.g. “Aging — GOEL DC”).
- [ ] Empty state if `rows.length === 0`: “No aging data for {company} yet; sync runs every 10 minutes.”

### C. Overdue / AR page (if separate)

- [ ] `GET /siteline/aging-overdue?entityId={selected}` — same pattern.

### D. Do not break Job/Material/Hauler

- [ ] Keep sending **`entityId`** (not `companyId`) on those dashboards — see [FRONTEND_COMPANY_FILTER.md](./FRONTEND_COMPANY_FILTER.md).

### E. Network tab verification (per screen)

1. Open DevTools → Network.
2. Change company from GOEL → GOEL DC → DCB.
3. Confirm **new** requests with `entityId=1`, then `2`, then `3`.
4. Confirm response `rows` / `totals` differ between companies.

---

## 9. Response shape (unchanged)

`entityId` only affects **which snapshot** is read; JSON shape is the same — see [FRONTEND_AGING_REPORT.md](./FRONTEND_AGING_REPORT.md) and [FRONTEND_SITELINE.md](./FRONTEND_SITELINE.md).

Optional fields on aging response:

- `sitelineDashboardRange` — cached date range from sync
- `lastAgingBreakdownSync` — when snapshot was written
- `source` — `"siteline"` vs `"local_pay_apps"`

Show **last sync time** in the UI if you want users to know data freshness.

---

## 10. Sync / empty data (not a frontend bug)

Data is filled by backend cron (~every 10 minutes per company). If one company returns empty:

- Backend may still be syncing (hundreds of contracts per entity).
- User can wait or ask ops to confirm `GET /siteline/entity-config` has `sitelineCompanyId` set for that row.

Frontend should show a clear message, not a broken table.

---

## 11. One-page summary for the frontend team

1. **Reuse** the header Our Company dropdown — `useCompany().companyId` is the entity id (`"1"` / `"2"` / `"3"`), not the Siteline UUID.
2. Map that value to query param **`entityId`** (number); default **`2`** when header is “All”.
3. **Never** send `companyId` or `sitelineCompanyId` on Siteline aging/overdue routes.
4. Wire **`billings/page.tsx`** + **`siteline.ts`** (today they do not pass `entityId`).
5. **Refetch** aging/overdue when `companyId` changes; verify Network tab shows `entityId=1|2|3` and different totals per company.

---

## Related docs

- [FRONTEND_COMPANY_FILTER.md](./FRONTEND_COMPANY_FILTER.md) — Job / Material / Hauler `entityId`
- [FRONTEND_SITELINE.md](./FRONTEND_SITELINE.md) — Siteline endpoints and response shapes
- [FRONTEND_AGING_REPORT.md](./FRONTEND_AGING_REPORT.md) — Aging table columns and formatting
