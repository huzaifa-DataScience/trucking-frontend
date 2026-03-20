# Admin: Siteline overdue email template

**Frontend:** Admins can edit templates via the multi-template editor at **`/admin/email-templates?purpose=siteline.overdue_leadpm`** (sidebar: **Overdue email** under Construction Logistics).

Lead PM overdue alerts use **HTML templates** stored in SQL (`App_EmailTemplates`, key `siteline_overdue`). On first app start the table is created (if missing) and a default row is inserted.

## API (admin JWT required)

- **Purpose selector:** `purpose = siteline.overdue_leadpm`
- **GET active template for purpose** `GET /admin/email-templates/active?purpose=siteline.overdue_leadpm`  
  Returns `templateKey`, `subjectTemplate`, `bodyHtmlTemplate`, `placeholders`, `updatedAt`.

- **Update a specific template (active or inactive)** `PUT /admin/email-templates/:templateKey`  
  Note: this endpoint is message-only; after saving, the frontend should refetch.
  ```json
  { "subjectTemplate": "...", "bodyHtmlTemplate": "<p>...</p>", "name": "Optional name change", "isActive": false }
  ```

- **Activate another template for this purpose (optional)** `POST /admin/email-templates/:templateKey/activate`  
  Note: message-only; after activating, the frontend should refetch.

## Placeholders

| Placeholder | Meaning |
|-------------|---------|
| `{{leadPmName}}` | Lead PM display name |
| `{{daysThreshold}}` | Days threshold from `OVERDUE_EMAIL_DAYS` (e.g. 50) |
| `{{itemCount}}` | Number of overdue pay apps in this email |
| `{{itemsTableHtml}}` | Pre-built HTML table of rows (do not edit row data here) |

The cron job still uses SMTP settings from `.env` (`SMTP_*`, `OVERDUE_EMAIL_FROM`, `OVERDUE_EMAIL_ENABLED`).
