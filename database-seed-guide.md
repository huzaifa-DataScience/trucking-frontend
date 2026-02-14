# Database Seed Guide

This guide helps you populate your SQL Server database with dummy data for testing the Construction Logistics Reporting Dashboard.

## Prerequisites

1. **Know your table structure**: The seed script (`database-seed.sql`) is a template. You need to adjust it to match your actual table/column names.
2. **Backend schema**: Check your NestJS entities or database schema to confirm:
   - Table names (e.g., `Fact_SiteTickets`, `Ref_Jobs`, `dbo.Photos`)
   - Column names (e.g., `TicketID`, `JobID`, `TicketNumber`, `CreatedAt`)
   - Data types and constraints

## Steps

### 1. Review Your Schema

Check your backend entities (in `/Users/apple/trucking/trucking-backend/src/database/entities/`):
- `ticket.entity.ts` - Main tickets table
- `job.entity.ts` - Jobs lookup
- `material.entity.ts` - Materials lookup
- `hauler.entity.ts` - Haulers lookup
- `photo.entity.ts` - Photos table

### 2. Adjust the Seed Script

Open `database-seed.sql` and:
- Replace placeholder table names with your actual table names
- Replace placeholder column names with your actual column names
- Uncomment and expand the INSERT statements
- Add ~120 tickets covering:
  - Date range: Jan 1-31, 2025 (or your test range)
  - Multiple companies (acme, beta, etc.)
  - Both directions (Import/Export)
  - Various materials, haulers, truck types
  - Some late submissions (CreatedAt > TicketDate + 24 hours)
  - Some missing hauler ticket numbers (HasPhysicalTicket=1 but HaulerTicketNumber=NULL)
  - Efficiency outliers (same route, different cycle times for testing)

### 3. Test Data Requirements

**For Late Submission Audit:**
- Create tickets where `CreatedAt` is > 24 hours after `TicketDate`
- Example: `TicketDate = '2025-01-02'`, `CreatedAt = '2025-01-05 14:00:00'` (+3 days)

**For Efficiency Outlier:**
- Create multiple tickets for the same route (Date + Job + Destination) with different trucks
- Vary cycle times (time between first and last ticket) to create outliers
- Some trucks should be >15% slower than fleet average

**For Hauler Ticket Number Logic:**
- `HasPhysicalTicket = 0` → Should show "N/A"
- `HasPhysicalTicket = 1` AND `HaulerTicketNumber IS NULL` → Should show "MISSING" (red)
- `HasPhysicalTicket = 1` AND `HaulerTicketNumber = 'HT-1234'` → Show the number

**For Photos:**
- Link photos to tickets via `TicketID`
- Use PhotoType: 'Ticket', 'Truck', 'Truck2', 'Asbestos', 'Scrap'
- PhotoURL can be placeholder paths like `/api/photos/{TicketID}/{PhotoType}.jpg`

### 4. Run the Script

```sql
-- Connect to your SQL Server database
USE YourDatabaseName;
GO

-- Run the seed script
-- Adjust and execute database-seed.sql
```

### 5. Verify Data

After seeding, verify:
- Lookups return data: `SELECT * FROM Ref_Jobs;`
- Tickets exist: `SELECT COUNT(*) FROM Fact_SiteTickets WHERE TicketNumber LIKE 'TKT-%';`
- Photos linked: `SELECT COUNT(*) FROM dbo.Photos;`
- Late submissions: `SELECT * FROM Fact_SiteTickets WHERE DATEDIFF(hour, TicketDate, CreatedAt) > 24;`

## Alternative: Use Backend Seed Endpoint

If your NestJS backend has a seed endpoint (e.g., `POST /seed`), you can use that instead of raw SQL.

## Need Help?

If you share your actual table/column names, I can generate a complete, ready-to-run seed script for your schema.
