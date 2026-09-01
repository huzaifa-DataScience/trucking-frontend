# GoFormzDB / Trucking Dashboard — Complete Database Design

**Database:** `GoFormzDB` (SQL Server)  
**Last updated:** 2026-08-18  
**Audience:** Backend, FE, and anyone reviewing schema decisions  
**Sources:** original dump (`GoFormzDB.sql` / `.bak`, Mar 2026) + live NestJS TypeORM entities (`trucking` repo, ~80 tables)

This is the **system-wide** database design document. Bidding-only details remain in [BIDDING_DATABASE_DESIGN.md](./BIDDING_DATABASE_DESIGN.md) (and backend `docs/BIDDING_DATABASE_DESIGN.md`).

---

## 1. What this database is

One SQL Server database powers the construction ops dashboard:

| Domain | Purpose | Table prefix |
|--------|---------|----------------|
| **Trucking / GoFormz** | Site haul tickets, materials, haulers, rates | `Ref_*`, `Fact_*`, `Stage_*` |
| **App / Auth** | Users, RBAC, settings, files, email | `App_*` |
| **Bidding** | Estimates, Mike takeoff, Specs, wages, process | `Bids`, `Bid_*` |
| **Clearstory** | CORs / change orders sync mirror | `Clearstory_*` |
| **Siteline** | Contracts, pay apps, aging sync mirror | `Siteline_*` |
| **Connecteam** | Workforce: time, tasks, chat, forms | `Connecteam_*` |
| **Trimble / StructShare** | Project line items for Specs “Recv” | `Trimble_*` |

**Design stance:** one operational DB (not micro-databases). Integration domains are **sync mirrors** of vendor APIs — do not treat them as source-of-truth CRM.

---

## 2. Naming & layering conventions

| Prefix / pattern | Meaning |
|------------------|---------|
| `Ref_*` | Shared reference / dimension (jobs, materials, our companies) |
| `Fact_*` | Clean production facts (tickets, photos) |
| `Stage_*` | Raw inbound staging before resolve/FK |
| `App_*` | Platform (auth, roles, files, settings) |
| `Bid_*` / `Bids` | Bidding module only |
| `Clearstory_*` / `Siteline_*` / `Connecteam_*` / `Trimble_*` | External system mirrors |
| `VW_*` | Reporting views |
| `USP_*` | Stored procedures (legacy ETL) |

**Rules**

1. Prefer **FK to existing `Ref_*` / `App_*`** over duplicating names.
2. Integration tables keep **vendor IDs** as PKs when the API owns identity.
3. Bidding **lookups** stay under `Bid_*` (wage rates, spec systems) — not mixed into trucking `Ref_*`.
4. Soft delete on transactional roots where needed (`Bids.IsDeleted`).
5. Money/rates: `decimal`; percents in app layer are often **decimals** (`0.06` = 6%).

---

## 3. High-level architecture

```text
                    ┌─────────────────────┐
                    │   Ref_OurEntities   │  GOEL / GOEL DC / DCB
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   Ref_Jobs ◄── Fact_SiteTickets              Bids
         │         ▲                               │
         │         │ resolve FKs                   ├── Bid_Content (JSON)
   Stage_SiteTickets                               ├── Bid_MikeFiles / Rows
   (GoFormz raw)                                   ├── Bid_SpecLines
                                                   └── Bid_* lookups

   Clearstory_*  Siteline_*  Connecteam_*  Trimble_*
   (API sync mirrors — join to jobs/bids by number/id when needed)

   App_Users / App_Roles / App_Permissions / App_Files / App_Settings
```

---

## 4. Domain A — Trucking core (original dump)

**Origin:** Azure Data Studio notebook dump of `GoFormzDB` (script date ~2026-03-17).  
**Pattern:** staging → lookup resolve → fact (classic ops warehouse).

### 4.1 Tables

| Table | Role |
|-------|------|
| `Stage_SiteTickets` | Wide raw GoFormz form row (`Raw_*` columns, photo links, `ProcessedDate`) |
| `Fact_SiteTickets` | Clean ticket: job, site, hauler, material, driver, direction, truck # |
| `Fact_TicketPhotos` | Photos per ticket (`PhotoType`, `PhotoURL`) |
| `Ref_Jobs` | Job # / name / address / `EntityID` |
| `Ref_OurEntities` | Our legal entities |
| `Ref_Materials` | Materials (+ optional `ParentMaterialID` hierarchy) |
| `Ref_ExternalCompanies` | Haulers / trucking vendors |
| `Ref_CompanyContacts` | Contacts under a hauler |
| `Ref_ExternalSites` | Disposal / quarry / other sites |
| `Ref_Drivers` | Drivers |
| `Ref_TruckTypes` | Truck type list |
| `Ref_DisposalRates` | Site × material pricing |
| `Ref_TruckingRates` | Hauler × truck type hourly rates |
| `VW_SiteTickets_Excel_Report` | Fact + Stage coalesce for Excel-friendly report |
| `USP_Process_GoFormz_Tickets` | Cursor SP: stage → resolve IDs → insert fact + photos |

### 4.2 Core ER (tickets)

```text
Ref_OurEntities (1) ──< Ref_Jobs (1) ──< Fact_SiteTickets >── (0..1) Ref_ExternalSites
                                         │
                                         ├── (0..1) Ref_ExternalCompanies
                                         ├── (0..1) Ref_TruckTypes
                                         ├── (0..1) Ref_Drivers
                                         ├── (1)   Ref_Materials
                                         └── (1:N) Fact_TicketPhotos

Stage_SiteTickets  ──(match FormTicketNumber)──  Fact_SiteTickets
```

### 4.3 Key columns — `Fact_SiteTickets`

| Column | Notes |
|--------|--------|
| `TicketID` | PK identity |
| `GoFormzID` | External form id |
| `FormTicketNumber` | **UNIQUE** business key |
| `TicketDate` | Date of haul |
| `JobID` | FK → `Ref_Jobs` (required for process insert) |
| `MaterialID` | FK → `Ref_Materials` |
| `ExternalSiteID` | FK → sites (nullable in dump) |
| `TruckingCompanyID` | FK → haulers |
| `TruckTypeID`, `DriverID` | Optional FKs |
| `Direction` | Import / Export (short nvarchar) |
| `TruckNumber`, physical ticket fields, `SignedBy` | Ops fields |
| `CreatedAt` | Default `getdate()` |

### 4.4 ETL flow

1. Ingest GoFormz → `Stage_SiteTickets` (`ProcessedDate` null).
2. `USP_Process_GoFormz_Tickets` matches names → lookup IDs (auto-creates drivers).
3. Inserts `Fact_SiteTickets` if job + material + ticket # resolve and not duplicate.
4. Copies photo URLs into `Fact_TicketPhotos`.
5. Sets `ProcessedDate`.

**Design note:** Stage is intentionally denormalized (form-shaped). That is an ETL tradeoff, not a relational model for the UI.

### 4.5 Strengths / known limits (core)

| Strengths | Limits |
|-----------|--------|
| Clear `Ref` / `Fact` / `Stage` separation | Wide Stage schema brittle to form changes |
| Real FKs on facts | Cursor SP (not set-based) |
| Unique ticket number | Few non-PK indexes in original dump |
| Rates modeled separately | View Fact⋈Stage can mis-join on messy ticket #s |

**Grade for trucking-only:** solid production foundation (≈ B+ / A−).

---

## 5. Domain B — App platform

| Table | Purpose |
|-------|---------|
| `App_Users` | Email, password hash, role string, status (`pending` / `active` / …) |
| `App_Roles` | Named roles |
| `App_Permissions` | Permission catalog |
| `App_RolePermissions` | M:N role ↔ permission |
| `App_Settings` | Key/value app config |
| `App_Files` | Stored file metadata |
| `App_EmailTemplates` | Outbound email templates |

Auth is JWT-based at the API (`Authorization: Bearer`). Users link into bidding via `Bids.CreatedByUserId` / `UpdatedByUserId` and `Bid_ActivityLog.UserId`.

---

## 6. Domain C — Bidding

**Principle:** one `Bids` row = one estimate from invite → takeoff → proposal → outcome → (optional) production.  
**Do not** rebuild Excel engines in SQL; store inputs + client `computed` snapshot; Specs qty / Mike stacking stay in API services.

### 6.1 Transactional

| Table | Cardinality | Purpose |
|-------|-------------|---------|
| `Bids` | root | Header: company, job, estimate #, status, process stage, outcome, work type |
| `Bid_Content` | 1:1 | `BaseBidJson`, `SystemsJson`, `CompanyInfoJson`, **`ProcessJson`**, schema ver |
| `Bid_Attachments` | 1:N | Invitation, drawings, specs, `spec-sheet-image`, etc. |
| `Bid_ActivityLog` | 1:N | Who changed what |
| `Bid_CalcSnapshots` | 1:N | Optional calc audit / verify |
| `Bid_MikeFiles` | 1:N | CSV uploads (versions kept; never overwrite history) |
| `Bid_MikeCsvRows` | 1:N | Parsed Mike lines |
| `Bid_SpecLines` | 1:N | Takeoff Specs qty grid lines |
| `Bid_Preferences` | user prefs | UI prefs |

### 6.2 Lookups (`Bid_*` masters)

| Table | Use |
|-------|-----|
| `Bid_Teams` | Captain / clerk / roles from Excel team list |
| `Bid_WageRates` | Calculator **wage scale** (burdened rate math) |
| `Bid_WageDecisions` | Davis-Bacon / decision **#** (process; ≠ wage rate) |
| `Bid_PayrollBurden` | Medicare, SS, SUTA, FUTA, WC, … |
| `Bid_ProjectTypes`, `Bid_BuildingTypes`, `Bid_States` | Dropdown masters |
| `Bid_SpecSystems`, `Bid_SpecAreas`, `Bid_SpecMaterials` | Spec sheet + Specs dropdowns |
| `Bid_ItemCatalog` | StructShare-style item search (price list) |
| `Bid_HelperMap` | Mike material phrase → base name helpers |

### 6.3 `Bids` header (live)

| Column | Meaning |
|--------|---------|
| `OurEntityId` | FK → `Ref_OurEntities` (**required**; no separate bidding-companies table) |
| `JobId` | Optional FK → `Ref_Jobs` (after award / link) |
| `TrimbleProjectId` | Optional link for Specs received qty |
| `EstimateNumber` | Business id (e.g. IDC6098) |
| `Status` | `draft` \| `submitted` \| `archived` — locks **Estimate math** only |
| `ProcessStage` | Pre workflow: intake → … → `result` (Outcome tab) |
| `OutcomeStatus` | `open` \| `awarded` \| `lost` \| `no_bid` \| `cancelled` \| `postponed` — **changeable** |
| `WorkType` | List filter |
| `SubmitDate`, `TimeEstimate` | Cover sheet |
| `IsDeleted` | Soft delete |

**Three concepts — do not mix**

1. **Stage** — where they are in Pre  
2. **Outcome** — win/lose on Outcome tab (gates Post Awarded / Lost UI)  
3. **Status** — draft/submitted/archived (calculator lock)

### 6.4 `Bid_Content` JSON split

| Column | Owns |
|--------|------|
| `BaseBidJson` | Estimate inputs (Excel Base Bid scalars) |
| `SystemsJson` | System rows |
| `CompanyInfoJson` | Client/GC counterpart (not full contract tier tree) |
| `ProcessJson` | Full PDF lifecycle: intake parties, assignment, setup, **`specSheets`**, award, lost, tiers, intelligence, … |

**Why JSON for process / base bid:** incomplete save, frequent shape evolution, form-shaped nested objects.  
**Why tables for Mike / Spec lines:** high row count, regenerate, filter, production hours.

### 6.5 Three different “spec” concepts (data)

| Concept | Storage | Stage |
|---------|---------|--------|
| Spec **PDFs** that apply | attachments + `process.insulationSpecs` | Setup / Spec sheets UI |
| Spec **sheet rules** (dropdowns) | `process.specSheets` inside `ProcessJson` | Before takeoff |
| Specs **qty grid** + Mike | `Bid_SpecLines`, `Bid_MikeFiles`, `Bid_MikeCsvRows` | Takeoff |

### 6.6 Bidding ER (simplified)

```text
Ref_OurEntities ──< Bids >── Ref_Jobs?
                     │
                     ├──1:1── Bid_Content
                     ├──1:N── Bid_Attachments
                     ├──1:N── Bid_ActivityLog
                     ├──1:N── Bid_MikeFiles ──< Bid_MikeCsvRows
                     ├──1:N── Bid_SpecLines
                     └──1:N── Bid_CalcSnapshots

Bid_WageRates / Bid_WageDecisions / Bid_SpecSystems / …  (shared lookups)
```

### 6.7 Reuse map (do not duplicate)

| Need | Use |
|------|-----|
| Our company | `Ref_OurEntities` via `Bids.OurEntityId` |
| Awarded job | `Ref_Jobs` via `Bids.JobId` |
| Users | `App_Users` |
| Haulers | `Ref_ExternalCompanies` — **not** for bidding CRM |
| Clearstory customers | `Clearstory_*` — integration only |

Full bidding checklist: [BIDDING_DATABASE_DESIGN.md](./BIDDING_DATABASE_DESIGN.md).

---

## 7. Domain D — Clearstory (CORs)

Mirror of Clearstory API for change-order / project reporting.

| Examples | Role |
|----------|------|
| `Clearstory_Company`, `Clearstory_Offices`, `Clearstory_Divisions` | Org tree |
| `Clearstory_Projects`, `Clearstory_Customers`, `Clearstory_Contracts` | Project graph |
| `Clearstory_Cors` | COR header (status, amounts, job #, …) |
| `Clearstory_ChangeNotifications` (+ contract link table) | CN workflow |
| `Clearstory_Rates` / `Clearstory_ProjectRates` | Rate books |
| `Clearstory_SyncState` / `Clearstory_SyncSnapshots` / `Clearstory_ApiPayloads` | Sync control + raw |

**Rule:** paint statuses/amounts from synced columns; do not invent parallel COR math in bidding tables.

---

## 8. Domain E — Siteline (billing / aging)

| Examples | Role |
|----------|------|
| `Siteline_EntityConfig` | Maps our `EntityId` → Siteline company token/config |
| `Siteline_Contracts` | Contract + project numbers, status, totals |
| `Siteline_PayApps` | Pay applications |
| `Siteline_AgingContracts` / `Siteline_AgingSummary` | Aging report cache |

Joins to ops often by **project / contract number** and `EntityId` → `Ref_OurEntities`.

---

## 9. Domain F — Connecteam (workforce)

| Examples | Role |
|----------|------|
| `Connecteam_Users`, `Connecteam_Jobs` | People & job sites |
| `Connecteam_TimeClocks`, `Connecteam_TimeActivities` | Actual hours (production green/red) |
| `Connecteam_Schedulers`, `Connecteam_ScheduledShifts` | Schedule |
| `Connecteam_TaskBoards`, `Connecteam_Tasks` | Tasks |
| `Connecteam_Forms`, `Connecteam_FormSubmissions` | Forms |
| `Connecteam_Conversations`, `Connecteam_Messages`, reads | Chat |
| `Connecteam_TimeOffRequests` | PTO |
| `Connecteam_WebhookEvents`, `Connecteam_SyncState`, `Connecteam_Account` | Ingest |

**Production report rule:** green/red = Connecteam **actual hours** vs **hours earned from received material** — not vs Mike takeoff hours. Hours live on report `totals` (API), not re-summed ad hoc in SQL for Specs.

---

## 10. Domain G — Trimble / StructShare

| Table | Role |
|-------|------|
| `Trimble_Projects` | Synced projects |
| `Trimble_ProjectLineItems` | Line items used for Specs “Qty Received” |
| `Trimble_LineItemRawExports` | Raw export payloads |
| `Trimble_SyncState` | Sync cursor |

`Bids.TrimbleProjectId` optionally links a bid to a Trimble project for received-material matching.

---

## 11. Cross-cutting design decisions

### 11.1 Hybrid relational + JSON (intentional)

| Store as columns / tables | Store as JSON |
|---------------------------|---------------|
| List filters, FKs, identities | Nested incomplete forms (`ProcessJson`) |
| Mike rows, Spec lines (bulk) | Base Bid / systems / company info shapes |
| Wage / burden lookups | Client `computed` snapshot (API; often in content/snapshots) |
| Sync mirrors with stable vendor ids | Occasional raw API payloads |

### 11.2 Multi-tenant-ish by entity

`Ref_OurEntities` is the company axis for jobs, Siteline config, and bids. Always filter list UIs by entity where the product requires it.

### 11.3 Integration isolation

Never write Clearstory/Siteline/Connecteam rows from bidding PATCH.  
Never use `Ref_ExternalCompanies` as estimator mechanical CRM.

### 11.4 Arrays replace / objects merge (API contract)

On `PATCH /bids/:id` `{ process }`: nested **objects merge**, **arrays replace**. Mint unique ids (`crypto.randomUUID()`) for array items; never keep template id `new-duct`.

---

## 12. Inventory (live TypeORM ≈ 80 tables)

### Trucking / shared refs
`Ref_OurEntities`, `Ref_Jobs`, `Ref_Materials`, `Ref_ExternalCompanies`, `Ref_ExternalSites`, `Ref_Drivers`, `Ref_TruckTypes`, `Fact_SiteTickets`, `Fact_TicketPhotos`  
*(Stage / rates / contacts / SP may still exist in DB from dump even if not every object is an entity.)*

### App
`App_Users`, `App_Roles`, `App_Permissions`, `App_RolePermissions`, `App_Settings`, `App_Files`, `App_EmailTemplates`

### Bidding
`Bids`, `Bid_Content`, `Bid_Attachments`, `Bid_ActivityLog`, `Bid_CalcSnapshots`, `Bid_MikeFiles`, `Bid_MikeCsvRows`, `Bid_SpecLines`, `Bid_SpecSystems`, `Bid_SpecAreas`, `Bid_SpecMaterials`, `Bid_ItemCatalog`, `Bid_HelperMap`, `Bid_Teams`, `Bid_WageRates`, `Bid_WageDecisions`, `Bid_PayrollBurden`, `Bid_ProjectTypes`, `Bid_BuildingTypes`, `Bid_States`, `Bid_Preferences`

### Clearstory / Siteline / Connecteam / Trimble
All `Clearstory_*`, `Siteline_*`, `Connecteam_*`, `Trimble_*` entities listed in §7–§10.

---

## 13. Assessment summary

| Area | Verdict | Comment |
|------|---------|---------|
| Original trucking star schema | **Strong** | Right pattern for tickets + rates |
| Stage + cursor SP | **Adequate** | Prefer set-based ETL + JSON raw long-term |
| Shared `Ref_OurEntities` / `Ref_Jobs` | **Strong** | Avoids company duplication |
| Bidding hybrid JSON + tables | **Right for this product** | Form speed + queryable takeoff |
| Integration mirrors in same DB | **Pragmatic** | Keep prefixes strict; don’t cross-write |
| Overall monolith | **B / B+** | Good enough to ship; not a pure enterprise multi-schema split |

**Bottom line:** Design is **fit for purpose** — not a textbook perfect warehouse, not a mess. Evolve with indexes, set-based ETL, and careful JSON boundaries; do **not** rewrite domains that already work.

---

## 14. Recommended improvements (no big-bang rewrite)

1. **Indexes:** `Fact_SiteTickets (TicketDate, JobID)`, `Bids (OurEntityId, ProcessStage, OutcomeStatus, IsDeleted)`, Mike/Spec by `BidId`.
2. **Stage:** add `RawPayloadJson` + slim typed columns; stop growing `Raw_*` forever.
3. **ETL:** replace cursor SP with set-based `MERGE` / batch insert.
4. **ProcessJson hot fields:** already denormalized (`ProcessStage`, `OutcomeStatus`, `WorkType`) — keep that pattern for any new list filters.
5. **Spec sheet rules:** stay in `ProcessJson.specSheets` until auto-fail vs takeoff needs queryable rows — then consider `Bid_SpecSheetRows`.
6. **Document FKs** missing on some sync tables (app-enforced) — add DB FKs only where cascade deletes are safe.

---

## 15. Related documents

| Doc | Scope |
|-----|--------|
| [FRONTEND_BIDDING_CONTEXT.md](../FRONTEND_BIDDING_CONTEXT.md) | FE read-order + IA |
| [docs/BIDDING_FRONTEND_API.md](./BIDDING_FRONTEND_API.md) §0 | Bidding chrome / APIs |
| [BIDDING_DATABASE_DESIGN.md](./BIDDING_DATABASE_DESIGN.md) | Bidding-only table rules |
| [FRONTEND_SPEC_SHEET.md](../FRONTEND_SPEC_SHEET.md) | Spec sheet rules shape |
| [FRONTEND_BIDDING_SPECS.md](../FRONTEND_BIDDING_SPECS.md) | Specs / Mike |
| [FRONTEND_PRODUCTION_REPORT.md](../FRONTEND_PRODUCTION_REPORT.md) | Production hours |
| Backend TypeORM | `trucking/src/database/entities/*` — **live schema truth** |
| Original dump | `GoFormzDB.sql` (notebook) / `GoFormzDB_local.bak` |

---

*When schema changes, update this file and the relevant domain FE handoff. Prefer entities + migrations over stale dump notebooks as the source of truth for “what’s live.”*
