# Backend implementation — Siteline PM emails & Clearstory gap alerts

Implement this in the **NestJS logistics API** (not this frontend repo). The frontend already calls these routes.

---

## 1. Environment variables

```env
# SMTP (shared)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
OVERDUE_EMAIL_FROM=billing@goelservices.com

# Job A — lead PM overdue
OVERDUE_EMAIL_ENABLED=true
OVERDUE_EMAIL_DAYS=51

# Job B — Siteline vs Clearstory gap
SITELINE_CLEARSTORY_GAP_ALERT_ENABLED=true
SITELINE_CLEARSTORY_GAP_ALERT_TO=joannabelle.salalila@Goelservices.com
SITELINE_CLEARSTORY_GAP_ALERT_CC=
SITELINE_CLEARSTORY_GAP_MIN_NET_DOLLARS=0
```

---

## 2. App settings (SQL `App_Settings`)

| Key | Default | Used by |
|-----|---------|---------|
| `overdue_email_sending_enabled` | `true` | Job A admin toggle |
| `siteline_clearstory_gap_alert_enabled` | `true` | Job B admin toggle |

---

## 3. Email templates (seed on deploy)

### `siteline.overdue_leadpm.v1`

- **purpose:** `siteline.overdue_leadpm`
- **subject:** `Overdue pay apps (≥ {{daysThreshold}} days): {{itemCount}} item(s)`
- **body:** greeting + `{{itemsTableHtml}}`

### `siteline.clearstory_data_gap.v1`

- **purpose:** `siteline.clearstory_data_gap`
- **subject:** `Siteline billing without Clearstory match — {{gapCount}} project(s)`
- **body:**

```html
<p>Hi,</p>
<p>The following Siteline project(s) have billing/overdue data but no usable Clearstory data for comparison.</p>
{{gapsTableHtml}}
<p>Run time: {{runAt}}</p>
<p>Company: {{entityName}}</p>
```

---

## 4. REST endpoints (implement)

### Settings

| Method | Path | Response |
|--------|------|----------|
| GET | `/admin/settings/siteline-clearstory-gap-alert` | `{ envMasterEnabled, adminToggleEnabled, effectiveEnabled, recipientTo }` |
| PATCH | `/admin/settings/siteline-clearstory-gap-alert` | body `{ enabled: boolean }` |

`recipientTo` = env `SITELINE_CLEARSTORY_GAP_ALERT_TO` (read-only in response).

`effectiveEnabled` = env master **and** admin toggle **and** SMTP configured.

### Manual job trigger (optional)

| Method | Path | Response |
|--------|------|----------|
| POST | `/admin/jobs/siteline-clearstory-gap-alert/run` | `{ ok, message, gapCount }` |

Admin JWT only. Runs Job B once.

### Reconciliation gaps (for Billings UI)

| Method | Path | Query |
|--------|------|-------|
| GET | `/siteline/reconciliation/gaps` | `entityId` (optional, default 2) |

**Response:**

```json
{
  "items": [
    {
      "contractId": "uuid",
      "projectName": "...",
      "projectNumber": "PO 36392",
      "internalProjectNumber": "31019",
      "leadPmName": "Asha Goel",
      "leadPmEmail": "asha@goelservices.com",
      "netDollars": 53727,
      "daysPastDue": 120,
      "clearstoryProjectId": null,
      "clearstoryJobNumber": null,
      "matchKeyTried": "jobNumber=31019",
      "gapReason": "NO_CLEARSTORY_PROJECT"
    }
  ],
  "evaluatedAt": "2026-05-21T12:00:00.000Z"
}
```

`gapReason` enum: `NO_CLEARSTORY_PROJECT` | `CLEARSTORY_EMPTY` | `NOT_COMPARABLE`.

### Email templates

Ensure `/admin/email-templates/purposes` includes:

- `siteline.overdue_leadpm`
- `siteline.clearstory_data_gap`

`PUT /admin/email-templates/active?purpose=...` must accept query param `purpose` (frontend sends it).

---

## 5. Reconciliation service (core logic)

```typescript
// siteline-clearstory-reconciliation.service.ts (sketch)

async findGaps(entityId: number): Promise<GapRow[]> {
  // 1. Load overdue/aging rows from Siteline snapshot for entityId
  //    (same query as aging-overdue, minDaysPastDue optional or all with net > 0)
  const sitelineRows = await this.sitelineRepo.getBillableRowsByEntity(entityId);

  const gaps: GapRow[] = [];
  for (const row of sitelineRows) {
    const cs = await this.matchClearstoryProject(row.internalProjectNumber, row.projectNumber, row.projectName);
    if (!cs) {
      gaps.push({ ...row, gapReason: 'NO_CLEARSTORY_PROJECT', clearstoryProjectId: null });
      continue;
    }
    const hasData = await this.clearstoryRepo.projectHasComparableData(cs.id);
    if (!hasData) {
      gaps.push({ ...row, gapReason: 'CLEARSTORY_EMPTY', clearstoryProjectId: cs.id });
    }
  }
  return gaps;
}

async matchClearstoryProject(internalNumber, projectNumber, projectName) {
  if (internalNumber?.trim()) {
    const byJob = await this.clearstoryRepo.findProjectByJobNumber(internalNumber.trim());
    if (byJob) return byJob;
  }
  // fallback: projectNumber, normalized name — document in logs
  return null;
}
```

**Clearstory “has data”:** at least one COR in `Clearstory_*` mirror for that `projectId`, OR `revisedContractValue > 0` on summary — product choice.

---

## 6. Job A — `SitelineOverdueLeadPmEmailJob`

**Schedule:** e.g. `0 7 * * 1-5` (weekdays 7am) **after** Siteline sync cron.

**Steps:**

1. If `!effectiveOverdueEnabled()` return.
2. For each `entityId` in `[1,2,3]` (or configured list):
3. Query overdue items (same rules as `GET /siteline/aging-overdue`, `minDaysPastDue` from env).
4. Group by `leadPmEmail` (normalize lowercase).
5. For each group:
   - Load active template `siteline.overdue_leadpm`
   - Build `itemsTableHtml` from rows
   - Replace placeholders; send SMTP to `leadPmEmail`
   - Log to `App_EmailLog` (recommended)

**Skip** rows without valid email.

---

## 7. Job B — `SitelineClearstoryGapAlertJob`

**Schedule:** same window, after Clearstory + Siteline sync.

**Steps:**

1. If `!effectiveGapAlertEnabled()` return.
2. For each `entityId`:
3. `gaps = findGaps(entityId)`
4. If `gaps.length === 0` return (no email).
5. Dedupe: optional — skip send if same gap set hash sent in last 24h.
6. Load template `siteline.clearstory_data_gap`
7. Build `gapsTableHtml` (project, job #, PM, net $, reason)
8. Send to `SITELINE_CLEARSTORY_GAP_ALERT_TO`, CC from env
9. Log send

**Manual run:** `POST /admin/jobs/siteline-clearstory-gap-alert/run` calls same `runOnce()`.

---

## 8. `itemsTableHtml` / `gapsTableHtml` helpers

Generate minimal HTML tables (inline styles for email clients):

```html
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
  <thead><tr><th>Project</th>...</tr></thead>
  <tbody>...</tbody>
</table>
```

---

## 9. Verification checklist

- [ ] Seed both templates; activate one per purpose
- [ ] GET gap settings returns JoAnnabelle address
- [ ] GET `/siteline/reconciliation/gaps?entityId=2` returns JSON (empty array OK)
- [ ] PATCH admin toggles persist
- [ ] POST manual gap job sends mail when gaps exist
- [ ] PM overdue job sends to test PM email when overdue rows seeded
- [ ] Frontend `/admin/settings` loads without 404
- [ ] Billings page shows amber banner when gaps > 0

---

## 10. Frontend contract reference

See [FRONTEND_SITELINE_PM_EMAILS.md](./FRONTEND_SITELINE_PM_EMAILS.md) and implemented files:

- `src/lib/api/endpoints/admin.ts`
- `src/lib/api/endpoints/siteline.ts` — `getSitelineReconciliationGaps`
- `src/app/admin/settings/page.tsx`
- `src/components/billings/SitelineClearstoryGapsBanner.tsx`

---

*Default gap alert recipient: **joannabelle.salalila@Goelservices.com***
