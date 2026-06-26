# Documentation index

All project specs and guides live in this folder. The repo root keeps only the main [README.md](../README.md).

## Auth & API

| Doc | Description |
|-----|-------------|
| [FRONTEND_AUTH.md](./FRONTEND_AUTH.md) | Login, signup, JWT, 401 handling |
| [FRONTEND_API_GUIDE.md](./FRONTEND_API_GUIDE.md) | Dashboard API contract |
| [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) | Backend API specification |
| [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) | What the NestJS backend exposes |
| [ENABLE_SIGNIN.md](./ENABLE_SIGNIN.md) | Sign-in / feature flags |
| [CREATE_ADMIN_GUIDE.md](./CREATE_ADMIN_GUIDE.md) | Create admin users |

## Dashboards & filters

| Doc | Description |
|-----|-------------|
| [FRONTEND_COMPANY_FILTER.md](./FRONTEND_COMPANY_FILTER.md) | `entityId` on Job / Material / Hauler |
| [FRONTEND_RECENT_CHANGES_MAR2026.md](./FRONTEND_RECENT_CHANGES_MAR2026.md) | Recent backend changes summary |
| [SPEC_COMPLIANCE_CHECKLIST.md](./SPEC_COMPLIANCE_CHECKLIST.md) | Spec compliance checklist |

## Siteline & billings

| Doc | Description |
|-----|-------------|
| [FRONTEND_SITELINE.md](./FRONTEND_SITELINE.md) | Siteline endpoints overview |
| [frontend-siteline-api.md](./frontend-siteline-api.md) | Siteline API details |
| [frontend-siteline-invoice-date.md](./frontend-siteline-invoice-date.md) | Invoice date fields |
| [FRONTEND_AGING_REPORT.md](./FRONTEND_AGING_REPORT.md) | Aging report UI |
| [FRONTEND_SITELINE_COMPANY_FILTER.md](./FRONTEND_SITELINE_COMPANY_FILTER.md) | `entityId` on Siteline aging |
| [FRONTEND_SITELINE_PM_EMAILS.md](./FRONTEND_SITELINE_PM_EMAILS.md) | PM overdue & gap alert emails |
| [BACKEND_SITELINE_PM_EMAILS.md](./BACKEND_SITELINE_PM_EMAILS.md) | Backend guide for Siteline emails |

## Clearstory

| Doc | Description |
|-----|-------------|
| [frontend-clearstory-api.md](./frontend-clearstory-api.md) | Clearstory mirror API |
| [frontend-clearstory-api-mock.md](./frontend-clearstory-api-mock.md) | Mock / dev notes |
| [frontend-clearstory-tables-draft.md](./frontend-clearstory-tables-draft.md) | Table grid columns |
| [frontend-clearstory-projects-module.md](./frontend-clearstory-projects-module.md) | Projects module |

## Admin & email

| Doc | Description |
|-----|-------------|
| [ADMIN_PANEL_SPEC.md](./ADMIN_PANEL_SPEC.md) | Admin panel spec |
| [FRONTEND_EMAIL_TEMPLATES.md](./FRONTEND_EMAIL_TEMPLATES.md) | Email template admin API |
| [ADMIN_OVERDUE_EMAIL_TEMPLATE.md](./ADMIN_OVERDUE_EMAIL_TEMPLATE.md) | Overdue email toggle & SMTP |

## Bidding

| Doc | Description |
|-----|-------------|
| [BIDDING_FRONTEND_API.md](./BIDDING_FRONTEND_API.md) | Bidding API — frontend handoff (single source) |
| [BIDDING_BASEBID_FIELDS.md](./BIDDING_BASEBID_FIELDS.md) | Excel cell ↔ field map |
| [BIDDING_IMPLEMENTATION.md](./BIDDING_IMPLEMENTATION.md) | Full implementation plan |
| [BIDDING_FRONTEND_DESIGN.md](./BIDDING_FRONTEND_DESIGN.md) | UI / UX design spec |
| [BIDDING_FRONTEND_CALCULATOR_HANDOFF.md](./BIDDING_FRONTEND_CALCULATOR_HANDOFF.md) | Client calculator / backend handoff |
| [BIDDING_EXCEL_PARITY.md](./BIDDING_EXCEL_PARITY.md) | Excel parity notes |
| [BIDDING_GOLDEN_TEST_IDC6098.md](./BIDDING_GOLDEN_TEST_IDC6098.md) | Golden test IDC6098 |
| [BIDDING_SCOPE_A1_J49.md](./BIDDING_SCOPE_A1_J49.md) | Scope A1–J49 |
| [UX_UI_DESIGN_REWORK.md](./UX_UI_DESIGN_REWORK.md) | Platform UX/UI design rework |
| [BACKEND_RBAC_ADMIN.md](./BACKEND_RBAC_ADMIN.md) | Bidding RBAC admin backend spec |

## Workforce (Connecteam)

| Doc | Description |
|-----|-------------|
| [FRONTEND_CONNECTEAM.md](./FRONTEND_CONNECTEAM.md) | Workforce / Connecteam API handoff |
| [UX_WORKFORCE.md](./UX_WORKFORCE.md) | Workforce module UX/UI spec |

Backend handoff (in `trucking` repo): `BIDDING_SHEET.md`, `BIDDING_NAMED_RANGES.md` + `BiddingSheet.xlsx` at repo root.

## Database

| Doc | Description |
|-----|-------------|
| [database-seed-guide.md](./database-seed-guide.md) | Database seeding |

### SQL scripts (`docs/sql/`)

| File | Description |
|------|-------------|
| [sql/database-seed.sql](./sql/database-seed.sql) | Template seed data for SQL Server |
| [sql/create-first-admin.sql](./sql/create-first-admin.sql) | Create first admin user in DB |
