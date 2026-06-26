# UX/UI Design Rework — Construction Logistics Platform

A design-only blueprint for reworking the frontend. No code in this document — it is the spec you
(or a designer) implement later, screen by screen.

**Scope:** all current routes — Operations dashboards (`/job`, `/material`, `/hauler`,
`/forensic`), Billing (`/billings`, `/clearstory/*`), Bidding (`/bidding/*`), Admin
(`/admin/*`), and Auth (`/login`, `/register`, `/pending`).

---

## 1. Who this product is for (design drivers)

| Persona | What they do daily | What the UI must optimize |
|---------|--------------------|---------------------------|
| **Operations manager** | Scans job/material/hauler dashboards, spots anomalies | Density, comparison, fast filtering, glanceable KPIs |
| **Estimator** | Builds bids, tunes wage/margin inputs, checks MIKE/PJ totals | Form ergonomics, live feedback, keyboard flow, no lost work |
| **Billing / PM coordinator** | Reconciles Siteline vs Clearstory, chases overdue pay apps | Status clarity, gap surfacing, aging buckets, export |
| **Admin** | Approves users, assigns permissions, toggles email jobs | Safety (confirmations), audit clarity, low frequency / high confidence |

Three traits that should shape every screen:

1. **This is a numbers product.** Money, hours, tonnage, aging days. Numbers deserve tabular
   alignment, consistent precision, and visual hierarchy (the total is the hero, inputs are quiet).
2. **Users live here for hours.** Prefer calm neutrals over saturated color; reserve brand orange
   for *one* job: the primary action or the key total on a screen.
3. **Trust is the feature.** Every computed figure should be explainable (drill-down or tooltip:
   "where did this number come from?"), every destructive action confirmable, every sync/job
   visibly fresh ("last synced 5 min ago").

---

## 2. Design principles (apply to every decision)

1. **One primary action per screen.** Orange filled button. Everything else is ink/outline/ghost.
2. **Canvas + cards.** Keep the executive pattern: `#F0F1F4` canvas, white cards with soft
   borders. Cards group by *task*, not by data table.
3. **Numbers right-aligned, tabular figures, fixed precision.** Money always 2 decimals with
   thousands separators; hours 1–2 decimals; percentages with explicit `%`.
4. **Progressive disclosure.** Default views show what 80% of users need; detail lives behind
   expansion rows, drawers, or a secondary tab — never behind a separate page when avoidable.
5. **Status is color + icon + label, never color alone.** (Accessibility and printability.)
6. **Empty, loading, error, and restricted states are designed, not defaulted.** Each list/detail
   screen needs all four states specified (see §9).
7. **RBAC-aware UI degrades gracefully.** Hidden ≠ broken: when a user lacks `bidding:summary`,
   the layout reflows; it doesn't show a hole (see §10).

---

## 3. Information architecture & navigation

### 3.1 Current issues

- The **workspace `<select>`** in the sidebar is low-discoverability: users don't realize there
  are three workspaces, and a form control is a weak affordance for the app's top-level switch.
- Admin links only appear in the *Operations* workspace, so admins "lose" settings when in
  Billing or Bidding.
- Clearstory has ~10 sub-routes but only one sidebar entry; everything else is reachable only by
  URL or in-page links.

### 3.2 Proposed navigation model

**Keep the fixed 264px left sidebar** (it works for data-dense desktop apps), with three changes:

1. **Replace the workspace `<select>` with a segmented switcher** — three icon+label tiles at the
   top of the sidebar (Operations / Billing / Bidding). Active tile gets brand-tinted background.
   One click, always visible, communicates "this app has three modes."
2. **Persistent bottom section for Admin** (visible in every workspace for admins): User
   management, Settings. Plus the existing user card with logout.
3. **Second-level nav for Clearstory** as an expandable group inside Billing:

```
BILLING
├─ Billings (overview)
└─ Clearstory ▾
   ├─ Projects
   ├─ CORs
   ├─ Rates
   ├─ Directory (Customers / Contracts)
   ├─ Tags
   ├─ Notifications
   └─ Settings
```

4. **Breadcrumbs in the page header** for anything ≥ 2 levels deep
   (e.g. `Clearstory / Projects / Acme Tower` or `Bidding / IDC6098`).

### 3.3 Global header (top bar)

Add a slim (56px) top bar to every authenticated page:

- **Left:** breadcrumb / page context.
- **Center (optional, phase 2):** global search (`⌘K`) across bids, projects, users.
- **Right:** company/entity selector (currently buried in `CompanyContext`), sync freshness
  indicator ("Siteline synced 12m ago"), notifications bell (gap alerts, approvals pending).

The entity selector matters: billing and bidding are entity-scoped today but the scoping is
invisible. Make the active company a visible, switchable chip.

---

## 4. Design tokens (refined, not replaced)

Keep the brand. Tighten the application of it.

### 4.1 Color

| Token | Value | Use |
|-------|-------|-----|
| `--brand` | `#FF7B11` | Primary action, active nav indicator, key total accent. **≤ 10% of any screen.** |
| `--brand-secondary` | `#F26620` | Hover/pressed of brand, gradient end (avatar, hero) |
| `--ink` | `#010101` | Text, default buttons |
| `--canvas` | `#F0F1F4` | App background |
| `--surface` | `#FFFFFF` | Cards, inputs, sidebar |
| **New** `--success` | `#15803D` (green-700) | Paid, approved, active, under-budget |
| **New** `--warning` | `#B45309` (amber-700) | Pending, aging 31–60, drafts needing attention |
| **New** `--danger` | `#B91C1C` (red-700) | Overdue, rejected, failed jobs, >90 aging |
| **New** `--info` | `#1D4ED8` (blue-700) | Informational chips, synced/neutral statuses |

Each semantic color gets a 3-stop scale: text (`-700`), tint background (`-50`), and border
(`-200`). Status pills = tint bg + dark text + 1px border (this matches what admin settings
already does — standardize it everywhere).

**Rule:** brand orange is *never* used as a status color. Orange = "act here", not "warning".

### 4.2 Typography (Geist, already loaded)

| Style | Size/weight | Use |
|-------|-------------|-----|
| Display | 24px / 600 | Page titles |
| Heading | 16px / 600 | Card titles |
| Sub | 13px / 500, ink/55 | Card descriptions, helper text |
| Body | 14px / 400 | Default |
| Numeric L | 22–28px / 650, tabular-nums | Hero totals (MIKE/PJ, KPIs) |
| Numeric M | 14px / 500, tabular-nums, right-aligned | Table cells |
| Label | 10–11px / 600 uppercase tracking-wide, ink/40 | Section eyebrows, table headers |
| Mono | Geist Mono 11–12px | IDs, permission keys, estimate #s |

Adopt `font-variant-numeric: tabular-nums` globally for any numeric column — it is the single
cheapest readability upgrade in a numbers product.

### 4.3 Spacing, radius, elevation

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Cards: 20–24px padding desktop, 16px mobile.
- Radius: 12px cards (`rounded-xl` — current), 8px inputs/buttons, 999px pills.
- Elevation: borders over shadows. One shadow level only (`shadow-sm`) for raised
  cards; modals/drawers get `shadow-xl`. No mid-level shadows.

### 4.4 Dark mode

Keep current decision (class-based, off by default). Design tokens above must each have a dark
counterpart documented when dark ships — don't hand-pick dark colors per component (the codebase
currently has per-component `dark:` classes; migrate them to tokens during the rework).

---

## 5. Component standards (the kit)

Build these as the shared kit before reworking pages — every page section below assumes them.

| Component | Spec |
|-----------|------|
| **Button** | Variants: `primary` (brand fill), `secondary` (ink fill — current "New estimate" style), `outline`, `ghost`, `danger`. Sizes sm/md. Loading state = spinner replaces label, width locked. |
| **StatusPill** | Semantic color tints (§4.1) + dot icon + label. One component, used by bids, users, pay apps, email jobs. |
| **KpiStat** | Label (eyebrow), value (Numeric L), delta (▲/▼ + % vs prior period, semantic color), optional sparkline. Used on all dashboards. |
| **DataTable** | Sticky header, right-aligned numeric columns, row hover, sortable headers (arrow indicator), column-level filter slots, pagination footer ("1–25 of 150"), bulk-select checkbox column, sticky first column on horizontal scroll. Density toggle (comfortable/compact) for ops users. |
| **FilterBar** | One pattern everywhere: left = segmented status filter, right = search input + date range + extra filters in a "Filters" popover with active-count badge. Active filters render as dismissible chips below the bar. Synced to URL params (admin/users already does this — make it universal). |
| **Drawer** | Right-side panel (480–640px) for detail/edit without losing list context. Replaces most modals. Modals remain only for confirmations and small forms. |
| **ConfirmModal** | Keep, but standardize: danger actions show the affected entity name in bold, destructive button is `danger` variant, default focus on Cancel. |
| **EmptyState** | Icon + one-line message + primary CTA. Dashed-border card (current bidding pattern — adopt everywhere). |
| **Skeleton** | Shape-matched skeletons (KPI blocks, table rows, card grids) instead of centered `LogoLoader` for content areas. LogoLoader only for full-page boot. |
| **RestrictedState** | Lock icon + "You don't have access to X" + the permission name in mono + "Contact your admin". One component for all RBAC denials. |
| **Toast** | Keep; add an "undo" action slot for reversible operations. |
| **FreshnessChip** | "Synced 12m ago" with relative time, amber after a threshold, red + retry if stale/failed. For Siteline/Clearstory data. |

---

## 6. Page-by-page rework

### 6.1 Operations dashboards (`/job`, `/material`, `/hauler`)

These three should share one template so users transfer learning between them:

```
┌──────────────────────────────────────────────────────┐
│ PageHeader: title · date-range picker · export       │
├──────────────────────────────────────────────────────┤
│ KPI row: 4 × KpiStat (totals, deltas, sparklines)    │
├────────────────────────────┬─────────────────────────┤
│ Primary chart (trend/bar)  │ Breakdown (top N donut/ │
│ 2/3 width                  │ ranked list) 1/3 width  │
├────────────────────────────┴─────────────────────────┤
│ FilterBar + DataTable (paginated, exportable)        │
└──────────────────────────────────────────────────────┘
```

- **Date range** is the master control — top right of header, presets (Today / 7d / 30d / MTD /
  Custom), persisted per dashboard in URL.
- Charts use one categorical palette derived from ink + brand + the semantic scale; identical
  series colors across all three dashboards (e.g. "tonnage" is always the same hue).
- Every chart has a table fallback (accessibility + export) via a "view data" toggle.

### 6.2 Forensic & audit (`/forensic`)

- Frame it as an **investigation tool**: search-first layout. Big search/filter panel at top
  (job, hauler, date, ticket #), results as DataTable with expandable rows showing the full
  audit trail for a ticket (timeline component: event dot + timestamp + actor + change).
- Add saved-filter chips ("Yesterday's exceptions", "Missing weights") — investigators repeat
  the same queries daily.

### 6.3 Billings (`/billings`)

- **Aging is the story.** Lead with an aging summary strip: 6 buckets (Current → >120) as
  clickable KpiStats; clicking a bucket filters the table below. Bucket colors: Current/1–30
  neutral, 31–60 warning tint, 61+ danger tint.
- The **reconciliation gaps banner** (Siteline has data, Clearstory doesn't) should be a
  persistent amber card at top with count + "Review gaps" CTA opening a Drawer that lists gap
  projects with one-click "open in Clearstory".
- Table rows: project, PM (with mailto), bucket columns right-aligned, row total bold. PM column
  gets an "email overdue summary" row action (wired to the existing email templates).

### 6.4 Clearstory (`/clearstory/*`)

- **Projects list** is the hub: FilterBar + DataTable, status pills, "last synced" FreshnessChip
  in the header.
- **Project detail** (`/clearstory/projects/[projectId]`): two-column — left 2/3 tabs
  (Overview / CORs / Rates / Activity), right 1/3 summary rail (status, customer, contract,
  totals, tags). Mirrors the bidding sheet's form+rail pattern for consistency.
- Directory, Rates, Tags, Notifications: standard FilterBar + DataTable template. Tags get
  inline color chips; Notifications get read/unread states and a "mark all read".

### 6.5 Bidding list (`/bidding`)

Current card grid is good. Refine:

- Add a **summary strip above the grid** (RBAC: `bidding:summary` only): count of drafts,
  total pipeline $, win-rate placeholder. Without permission the strip simply doesn't render.
- Cards: estimate # in mono, job name as title, StatusPill, entity, updated-at relative time,
  and — permission-gated — the PJ total as the card's Numeric M figure. Hover raises card 1px
  with border-brand/25.
- Add a **view toggle (cards ⇄ table)**; estimators comparing many bids want the table.
- Sort control: Updated (default) / Estimate # / Total.

### 6.6 Bid sheet (`/bidding/[id]`) — the flagship screen

The 3:1 form + sticky results rail layout is right. Polish pass:

- **Section nav:** left-edge mini step list (Header, Team, Project, Wage rate, Schedule &
  margin, Parking & lifts, Systems) that scroll-spies and jumps. Estimators bounce between
  sections constantly.
- **Sticky action bar** (top of form column): Save state ("Saved 2m ago" / "Unsaved changes" amber
  dot), Preview calculate, Save. Never let Save scroll away.
- **Results rail hierarchy:** MIKE/PJ hero cards stay top; below them the labor build-up and
  per-system table collapse into accordions (default: open Labor, collapsed Systems). The rail
  must visibly *react* to recalculation — keep the existing pulse/shimmer, plus flash-highlight
  any value that changed (300ms brand-tint fade) so users see what their edit moved.
- **D10 composite affordance:** the composite wage field is the #1 correctness trap (API 47.70 vs
  Excel 51.70). Give it an info tooltip explaining "crew composite — override to match your crew
  mix" and a subtle amber outline when it equals the raw burdened rate (likely unedited).
- **Inputs:** group numerics with unit suffixes inside the field (`$`, `%`, `hrs`); percent
  fields display human percent (100%) regardless of stored decimal (1.0) — the
  `parkingPeoplePercent` 1-vs-100 confusion is a UI problem, solve it at the input mask.
- **Restricted variant:** without `bidding:summary`, the rail is replaced by the RestrictedState
  card and the form column widens to a comfortable max-width (760px) — no dead space.

### 6.7 Bidding new (`/bidding/new`)

One centered card: entity, estimate #, job name → "Create draft". Show what happens next
("You'll land on the bid sheet"). Don't ask for anything the sheet can capture later.

### 6.8 Admin — Users (`/admin/users`)

- Keep table + URL filters. Upgrade detail editing from modal to **Drawer**: identity block,
  Role + Status selects, the bidding permission checkboxes (already built), created/last-login
  meta, and a future activity timeline slot.
- **Pending approvals deserve a dedicated zone:** a highlighted card above the table ("4 users
  awaiting approval") with inline Approve/Reject — admins shouldn't filter to find them.
- Bulk bar: when rows are selected, a sticky bottom bar slides up with bulk actions + count.

### 6.9 Admin — Settings (`/admin/settings`)

The page is becoming a long single column (RBAC + 2 email jobs + 2 templates + SMTP). Restructure
into **tabs**: `Access control` / `Email & jobs` / `Templates` / `Diagnostics`.

- Keep the env/admin/effective StatusPills pattern — it's good. Add "last run / next run"
  metadata to each job card, and put "Run now" behind the job card's overflow menu with a
  confirm.
- Access control tab hosts the BiddingRbacSettings card; design leaves room for future
  module sections (Dashboards, Siteline) using the same group layout.

### 6.10 Auth (`/login`, `/register`, `/pending`)

- Split-screen: left = brand panel (logo, one-line value prop, subtle truck/site illustration or
  photo with ink overlay), right = form card on canvas. Mobile: form only.
- `/pending`: friendly illustration + "Your account is awaiting approval" + who to contact +
  logout. It's many users' first impression — make it warm, not like an error page.

---

## 7. Data visualization standards

- Library-agnostic rules: max 6 series per chart; legend = toggleable chips; tooltips show all
  series at hovered x; y-axis abbreviated (`$43.8k`); gridlines ink/6.
- Money charts: bars/areas. Trends over time: lines. Composition: horizontal stacked bars
  (avoid pies above 4 slices).
- Every chart title states the question it answers ("Tonnage hauled per day", not "Chart").

---

## 8. Motion

- Keep the bidding fade-up/stagger system; promote it to the global kit (rename `bid-*` →
  `ui-*`) and apply to all card grids and rails.
- Durations: 150ms hovers, 250–450ms entrances, ease `cubic-bezier(0.22,1,0.36,1)`.
- Numbers that change animate (count-up over ≤400ms) only on the results rail and KPI stats.
- Everything respects `prefers-reduced-motion` (entrances become instant, count-ups snap).

---

## 9. State matrix (design every cell)

| Screen type | Loading | Empty | Error | Restricted |
|-------------|---------|-------|-------|------------|
| Dashboard | KPI + chart skeletons | "No data for this range" + widen-range CTA | Inline error card + Retry | RestrictedState full-page |
| List/table | 8 skeleton rows | EmptyState + create CTA | Banner above table + Retry, stale data stays visible | RestrictedState full-page |
| Detail/form | Field skeletons | n/a | Toast + inline field errors | Rail/section-level RestrictedState |
| Admin settings | Card-level spinners (current) | "Backend not ready" amber card (current — keep) | Toast + card-level retry | Admin-only routes; non-admins never see them |

Error copy rule: say what failed + what to do ("Couldn't load bids — check your connection and
retry"), never raw API messages.

---

## 10. RBAC visibility rules (design contract)

| Permission | UI effect |
|------------|-----------|
| `bidding:summary` absent | Results rail → RestrictedState; list summary strip hidden; card $ figures hidden; layout reflows (no gaps) |
| `bidding:write` absent (future) | Form fields read-only style (not disabled-grey: keep readable ink, lock icon in section headers); New estimate hidden |
| `bidding:read` absent (future) | Bidding workspace hidden from sidebar switcher |
| `role: admin` | Sees everything + Admin nav group in all workspaces |

Principle: **hide entry points, explain dead-ends.** If a user can't reach a feature, remove the
nav item; if they're already on a page and lack a sub-permission, show RestrictedState with the
permission name so admins can act on screenshots.

---

## 11. Responsive & accessibility

**Breakpoints:** desktop-first product, but must not break down to tablet.

- ≥1280px: full layout (sidebar + rail patterns).
- 768–1279px: sidebar collapses to 64px icon rail (tooltip labels); bid results rail moves below
  the form as a sticky-bottom summary bar (MIKE/PJ always visible) expanding to full detail.
- <768px: sidebar becomes a sheet behind a hamburger; tables become card lists (key fields only,
  "view all" opens detail); dashboards stack KPI → chart → table.

**Accessibility baseline (WCAG 2.1 AA):**

- Text contrast ≥ 4.5:1 — audit ink/40–55 tints on canvas; bump any failures to ink/60+.
- Brand orange on white fails AA for small text — never use `--brand` for body-size text;
  brand-colored text must be ≥ 18px/600 or sit on ink.
- Full keyboard support: visible focus rings (brand 2px — already the pattern), focus traps in
  modals/drawers, `Esc` closes, logical tab order on the bid sheet (top-to-bottom per section).
- All status pills carry text labels (already the rule in §2.5); icons get `aria-hidden` +
  adjacent text.
- Tables: proper `<th scope>`, sort state via `aria-sort`, row actions reachable by keyboard.

---

## 12. Implementation roadmap (when you pick this up)

| Phase | Work | Outcome |
|-------|------|---------|
| **1. Foundations** | Semantic color tokens, tabular-nums, Button/StatusPill/KpiStat/EmptyState/Skeleton/RestrictedState, rename `bid-*` motion to global | Kit exists; no page redesigns yet |
| **2. Navigation shell** | Segmented workspace switcher, persistent admin group, top bar with entity selector + breadcrumbs, Clearstory subnav | IA fixed app-wide |
| **3. Flagships** | Bid sheet polish (§6.6), Bidding list (§6.5), Billings aging (§6.3) | Highest-traffic screens reworked |
| **4. Dashboards** | Shared dashboard template across job/material/hauler, chart standards | Consistent ops experience |
| **5. Admin & long tail** | Settings tabs, Users drawer + pending zone, Clearstory pages on the list template, auth screens | Full coverage |
| **6. Responsive + a11y audit** | Tablet/mobile behaviors, contrast/keyboard audit | AA baseline |

Each phase ships independently; nothing blocks on a big-bang redesign.

---

## 13. Open design decisions (decide before phase 2)

1. **Top bar vs. no top bar** — the entity selector and sync freshness need a home; header bar is
   the recommendation, but it costs 56px of vertical space on dense dashboards.
2. **Dark mode timing** — tokens are designed to support it; recommend deferring UI until after
   phase 4 unless field users (truck cabs, night shifts) ask sooner.
3. **Global search (⌘K)** — high value for estimators/PMs, needs a backend search endpoint.
4. **Table density default** — comfortable vs compact for ops dashboards; suggest compact default
   on `/forensic` only, comfortable elsewhere.
