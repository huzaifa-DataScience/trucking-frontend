# UX/UI Design — Workforce (Connecteam mirror)

Design spec for the **Workforce** frontend module. API contract: [FRONTEND_CONNECTEAM.md](./FRONTEND_CONNECTEAM.md).

**Scope:** read mirror + write APIs under `/connecteam/*`. Frontend never calls Connecteam directly.

---

## 1. Product decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Navigation | **Fourth workspace** in sidebar (Ops / Billing / Bidding / **Workforce**) |
| 2 | Default landing | **Linked non-admin** → `/workforce/my-day` · **Admin** → `/workforce` (Overview) |
| 3 | Job at clock-in | **Optional** job picker before clock-in; remember last job in `localStorage` |
| 4 | Geolocation (`locationData`) | **Future** — do not block v1 on GPS |
| 5 | Team chat | **Future** — out of v1/v2; no chat routes until backend message sync improves |

**v1 focus:** status gate, identity link, My day clock, Overview, Time & attendance, Time off, Crew (admin link), Schedule (read + admin CRUD). Forms/tasks = phase 3+.

---

## 2. Personas & design drivers

| Persona | Primary screens | Device | One primary action |
|---------|-----------------|--------|-------------------|
| Field worker | My day | Phone | Clock in / Clock out |
| Foreman / lead | Time (job filter), Schedule | Tablet / desktop | Review punches |
| Ops / PM | Overview, Time, reports | Desktop | Find hours by job |
| Admin | Crew, Schedule, Time off approve, manual time | Desktop | Link user / approve PTO |

Apply global principles from [UX_UI_DESIGN_REWORK.md](./UX_UI_DESIGN_REWORK.md):

- Canvas `#F0F1F4` + white cards
- Orange = **one** primary action per screen (clock button on My day)
- Tabular numbers (`ui-num`), hours 1 decimal
- Mirror freshness visible (`lastSyncAt` from `/connecteam/status`)
- Designed empty / loading / error / restricted states

---

## 3. Information architecture

### 3.1 Sidebar (Workforce workspace)

```
WORKFORCE
├─ Overview           /workforce
├─ My day             /workforce/my-day
├─ Time & attendance  /workforce/time
├─ Schedule           /workforce/schedule
├─ Time off           /workforce/time-off
└─ Crew               /workforce/crew        (admin-heavy; link tool)
```

**Future (not v1):** Forms, Tasks, Team chat.

**Admin nav:** unchanged at bottom (Users, Settings). Workforce user linking can also live under Admin → Settings → Workforce later.

### 3.2 Workspace switcher

Add fourth tile to segmented switcher:

| Tile | Label | Default route |
|------|-------|---------------|
| Ops | Ops | `/job` |
| Billing | Billing | `/billings` |
| Bidding | Bidding | `/bidding` |
| Workforce | Workforce | see §3.3 |

Storage key: extend `construction-logistics-workspace` with value `workforce`.

### 3.3 Landing logic

On navigate to `/workforce` or workspace switch to Workforce:

```
GET /connecteam/status → if !ready → module-not-configured page

GET /connecteam/users/me
  if !linked → /workforce/link-required (RestrictedState)

if role === admin → /workforce (Overview)
else → /workforce/my-day
```

Direct URLs always honored (deep links to Time, Schedule, etc.).

### 3.4 Job context (cross-module)

No full job detail page yet. Embed workforce in job flow via:

- Overview **Hours by job** table → link to `/workforce/time?job=<normalizedJobNumber>`
- Time & Schedule filters: job search (`/connecteam/jobs?search=`)
- **Future:** `/job/[id]` tab “Workforce” when job detail ships

---

## 4. Global patterns

### 4.1 Module status bar

After `GET /connecteam/status`, show in page header subtitle or chip:

- `Workforce · synced {relative time}` when `lastSyncAt` present
- Warning tint if sync &gt; 6h old

Full blocking state when `ready: false`:

- Title: “Workforce not configured”
- Message: contact admin / backend not migrated

### 4.2 Identity gate

`GET /connecteam/users/me`:

| `linked` | UI |
|----------|-----|
| `true` | Normal module |
| `false` | `RestrictedState`: “Workforce profile not linked — ask admin to link your portal email to the crew roster.” Permission hint: admin link flow |

Block clock-in/out and PTO submit when not linked.

### 4.3 RBAC (v1)

| Action | Rule |
|--------|------|
| Clock self | Linked user; `userId` must match `/users/me` |
| Clock others, manual time, schedule CRUD, PTO approve, user link | `role === 'admin'` |
| Read lists / reports | Authenticated (future: `workforce:read`) |

Use `RestrictedState` for admin-only actions; hide primary buttons when not allowed.

### 4.4 Timestamps & JSON fields

- Display: convert Unix **seconds** (parse strings) to local datetime
- Store/send: IANA timezone default `America/Los_Angeles`
- Client-parse: `assignedUserIdsJson`, `userIdsJson`, `summaryJson`

### 4.5 `recordSource` pills

| Value | Label | Tone |
|-------|-------|------|
| `sync` | Connecteam | neutral |
| `native` | App | info |

---

## 5. Screen specifications

### 5.1 Overview — `/workforce`

**Audience:** Admin default landing; ops managers.

**APIs:** `/status`, `/reports/hours-by-job`, open shifts via `/time-activities` (filter `endTimestamp` null).

**Layout:**

1. `PageHeader` — title “Workforce”, subtitle with sync freshness
2. KPI strip (4) — `KpiStat`:
   - Hours this week (sum from report or activities)
   - Clocked in now (count open shifts)
   - Pending PTO (admin; count `status=pending`)
   - Jobs with hours (period)
3. Card: **Hours by job** — table from `/reports/hours-by-job`, columns: Job #, Title, Total hours, Shifts → row links to Time filtered by job
4. Card: **On site now** — compact list of open shifts (name, job, since)
5. Card: **Sync** — `lastSyncAt`, `configured`, message from status

**States:** loading skeleton, empty mirror (“Run sync on backend”), error toast.

---

### 5.2 My day — `/workforce/my-day`

**Audience:** Field workers; non-admin default landing.

**APIs:** `/users/me`, `/time-clocks`, `/time-clocks/:id/open-shift`, `POST clock-in/out`, optional `/jobs?search=`, `/scheduled-shifts?userId=&` (today).

**Layout (mobile-first, max-width ~480px centered on desktop):**

```
┌─────────────────────────────┐
│ {Name} · {timeClock name}   │
│ {optional job label}        │
├─────────────────────────────┤
│                             │
│   [ CLOCK IN ]  or          │  ← sticky bottom bar on mobile
│   [ CLOCK OUT ]             │     orange filled, 56px min height
│                             │
│ Clocked in 6:42 AM · 3h 12m │  ← client timer when open
├─────────────────────────────┤
│ Today's schedule            │  ← next shift today if any
├─────────────────────────────┤
│ Job (optional) ▾            │  ← search jobs; remember last in localStorage
└─────────────────────────────┘
```

**Clock flow:**

1. Load default `timeClockId` (first non-archived or saved preference)
2. `GET open-shift` → show IN or OUT
3. Optional job selected → include `jobId` on clock-in only
4. Success → toast + refresh; errors mapped (`400` already in, `403` wrong user)

**No geolocation in v1.**

**States:** not linked (block), no time clocks, loading, saving on button.

---

### 5.3 Time & attendance — `/workforce/time`

**APIs:** `/time-activities` (paginated), admin: `POST/PATCH time-activities`.

**Filters (sticky):** date range, job search, user (admin), time clock.

**Table columns:** Worker | Job # | In | Out | Hours | Source | Status (open/closed)

- Row click → **drawer** with notes, manager edit (admin)
- Admin primary: “Add manual entry” modal

**Query params:** `?job=02768` from Overview / future job tab.

---

### 5.4 Schedule — `/workforce/schedule`

**APIs:** `/schedulers`, `/scheduled-shifts`, admin shift CRUD.

**v1 view:** week list (Mon–Sun groups), not full calendar grid.

**Shift card:** title, job #, time range, assigned names (resolve user ids), location.

**Admin:** Add / Edit / Delete shift (confirm delete). Side panel form.

---

### 5.5 Time off — `/workforce/time-off`

**Tabs:** `My requests` | `Team` (admin: pending queue)

**Employee:** request form (dates, all-day, note) → `POST /time-off`

**Admin:** approve/deny with manager note → `PATCH .../status`

**Status pills:** pending (warning), approved (success), denied (danger).

---

### 5.6 Crew — `/workforce/crew`

**APIs:** `/users` (paginated), admin: `PATCH .../link-app-user`.

**Table:** Name | Email | Employee ID | Portal link (Linked / Not linked)

**Admin row action:** Link to portal user (search App users).

---

### 5.7 Link required — `/workforce/link-required`

Static `RestrictedState` when `/users/me` → `linked: false`. Link back to Overview (read-only) if admin needs to browse reports without self punch.

---

## 6. Component reuse

| Need | Existing |
|------|----------|
| KPI strip | `KpiStat` |
| Cards | `Card`, `CardHeader` |
| Tables | `SummaryTable` patterns / job dashboard |
| Status | `StatusPill` |
| Empty / blocked | `EmptyState`, `RestrictedState` |
| Buttons | `Button` / `buttonClasses` |
| Page shell | `PageHeader`, dashboard layout |
| Loading | `Skeleton`, `LogoLoader` |
| Sticky actions | Same pattern as `BidSheetToolbar` bottom bar |

---

## 7. Implementation phases

| Phase | Routes | Outcome |
|-------|--------|---------|
| **P0** | API client + types, status gate, `/workforce/link-required`, `/workforce/my-day` | Field clock works |
| **P1** | `/workforce`, `/workforce/time` | Ops visibility + job filter |
| **P2** | `/workforce/time-off`, `/workforce/crew` | PTO + admin link |
| **P3** | `/workforce/schedule` | Schedule view + admin CRUD |
| **P4** | Job detail Workforce tab | When `/job/[id]` exists |
| **Future** | Chat, Forms, Tasks, GPS on clock, offline queue | Per API open questions |

---

## 8. Frontend must not

- Call `api.connecteam.com` or embed Connecteam widgets (v1)
- Expose `POST /connecteam/sync` to non-admin UI
- Assume real-time data — always show sync freshness on reports
- Build chat, form builder, or DM UI until backend phase (decision #5)

---

## 9. Open items for backend coordination

- Default `timeClockId` for org (or always pick first non-archived)
- Which 2–3 forms need static UI (when Forms phase starts)
- `workforce:*` permission keys (optional; v1 uses `admin` + linked user)
- Message history sync before chat UI

---

## 10. Route map (quick reference)

| Route | Screen |
|-------|--------|
| `/workforce` | Overview |
| `/workforce/my-day` | Clock in/out |
| `/workforce/time` | Time & attendance |
| `/workforce/schedule` | Schedule |
| `/workforce/time-off` | PTO |
| `/workforce/crew` | Roster + link |
| `/workforce/link-required` | Not linked gate |
