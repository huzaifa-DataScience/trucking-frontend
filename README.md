# Construction Logistics Reporting Dashboard

Web-based reporting application replacing PowerBI. Tracks trucking tickets, material movements, and vendor costs. Data source: **SQL Server** (mock data in place until backend is connected).

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **React 19**
- **xlsx** (Export to Excel)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Root redirects to **Job Dashboard**.

## Pages (per spec)

| Route | Page | Focus |
| ----- | ---- | ----- |
| `/` | Redirect → `/job` | — |
| `/job` | **Job Dashboard** | Supply Chain, Disposal Limits & Compliance |
| `/material` | **Material Dashboard** | Billing Reconciliation & Audit |
| `/hauler` | **Hauler (Vendor) Dashboard** | Fraud Detection & Efficiency Analysis |
| `/forensic` | **Forensic & Audit Tools** | Late Submission Audit + Efficiency Outlier Report |

## Features (implemented)

- **ID resolution**: All IDs shown as human-readable names in grids and cards.
- **Photos**: Pivoted by type (Ticket, Truck 1/2, Asbestos, Scrap) as clickable links; empty cell when no photo.
- **Grids**: Pagination (50 rows per page), **Export to Excel** on all data tables.
- **Drill-down**: Click a **Ticket Number** in any main grid → Detail modal with full ticket + photo gallery.
- **Hauler ticket #**: Shows `N/A` when no physical ticket; `MISSING` (red) when `HasPhysicalTicket` is true but number is missing.

## Project structure

```
src/
├── app/(dashboard)/
│   ├── page.tsx           # redirect to /job
│   ├── job/page.tsx       # Job Dashboard
│   ├── material/page.tsx  # Material Dashboard
│   ├── hauler/page.tsx    # Hauler Dashboard
│   └── forensic/page.tsx  # Forensic & Audit (2 tabs)
├── components/
│   ├── dashboard/        # Sidebar, Header
│   ├── reporting/        # ReportFilters, KPICards, SummaryTable, TicketGrid,
│   │                     # TicketDetailModal, LateSubmissionGrid, EfficiencyOutlierGrid
│   └── ui/               # Card
└── lib/
    ├── types.ts          # TicketRow, TicketDetail, filters, audit types
    └── mock-data.ts      # Mock data + filterTickets, KPIs, summaries, audit rows
```

## Connecting SQL Server

Replace mock data in `src/lib/mock-data.ts` with API calls:

1. Add API routes (e.g. `app/api/tickets/route.ts`) that query SQL Server (e.g. via `mssql` or `tedious`).
2. Ensure API returns **human-readable names** (Job Name, Material Name, Hauler Name, etc.) and pivoted photo URLs by type per TicketID.
3. Swap `filterTickets`, `getTicketByNumber`, and KPI/summary helpers to call these APIs (or move logic to server actions / server components that fetch from DB).

Types in `src/lib/types.ts` match the spec and can stay as-is for the API contract.
