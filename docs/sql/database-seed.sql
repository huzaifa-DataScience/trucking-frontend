-- ============================================================================
-- DUMMY DATA SEED SCRIPT FOR CONSTRUCTION LOGISTICS REPORTING DASHBOARD
-- Matches your actual schema from TypeORM entities
-- Run this on your SQL Server database
-- ============================================================================

USE YourDatabaseName; -- Replace with your actual database name
GO

-- ============================================================================
-- 1. REFERENCE TABLES (Lookups)
-- ============================================================================

-- Jobs (Ref_Jobs)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_Jobs WHERE JobName = 'North Site Phase 1')
BEGIN
    INSERT INTO dbo.Ref_Jobs (JobName, EntityID, IsActive) VALUES ('North Site Phase 1', 1, 1);
    INSERT INTO dbo.Ref_Jobs (JobName, EntityID, IsActive) VALUES ('South Lot', 1, 1);
    INSERT INTO dbo.Ref_Jobs (JobName, EntityID, IsActive) VALUES ('Riverside Demolition', 2, 1);
    INSERT INTO dbo.Ref_Jobs (JobName, EntityID, IsActive) VALUES ('Warehouse A', 2, 1);
    INSERT INTO dbo.Ref_Jobs (JobName, EntityID, IsActive) VALUES ('Highway Project', 1, 1);
END;

-- Materials (Ref_Materials)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_Materials WHERE MaterialName = 'Concrete')
BEGIN
    INSERT INTO dbo.Ref_Materials (MaterialName) VALUES ('Concrete');
    INSERT INTO dbo.Ref_Materials (MaterialName) VALUES ('Gravel');
    INSERT INTO dbo.Ref_Materials (MaterialName) VALUES ('Asbestos');
    INSERT INTO dbo.Ref_Materials (MaterialName) VALUES ('Scrap Metal');
    INSERT INTO dbo.Ref_Materials (MaterialName) VALUES ('Soil');
END;

-- Haulers (Ref_ExternalCompanies)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_ExternalCompanies WHERE CompanyName = 'ABC Trucking')
BEGIN
    INSERT INTO dbo.Ref_ExternalCompanies (CompanyName, IsActive) VALUES ('ABC Trucking', 1);
    INSERT INTO dbo.Ref_ExternalCompanies (CompanyName, IsActive) VALUES ('Fast Haul Inc', 1);
    INSERT INTO dbo.Ref_ExternalCompanies (CompanyName, IsActive) VALUES ('Green Logistics', 1);
END;

-- Truck Types (Ref_TruckTypes)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_TruckTypes WHERE TypeName = 'Tri-Axle')
BEGIN
    INSERT INTO dbo.Ref_TruckTypes (TypeName) VALUES ('Tri-Axle');
    INSERT INTO dbo.Ref_TruckTypes (TypeName) VALUES ('Trailer');
    INSERT INTO dbo.Ref_TruckTypes (TypeName) VALUES ('Dump Truck');
    INSERT INTO dbo.Ref_TruckTypes (TypeName) VALUES ('Tanker');
END;

-- External Sites (Ref_ExternalSites)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_ExternalSites WHERE SiteName = 'Quarry East')
BEGIN
    INSERT INTO dbo.Ref_ExternalSites (SiteName) VALUES ('Quarry East');
    INSERT INTO dbo.Ref_ExternalSites (SiteName) VALUES ('Landfill North');
    INSERT INTO dbo.Ref_ExternalSites (SiteName) VALUES ('Recycling Co');
    INSERT INTO dbo.Ref_ExternalSites (SiteName) VALUES ('Depot 7');
END;

-- Drivers (Ref_Drivers)
IF NOT EXISTS (SELECT 1 FROM dbo.Ref_Drivers WHERE DriverName = 'Mike Roberts')
BEGIN
    INSERT INTO dbo.Ref_Drivers (DriverName) VALUES ('Mike Roberts');
    INSERT INTO dbo.Ref_Drivers (DriverName) VALUES ('Jane Smith');
    INSERT INTO dbo.Ref_Drivers (DriverName) VALUES ('Carlos M.');
    INSERT INTO dbo.Ref_Drivers (DriverName) VALUES ('Pat Lee');
    INSERT INTO dbo.Ref_Drivers (DriverName) VALUES ('Tom Wilson');
END;

-- ============================================================================
-- 2. TICKETS (Fact_SiteTickets)
-- ============================================================================

DECLARE @JobID1 INT = (SELECT TOP 1 JobID FROM dbo.Ref_Jobs WHERE JobName = 'North Site Phase 1');
DECLARE @JobID2 INT = (SELECT TOP 1 JobID FROM dbo.Ref_Jobs WHERE JobName = 'South Lot');
DECLARE @JobID3 INT = (SELECT TOP 1 JobID FROM dbo.Ref_Jobs WHERE JobName = 'Riverside Demolition');
DECLARE @JobID4 INT = (SELECT TOP 1 JobID FROM dbo.Ref_Jobs WHERE JobName = 'Warehouse A');

DECLARE @MaterialID1 INT = (SELECT TOP 1 MaterialID FROM dbo.Ref_Materials WHERE MaterialName = 'Concrete');
DECLARE @MaterialID2 INT = (SELECT TOP 1 MaterialID FROM dbo.Ref_Materials WHERE MaterialName = 'Gravel');
DECLARE @MaterialID3 INT = (SELECT TOP 1 MaterialID FROM dbo.Ref_Materials WHERE MaterialName = 'Asbestos');
DECLARE @MaterialID4 INT = (SELECT TOP 1 MaterialID FROM dbo.Ref_Materials WHERE MaterialName = 'Scrap Metal');
DECLARE @MaterialID5 INT = (SELECT TOP 1 MaterialID FROM dbo.Ref_Materials WHERE MaterialName = 'Soil');

DECLARE @HaulerID1 INT = (SELECT TOP 1 CompanyID FROM dbo.Ref_ExternalCompanies WHERE CompanyName = 'ABC Trucking');
DECLARE @HaulerID2 INT = (SELECT TOP 1 CompanyID FROM dbo.Ref_ExternalCompanies WHERE CompanyName = 'Fast Haul Inc');
DECLARE @HaulerID3 INT = (SELECT TOP 1 CompanyID FROM dbo.Ref_ExternalCompanies WHERE CompanyName = 'Green Logistics');

DECLARE @TruckTypeID1 INT = (SELECT TOP 1 TruckTypeID FROM dbo.Ref_TruckTypes WHERE TypeName = 'Tri-Axle');
DECLARE @TruckTypeID2 INT = (SELECT TOP 1 TruckTypeID FROM dbo.Ref_TruckTypes WHERE TypeName = 'Trailer');
DECLARE @TruckTypeID3 INT = (SELECT TOP 1 TruckTypeID FROM dbo.Ref_TruckTypes WHERE TypeName = 'Dump Truck');
DECLARE @TruckTypeID4 INT = (SELECT TOP 1 TruckTypeID FROM dbo.Ref_TruckTypes WHERE TypeName = 'Tanker');

DECLARE @SiteID1 INT = (SELECT TOP 1 SiteID FROM dbo.Ref_ExternalSites WHERE SiteName = 'Quarry East');
DECLARE @SiteID2 INT = (SELECT TOP 1 SiteID FROM dbo.Ref_ExternalSites WHERE SiteName = 'Landfill North');
DECLARE @SiteID3 INT = (SELECT TOP 1 SiteID FROM dbo.Ref_ExternalSites WHERE SiteName = 'Recycling Co');
DECLARE @SiteID4 INT = (SELECT TOP 1 SiteID FROM dbo.Ref_ExternalSites WHERE SiteName = 'Depot 7');

DECLARE @DriverID1 INT = (SELECT TOP 1 DriverID FROM dbo.Ref_Drivers WHERE DriverName = 'Mike Roberts');
DECLARE @DriverID2 INT = (SELECT TOP 1 DriverID FROM dbo.Ref_Drivers WHERE DriverName = 'Jane Smith');
DECLARE @DriverID3 INT = (SELECT TOP 1 DriverID FROM dbo.Ref_Drivers WHERE DriverName = 'Carlos M.');
DECLARE @DriverID4 INT = (SELECT TOP 1 DriverID FROM dbo.Ref_Drivers WHERE DriverName = 'Pat Lee');

-- Insert tickets (120+ tickets covering Jan 1-31, 2025)
-- Day 1: Jan 1, 2025 - Normal tickets
INSERT INTO dbo.Fact_SiteTickets (FormTicketNumber, TicketDate, CreatedAt, JobID, Direction, ExternalSiteID, TruckingCompanyID, MaterialID, TruckNumber, TruckTypeID, DriverID, HasPhysicalTicket, PhysicalTicketNumber, SignedBy)
VALUES
('TKT-2001', '2025-01-01', '2025-01-01 08:00:00', @JobID1, 'Import', @SiteID1, @HaulerID1, @MaterialID1, 'TRK-101', @TruckTypeID1, @DriverID1, 1, 'HT-1001', 'Mike Roberts'),
('TKT-2002', '2025-01-01', '2025-01-01 09:15:00', @JobID1, 'Export', @SiteID2, @HaulerID1, @MaterialID2, 'TRK-102', @TruckTypeID2, @DriverID2, 1, 'HT-1002', 'Jane Smith'),
('TKT-2003', '2025-01-01', '2025-01-01 10:30:00', @JobID2, 'Import', @SiteID3, @HaulerID2, @MaterialID3, 'TRK-103', @TruckTypeID3, @DriverID3, 0, NULL, 'Carlos M.'),
('TKT-2004', '2025-01-01', '2025-01-01 11:45:00', @JobID2, 'Export', @SiteID4, @HaulerID2, @MaterialID4, 'TRK-104', @TruckTypeID4, @DriverID4, 1, 'HT-1004', 'Pat Lee'),
('TKT-2005', '2025-01-01', '2025-01-01 13:00:00', @JobID3, 'Import', @SiteID1, @HaulerID3, @MaterialID5, 'TRK-105', @TruckTypeID1, @DriverID1, 1, NULL, 'Mike Roberts'), -- MISSING ticket number

-- Day 2: Jan 2, 2025 - Some late submissions
('TKT-2006', '2025-01-02', '2025-01-05 14:00:00', @JobID1, 'Import', @SiteID1, @HaulerID1, @MaterialID1, 'TRK-101', @TruckTypeID1, @DriverID1, 1, 'HT-1006', 'Mike Roberts'), -- +3 days late
('TKT-2007', '2025-01-02', '2025-01-02 09:00:00', @JobID2, 'Export', @SiteID2, @HaulerID2, @MaterialID2, 'TRK-106', @TruckTypeID2, @DriverID2, 1, NULL, 'Jane Smith'), -- MISSING
('TKT-2008', '2025-01-02', '2025-01-04 16:30:00', @JobID3, 'Import', @SiteID3, @HaulerID3, @MaterialID4, 'TRK-107', @TruckTypeID3, @DriverID3, 1, 'HT-1008', 'Carlos M.'), -- +2 days late
('TKT-2009', '2025-01-02', '2025-01-02 10:15:00', @JobID4, 'Export', @SiteID4, @HaulerID1, @MaterialID5, 'TRK-108', @TruckTypeID4, @DriverID4, 0, NULL, 'Pat Lee'),
('TKT-2010', '2025-01-02', '2025-01-02 11:30:00', @JobID1, 'Import', @SiteID1, @HaulerID2, @MaterialID1, 'TRK-109', @TruckTypeID1, @DriverID1, 1, 'HT-1010', 'Mike Roberts'),

-- Day 3: Jan 3, 2025 - More tickets
('TKT-2011', '2025-01-03', '2025-01-03 07:00:00', @JobID1, 'Import', @SiteID1, @HaulerID1, @MaterialID1, 'TRK-101', @TruckTypeID1, @DriverID1, 1, 'HT-1011', 'Mike Roberts'),
('TKT-2012', '2025-01-03', '2025-01-03 08:30:00', @JobID1, 'Import', @SiteID1, @HaulerID1, @MaterialID1, 'TRK-110', @TruckTypeID2, @DriverID2, 1, 'HT-1012', 'Jane Smith'),
('TKT-2013', '2025-01-03', '2025-01-03 10:00:00', @JobID1, 'Import', @SiteID1, @HaulerID1, @MaterialID1, 'TRK-111', @TruckTypeID3, @DriverID3, 1, 'HT-1013', 'Carlos M.'),
('TKT-2014', '2025-01-03', '2025-01-03 11:30:00', @JobID1, 'Import', @SiteID1, @HaulerID2, @MaterialID1, 'TRK-112', @TruckTypeID1, @DriverID4, 1, 'HT-1014', 'Pat Lee'),
('TKT-2015', '2025-01-03', '2025-01-03 13:00:00', @JobID1, 'Import', @SiteID1, @HaulerID2, @MaterialID1, 'TRK-113', @TruckTypeID2, @DriverID1, 1, 'HT-1015', 'Mike Roberts'),
('TKT-2016', '2025-01-03', '2025-01-03 14:30:00', @JobID1, 'Import', @SiteID1, @HaulerID3, @MaterialID1, 'TRK-114', @TruckTypeID3, @DriverID2, 1, 'HT-1016', 'Jane Smith'),
('TKT-2017', '2025-01-03', '2025-01-03 16:00:00', @JobID1, 'Import', @SiteID1, @HaulerID3, @MaterialID1, 'TRK-115', @TruckTypeID1, @DriverID3, 1, 'HT-1017', 'Carlos M.'),

-- Continue with more days... (Jan 4-31)
-- For brevity, adding a batch insert pattern - you can expand this

-- Day 4-10: More varied tickets
('TKT-2018', '2025-01-04', '2025-01-04 08:00:00', @JobID2, 'Export', @SiteID2, @HaulerID1, @MaterialID2, 'TRK-116', @TruckTypeID2, @DriverID4, 1, 'HT-1018', 'Pat Lee'),
('TKT-2019', '2025-01-04', '2025-01-04 09:30:00', @JobID2, 'Export', @SiteID2, @HaulerID2, @MaterialID2, 'TRK-117', @TruckTypeID3, @DriverID1, 0, NULL, 'Mike Roberts'),
('TKT-2020', '2025-01-05', '2025-01-08 10:00:00', @JobID3, 'Import', @SiteID3, @HaulerID3, @MaterialID3, 'TRK-118', @TruckTypeID4, @DriverID2, 1, 'HT-1020', 'Jane Smith'), -- +3 days late
('TKT-2021', '2025-01-05', '2025-01-05 11:00:00', @JobID4, 'Export', @SiteID4, @HaulerID1, @MaterialID4, 'TRK-119', @TruckTypeID1, @DriverID3, 1, NULL, 'Carlos M.'), -- MISSING
('TKT-2022', '2025-01-06', '2025-01-06 08:00:00', @JobID1, 'Import', @SiteID1, @HaulerID2, @MaterialID5, 'TRK-120', @TruckTypeID2, @DriverID4, 1, 'HT-1022', 'Pat Lee'),
('TKT-2023', '2025-01-07', '2025-01-07 09:00:00', @JobID2, 'Export', @SiteID2, @HaulerID3, @MaterialID1, 'TRK-121', @TruckTypeID3, @DriverID1, 0, NULL, 'Mike Roberts'),
('TKT-2024', '2025-01-08', '2025-01-11 10:00:00', @JobID3, 'Import', @SiteID3, @HaulerID1, @MaterialID2, 'TRK-122', @TruckTypeID4, @DriverID2, 1, 'HT-1024', 'Jane Smith'), -- +3 days late
('TKT-2025', '2025-01-09', '2025-01-09 11:00:00', @JobID4, 'Export', @SiteID4, @HaulerID2, @MaterialID3, 'TRK-123', @TruckTypeID1, @DriverID3, 1, 'HT-1025', 'Carlos M.');

-- Add more tickets to reach ~120 total (expand the pattern above for Jan 10-31)
-- For efficiency outlier testing, ensure same route (Date + Job + Site) has multiple trucks with different cycle times

-- ============================================================================
-- 3. PHOTOS (Fact_TicketPhotos)
-- ============================================================================

-- Link photos to tickets
-- PhotoType values: 'Ticket', 'Truck1', 'Truck2', 'Asbestos', 'Scrap'

DECLARE @TicketID1 INT = (SELECT TOP 1 TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber = 'TKT-2001');
DECLARE @TicketID2 INT = (SELECT TOP 1 TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber = 'TKT-2002');
DECLARE @TicketID3 INT = (SELECT TOP 1 TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber = 'TKT-2003');
DECLARE @TicketID4 INT = (SELECT TOP 1 TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber = 'TKT-2004');
DECLARE @TicketID5 INT = (SELECT TOP 1 TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber = 'TKT-2005');

IF @TicketID1 IS NOT NULL
BEGIN
    INSERT INTO dbo.Fact_TicketPhotos (TicketID, PhotoType, PhotoURL, UploadedAt)
    VALUES
    (@TicketID1, 'Ticket', '/api/photos/' + CAST(@TicketID1 AS NVARCHAR) + '/Ticket.jpg', GETDATE()),
    (@TicketID1, 'Truck1', '/api/photos/' + CAST(@TicketID1 AS NVARCHAR) + '/Truck1.jpg', GETDATE()),
    (@TicketID1, 'Truck2', '/api/photos/' + CAST(@TicketID1 AS NVARCHAR) + '/Truck2.jpg', GETDATE());
END;

IF @TicketID2 IS NOT NULL
BEGIN
    INSERT INTO dbo.Fact_TicketPhotos (TicketID, PhotoType, PhotoURL, UploadedAt)
    VALUES
    (@TicketID2, 'Ticket', '/api/photos/' + CAST(@TicketID2 AS NVARCHAR) + '/Ticket.jpg', GETDATE()),
    (@TicketID2, 'Asbestos', '/api/photos/' + CAST(@TicketID2 AS NVARCHAR) + '/Asbestos.jpg', GETDATE());
END;

IF @TicketID3 IS NOT NULL
BEGIN
    INSERT INTO dbo.Fact_TicketPhotos (TicketID, PhotoType, PhotoURL, UploadedAt)
    VALUES
    (@TicketID3, 'Truck1', '/api/photos/' + CAST(@TicketID3 AS NVARCHAR) + '/Truck1.jpg', GETDATE()),
    (@TicketID3, 'Scrap', '/api/photos/' + CAST(@TicketID3 AS NVARCHAR) + '/Scrap.jpg', GETDATE());
END;

IF @TicketID4 IS NOT NULL
BEGIN
    INSERT INTO dbo.Fact_TicketPhotos (TicketID, PhotoType, PhotoURL, UploadedAt)
    VALUES
    (@TicketID4, 'Ticket', '/api/photos/' + CAST(@TicketID4 AS NVARCHAR) + '/Ticket.jpg', GETDATE());
END;

-- Add photos for more tickets (expand pattern)

PRINT 'Seed data inserted. Check ticket counts:';
SELECT COUNT(*) AS TotalTickets FROM dbo.Fact_SiteTickets WHERE FormTicketNumber LIKE 'TKT-%';
SELECT COUNT(*) AS TotalPhotos FROM dbo.Fact_TicketPhotos WHERE TicketID IN (SELECT TicketID FROM dbo.Fact_SiteTickets WHERE FormTicketNumber LIKE 'TKT-%');
