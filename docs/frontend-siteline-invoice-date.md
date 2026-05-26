# Siteline aging API: `invoiceDate` field

This note describes a **backward-compatible** addition to the Siteline aging JSON responses. No existing fields were removed or renamed.

## What changed

Responses now include **`invoiceDate`** where applicable.

| Meaning in product UI | JSON field name | Source |
|----------------------|-----------------|--------|
| Show as **Invoice date** (or equivalent) | `invoiceDate` | Siteline billing period **start** for that pay app, persisted in our DB as column **`StartDate`** |

- **`invoiceDate`** is an **ISO 8601** timestamp string (e.g. `2025-03-01T00:00:00.000Z`), or **`null`** when Siteline did not provide a start date for the relevant pay app.
- The backend still stores this as **`StartDate`** on `Siteline_PayApps`; the API uses **`invoiceDate`** so the UI label matches what users expect.

## Endpoints

All routes require a **JWT** (same as other protected Siteline routes).

### `GET /siteline/aging-report`

Each object in **`rows`** may include:

| Field | Type | Notes |
|-------|------|--------|
| `invoiceDate` | `string \| null` | Optional key; may be omitted on older clients’ typings—treat missing as “no value”. |
| `invoiceNumber` | `number \| null` | Unchanged; still the latest display pay app number for that row (same selection rules as before). |

**Semantics:** For each report row, `invoiceDate` is the **`StartDate`** of the **same** pay app used to populate `invoiceNumber` (highest pay app number among non-`PAID` / non-`DRAFT` apps for that contract or project aggregate, depending on report source).

**Sources:**

- When `source` is **`siteline`**, rows are contract-level from cached Siteline aging; `invoiceDate` is filled from synced pay apps for that contract when possible.
- When `source` is **`local_pay_apps`**, rows are grouped by project; `invoiceDate` follows the pay app that wins for `invoiceNumber` within that group.

If there is no qualifying pay app or no start date, use **`null`** (or absent field) and hide the column or show “—”.

### `GET /siteline/aging-overdue`

Each object in **`items`** includes:

| Field | Type | Notes |
|-------|------|--------|
| `invoiceDate` | `string \| null` | **Always present** on the object; billing start for **this** pay app line. |

Other fields (`dueDate`, `daysPastDue`, `invoiceNumber`, etc.) are unchanged.

## Frontend checklist

1. Add **`invoiceDate`** to TypeScript types for aging report rows and overdue items.
2. Display it with the label **Invoice date** (or your product copy).
3. Parse as ISO date/time; format for the user’s locale/timezone as you do for `dueDate`.
4. Handle **`null`**: empty state, em dash, or hide the cell.

## Questions

If something is unclear or you need the same field on another endpoint, ask the backend team.
