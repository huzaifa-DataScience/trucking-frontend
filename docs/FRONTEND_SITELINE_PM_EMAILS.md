# Siteline PM emails & Siteline ↔ Clearstory gap alerts

This document defines **how automated emails should work** for:

1. **Lead PM overdue alerts** (Siteline AR data → email each PM).
2. **Siteline–Clearstory reconciliation gaps** (Siteline has billable/overdue context but **no comparable Clearstory data** → email operations).

The **backend sends all mail**; the frontend only provides **admin template editing**, **toggles**, and **SMTP test** (see [FRONTEND_EMAIL_TEMPLATES.md](./FRONTEND_EMAIL_TEMPLATES.md), [ADMIN_OVERDUE_EMAIL_TEMPLATE.md](./ADMIN_OVERDUE_EMAIL_TEMPLATE.md)).

---

## 1. Problem statement

| Scenario | Who gets email | Why |
|----------|----------------|-----|
| Pay apps are **overdue** in Siteline (synced snapshot) | **Lead PM** (`leadPmEmail` on each contract) | PM must act on AR / billing |
| Siteline shows projects/overdue $ but **Clearstory has nothing to compare** (no project match or empty mirror) | **JoAnnabelle Salalila** — `joannabelle.salalila@Goelservices.com` | Ops/reconciliation cannot validate CORs vs billing; data integrity issue |

These are **two separate email jobs** with **two template purposes** and **different recipients**.

---

## 2. Architecture (backend-owned)

```text
Cron / scheduler (e.g. daily after Siteline + Clearstory sync)
        │
        ├─► Job A: siteline.overdue_leadpm
        │      • Query Siteline aging-overdue (per entityId if multi-company)
        │      • Group rows by leadPmEmail
        │      • One email per PM with HTML table
        │
        └─► Job B: siteline.clearstory_data_gap
               • Compare Siteline projects/contracts vs Clearstory mirror
               • Build list of “Siteline-only” or “no Clearstory comparison” rows
               • One email (or digest) to gap alert recipient(s)
```

**SMTP:** Same env as overdue mail: `SMTP_*`, `OVERDUE_EMAIL_FROM` (or dedicated `GAP_ALERT_EMAIL_FROM` if needed).

**Templates:** Stored in `App_EmailTemplates`, selected by `purpose` (active row only).

**Frontend:** Does not compose or send email bodies.

---

## 3. Email job A — Lead PM overdue (existing, “proper” setup)

### 3.1 Purpose

| Field | Value |
|-------|--------|
| `purpose` | `siteline.overdue_leadpm` |
| Recipient | `leadPmEmail` from Siteline sync (`leadPMs` on contract) |
| Data source | `GET /siteline/aging-overdue` logic (DB snapshot), **not** live GraphQL at send time |

### 3.2 Sending rules (backend)

1. **Eligibility**
   - Pay app: not `PAID`, not `DRAFT`.
   - `daysPastDue >= threshold` (env `OVERDUE_EMAIL_DAYS`, default **51** = inclusive “at least 51 days”).
   - Valid `leadPmEmail` (non-empty, passes basic email validation).
2. **Grouping**
   - **One email per distinct `leadPmEmail`** per run (per `entityId` if jobs are per-company).
   - Subject/body include PM name and item count.
3. **Deduping (recommended)**
   - Do not resend the same `(leadPmEmail, contractId, payAppId/invoiceNumber)` within **N hours** (e.g. 24h) unless amount or daysPastDue changed materially.
   - Store last-sent in `App_EmailLog` or equivalent (backend table TBD).
4. **Enable gates** (both must be true)
   - Env: `OVERDUE_EMAIL_ENABLED=true`
   - Admin SQL toggle: `App_Settings.overdue_email_sending_enabled` (default on) — see [ADMIN_OVERDUE_EMAIL_TEMPLATE.md](./ADMIN_OVERDUE_EMAIL_TEMPLATE.md).

### 3.3 Template placeholders

| Placeholder | Meaning |
|-------------|---------|
| `{{leadPmName}}` | PM display name |
| `{{daysThreshold}}` | Threshold from env (e.g. 50 or 51 — document inclusive rule in template copy) |
| `{{itemCount}}` | Rows in this PM’s table |
| `{{itemsTableHtml}}` | Pre-built HTML table (project, invoice #, due date, days past due, net $) |

**Suggested table columns in `itemsTableHtml`:**

| Column | Source field |
|--------|----------------|
| Project | `projectName` or `internalProjectNumber` |
| Invoice # | `invoiceNumber` |
| Due date | `dueDate` (formatted) |
| Days past due | `daysPastDue` |
| Net AR | `netDollars` (currency) |
| Status | `status` |

### 3.4 PM email — “proper” checklist

- [ ] Cron runs **after** Siteline aging sync completes (avoid empty sends).
- [ ] Respect **`entityId`** per company (GOEL / GOEL DC / DCB) if snapshots are per-entity — see [FRONTEND_SITELINE_COMPANY_FILTER.md](./FRONTEND_SITELINE_COMPANY_FILTER.md).
- [ ] Skip rows with missing/invalid `leadPmEmail`; log count of skipped rows.
- [ ] BCC or archive optional ops mailbox (product decision).
- [ ] Admin can edit template via `GET/PUT /admin/email-templates/active?purpose=siteline.overdue_leadpm`.
- [ ] Admin toggle + env master documented in settings UI (`/admin/settings`).

### 3.5 Frontend (already partially wired)

| Item | Location |
|------|----------|
| Overdue list UI | `src/app/(dashboard)/billings/page.tsx` (Overdue tab) |
| `leadPmName` / `leadPmEmail` display | Same |
| Admin overdue toggle + SMTP test | `src/app/admin/settings/page.tsx` |
| Template API client | `src/lib/api/endpoints/admin.ts` |
| Legacy template shortcut | `getSitelineOverdueEmailTemplate()` → `/admin/email-templates/siteline-overdue` (may map to active purpose on backend) |

**Gap:** Full generic template editor UI for all purposes may still be minimal; admins can use API or expand Settings UI later.

---

## 4. Email job B — Siteline data with no Clearstory comparison (NEW)

### 4.1 Business rule (what “problem” means)

Trigger an alert when **all** of the following are true:

1. **Siteline side has meaningful data** for a project/contract — e.g. appears on aging/overdue snapshot **or** has non-zero overdue/net dollars (define threshold in backend).
2. **Clearstory side cannot be used for comparison** — any of:
   - **No matching Clearstory project** in `Clearstory_Projects` mirror.
   - Matching project exists but **no CORs / no synced rows** to compare (empty `Clearstory` activity).
   - `reconciliation` status is explicitly **missing** / **not_comparable** (when backend implements summary reconciliation).

**Intent:** If billing exists in Siteline but Clearstory has nothing to line up against, ops must fix sync, project linking, or data entry — **not** the lead PM’s overdue workflow.

### 4.2 Recipient

| Role | Email |
|------|--------|
| Primary (required) | `joannabelle.salalila@Goelservices.com` |

**Configuration (backend env — do not hardcode only in template):**

```env
SITELINE_CLEARSTORY_GAP_ALERT_TO=joannabelle.salalila@Goelservices.com
SITELINE_CLEARSTORY_GAP_ALERT_ENABLED=true
SITELINE_CLEARSTORY_GAP_ALERT_CC=   # optional comma-separated
```

Admin toggle (recommended, mirror overdue pattern):

| App_Settings key | Default |
|------------------|---------|
| `siteline_clearstory_gap_alert_enabled` | `true` |

### 4.3 Purpose & template

| Field | Value |
|-------|--------|
| `purpose` | `siteline.clearstory_data_gap` |
| `templateKey` (seed) | `siteline.clearstory_data_gap.v1` |

**Suggested subject:**

```text
Siteline billing without Clearstory match — {{gapCount}} project(s)
```

**Suggested placeholders:**

| Placeholder | Meaning |
|-------------|---------|
| `{{gapCount}}` | Number of projects/rows in digest |
| `{{runAt}}` | ISO or friendly timestamp of job run |
| `{{entityName}}` | Our company name (GOEL / GOEL DC / DCB) if per-entity |
| `{{gapsTableHtml}}` | HTML table of gap rows |
| `{{dashboardUrl}}` | Optional link to app (e.g. Clearstory projects or Billings) |

**Suggested `gapsTableHtml` columns:**

| Column | Source |
|--------|--------|
| Siteline project | `projectName` |
| Internal # | `internalProjectNumber` |
| Siteline PO / # | `projectNumber` |
| Lead PM | `leadPmName` / `leadPmEmail` |
| Net overdue $ | `netDollars` (or aging total) |
| Clearstory match | `NONE` / `project id` if partial |
| Match key tried | e.g. `jobNumber=31019` |
| Notes | `NO_CLEARSTORY_PROJECT`, `CLEARSTORY_EMPTY`, etc. |

### 4.4 Project matching logic (backend — must be explicit)

Compare Siteline ↔ Clearstory using a **deterministic key order** (first hit wins; log which key matched):

| Priority | Siteline field | Clearstory field |
|----------|----------------|------------------|
| 1 | `internalProjectNumber` (trim) | `jobNumber` (trim) |
| 2 | Numeric substring from `projectName` | `jobNumber` |
| 3 | `projectNumber` (PO) | search `name` / custom field if available |
| 4 | Normalized `projectName` | normalized `name` (fuzzy — last resort) |

**Gap =** no row in `Clearstory_Projects` after keys exhausted **OR** project exists but `GET .../summary` shows zero CORs and zero comparable totals (define in reconciliation service).

Document chosen rules in backend `SitelineClearstoryReconciliationService` (name TBD).

### 4.5 Scheduling

| Option | Recommendation |
|--------|----------------|
| Same cron as overdue | After both Siteline + Clearstory syncs |
| Frequency | Daily (or 2× daily if sync is frequent) |
| Dedupe | Do not send duplicate digest for unchanged gap set within 24h |

### 4.6 Enable gates

```text
effectiveGapAlertEnabled =
  SITELINE_CLEARSTORY_GAP_ALERT_ENABLED === true
  AND adminToggle (siteline_clearstory_gap_alert_enabled) !== false
  AND SMTP configured
```

---

## 5. API & admin (backend to implement)

### 5.1 New admin settings (mirror overdue)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/admin/settings/siteline-clearstory-gap-alert` | — |
| `PATCH` | `/admin/settings/siteline-clearstory-gap-alert` | `{ "enabled": true }` |

Response shape (suggested):

```json
{
  "envMasterEnabled": true,
  "adminToggleEnabled": true,
  "effectiveEnabled": true,
  "recipientTo": "joannabelle.salalila@Goelservices.com"
}
```

### 5.2 Template management

Use generic email template API — [FRONTEND_EMAIL_TEMPLATES.md](./FRONTEND_EMAIL_TEMPLATES.md):

- `GET /admin/email-templates/purposes` → include `siteline.clearstory_data_gap`
- `GET /admin/email-templates/active?purpose=siteline.clearstory_data_gap`
- `PUT /admin/email-templates/active?purpose=siteline.clearstory_data_gap`

Seed default body example:

```html
<p>Hi,</p>
<p>The following Siteline project(s) have billing/overdue data but no usable Clearstory data for comparison.</p>
{{gapsTableHtml}}
<p>Run time: {{runAt}}</p>
<p>Please review Clearstory sync and project/job number alignment.</p>
```

### 5.3 Optional read API for UI (later)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/siteline/reconciliation/gaps?entityId=` | Show gap list on Billings or Clearstory ops (read-only) |

Frontend can add a “Data gaps” banner when this endpoint returns `items.length > 0`.

---

## 6. Frontend implementation checklist

### Phase 1 — Backend (required for emails to send)

See **[BACKEND_SITELINE_PM_EMAILS.md](./BACKEND_SITELINE_PM_EMAILS.md)**.

- [ ] Backend: implement Job B + env + seed template `siteline.clearstory_data_gap.v1`
- [ ] Backend: `GET /siteline/reconciliation/gaps`, gap settings, manual job POST
- [ ] Backend: reconciliation match rules + gap detection
- [ ] Confirm Job A (PM overdue) uses synced data + `leadPmEmail` grouping per §3

### Phase 2 — Admin UI (this repo) — **done**

- [x] `src/app/admin/settings/page.tsx` — PM overdue toggle, gap alert toggle, run job, SMTP test
- [x] `src/components/admin/EmailTemplateEditor.tsx` — both purposes
- [x] `src/lib/api/endpoints/admin.ts` — gap settings + template PUT with query `purpose`
- [x] [FRONTEND_EMAIL_TEMPLATES.md](./FRONTEND_EMAIL_TEMPLATES.md) updated

### Phase 3 — Operator visibility (this repo) — **done**

- [x] `src/components/billings/SitelineClearstoryGapsBanner.tsx` on Billings page
- [ ] Clearstory project summary: show `reconciliation` when backend replaces placeholder

---

## 7. Environment variables (summary)

| Variable | Job | Notes |
|----------|-----|-------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Both | Required |
| `OVERDUE_EMAIL_FROM` | A (and maybe B) | From address |
| `OVERDUE_EMAIL_ENABLED` | A | Master switch PM overdue |
| `OVERDUE_EMAIL_DAYS` | A | Default 51 |
| `SITELINE_CLEARSTORY_GAP_ALERT_ENABLED` | B | Master switch gap alert |
| `SITELINE_CLEARSTORY_GAP_ALERT_TO` | B | `joannabelle.salalila@Goelservices.com` |
| `SITELINE_CLEARSTORY_GAP_ALERT_CC` | B | Optional |

---

## 8. Testing

| Test | How |
|------|-----|
| PM email | Seed one overdue pay app with your email as `leadPmEmail`; run cron manually; verify table HTML |
| Gap alert | Seed Siteline row with `internalProjectNumber` **not** in Clearstory; run gap job; verify JoAnnabelle receives mail |
| Toggles off | Admin toggle false → no send; env false → no send |
| SMTP | `POST /admin/settings/smtp-test-email` from `/admin/settings` |
| Multi-company | Run jobs per `entityId` 1, 2, 3 if snapshots are split |

---

## 9. Open questions (confirm with product / JoAnnabelle)

| # | Question |
|---|----------|
| 1 | Should gap alert be **one digest email** or **one email per project**? (Recommend digest.) |
| 2 | Should PM overdue emails still send when Clearstory gap exists for same project? (Recommend **yes** — different audiences.) |
| 3 | Exact match key: is `internalProjectNumber` ↔ `jobNumber` always correct? |
| 4 | Minimum `$` or overdue days before a Siteline row counts as “meaningful”? |
| 5 | Add CC to billing manager or only JoAnnabelle? |

---

## 10. Related docs

- [FRONTEND_EMAIL_TEMPLATES.md](./FRONTEND_EMAIL_TEMPLATES.md) — admin template API
- [ADMIN_OVERDUE_EMAIL_TEMPLATE.md](./ADMIN_OVERDUE_EMAIL_TEMPLATE.md) — overdue toggle & SMTP test
- [FRONTEND_AGING_REPORT.md](./FRONTEND_AGING_REPORT.md) — overdue fields & `leadPmEmail`
- [FRONTEND_SITELINE_COMPANY_FILTER.md](./FRONTEND_SITELINE_COMPANY_FILTER.md) — `entityId` on Siteline APIs
- [frontend-clearstory-api.md](./frontend-clearstory-api.md) — projects, summary `reconciliation` placeholder

---

*Recipient for gap alerts: **joannabelle.salalila@Goelservices.com** (configurable via `SITELINE_CLEARSTORY_GAP_ALERT_TO`).*
