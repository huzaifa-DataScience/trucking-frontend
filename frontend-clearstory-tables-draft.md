# Clearstory tables — product-facing notes

This doc describes the Clearstory tables we show in the UI:
- **Projects**
- **Change Order Requests (COR)**
- **Tags (T&M)**
- **Customers**
- **Contracts**
- **Company**

---

## Principles

1. **One screen, one request**: each table screen should load with a single paged request (no N+1).
2. **Consistent pagination**: list screens use `page` (1-based) and `pageSize` (25/50/100/200).
3. **Readable tables**: very long or rich-text fields (like descriptions) open in a details modal.

---

## Endpoints

| Module | Method & path | Query params | Response |
|--------|----------------|--------------|----------|
| Change Order Requests (COR) | `GET /clearstory/tables/cors` | `page`, `pageSize`, optional `projectId` | `ClearstoryTablePage` |
| Tags (T&M) | `GET /clearstory/tables/tags` | `page`, `pageSize`, optional `projectId` | `ClearstoryTablePage` |
| Customers | `GET /clearstory/tables/customers` | `page`, `pageSize` | `ClearstoryTablePage` |
| Contracts | `GET /clearstory/tables/contracts` | `page`, `pageSize` | `ClearstoryTablePage` |
| Company | `GET /clearstory/tables/company` | — | `{ module, row }` — `row` may be `null` if nothing synced |

### Response body per endpoint

- **`/tables/cors`**, **`/tables/tags`**, **`/tables/customers`**, **`/tables/contracts`** — **the same JSON schema**. Only **`module`** differs (`"cors"` \| `"tags"` \| `"customers"` \| `"contracts"`). The frontend can use one `ClearstoryTablePageResponse` type for all four.
- **`/tables/company`** — **different** top-level shape: **`{ module: "company", row }`** with no `page` / `total` / `rows`.

### `ClearstoryTablePage` (lists)

```json
{
  "module": "cors",
  "page": 1,
  "pageSize": 50,
  "total": 1234,
  "rows": [
    {
      "resourceKey": "…",
      "swagger": { },
      "lastFetchedAt": "2026-04-10T12:00:00.000Z",
      "lastSyncedAt": "2026-04-10T12:00:00.000Z",
      "typedMirror": { },
      "payloadMissing": false
    }
  ]
}
```

### Company row

Same row shape as one element of `rows`, with **`resourceKey`** always **`current`** (matches `api-payload` `type=company&key=current`).

---

## Sample responses (shape only)

`GET /clearstory/tables/cors?page=1&pageSize=2` (shape only):

```json
{
  "module": "cors",
  "page": 1,
  "pageSize": 2,
  "total": 42,
  "rows": [
    {
      "resourceKey": "12345",
      "swagger": { "id": 12345, "status": "in_review" },
      "lastFetchedAt": "2026-04-10T12:00:00.000Z",
      "lastSyncedAt": "2026-04-10T12:00:00.000Z",
      "typedMirror": {
        "id": "12345",
        "projectId": 7,
        "status": "in_review",
        "lastSyncedAt": "2026-04-10T12:00:00.000Z"
      },
      "payloadMissing": false
    }
  ]
}
```

`GET /clearstory/tables/company` when nothing synced:

```json
{
  "module": "company",
  "row": null
}
```

---

## Table behavior (UI)

- **Column names**: displayed in a readable format (e.g. `customerReferenceNumber` → `Customer Reference Number`).
- **ID column**: `id` stays as the first column when present.
- **Grouped fields**: dotted keys like `CUSTOMER.NAME` appear under a single `Customer` column and open in the details modal.
- **Long/rich text**: fields like `description` open in the details modal (HTML is displayed as readable text).

---

## Frontend module layout (draft)

| Feature folder | Route example | Data hook |
|----------------|---------------|-----------|
| `clearstory/cor-table/` | `/clearstory/cor` | `useClearstoryTable('cors', { projectId })` |
| `clearstory/tags-table/` | `/clearstory/tags` | `useClearstoryTable('tags', { projectId })` |
| `clearstory/customers-table/` | `/clearstory/directory/customers` | `useClearstoryTable('customers')` |
| `clearstory/contracts-table/` | `/clearstory/directory/contracts` | `useClearstoryTable('contracts')` |
| `clearstory/company/` | `/clearstory/company` | `useClearstoryCompany()` → `getClearstoryCompanyTable()` |

**`useClearstoryTable` sketch** (implemented as `src/hooks/useClearstoryTable.ts`)

- Build URL: `/clearstory/tables/${module}?page=${page}&pageSize=${pageSize}` + optional `projectId` (cors/tags only).
- Return `{ rows, total, page, pageSize, setPage, setPageSize, totalPages, isLoading, error, refetch }`.
- Table: `ClearstorySwaggerTable` + `buildSwaggerTopLevelColumnKeys` (`src/lib/clearstory/swaggerTableColumns.ts`) — meta columns + **top-level** swagger/typedMirror keys only; nested objects/arrays use a **View** button + modal (no `contract.address`-style column explosion).

**Ops**

- After **POST /clearstory/sync**, refetch active table queries; **`GET /clearstory/status`** `lastSuccessfulRunAt` is your freshness hint for a banner.

---

## Backend ↔ sync alignment (for reviewers)

| `module` / path | `resourceType` in `Clearstory_ApiPayloads` | `resourceKey` |
|-----------------|--------------------------------------------|---------------|
| `cors` | `cor` | COR string `id` |
| `tags` | `tag` | numeric id as string |
| `customers` | `customer` | customer id as string |
| `contracts` | `contract` | contract id as string |
| `company` | `company` | always `current` |

If any of these drift in sync code, update this table and the service constants in `clearstory-table.service.ts` (`CLEARSTORY_TABLE_RESOURCE_TYPES`).

---

## Nice-to-haves (later)

- CSV export
- Sort/search
