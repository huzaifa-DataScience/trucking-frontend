-- ============================================
-- Create First Admin User
-- ============================================
-- This script creates the first admin user in the database.
-- Run this directly in SQL Server Management Studio or via your backend's database connection.
--
-- IMPORTANT: Replace the password hash with your own hashed password.
-- The backend likely uses bcrypt or similar. See instructions below.
-- ============================================

-- Option 1: If your backend uses bcrypt (most common)
-- You'll need to generate a bcrypt hash for your password first.
-- Use an online tool like https://bcrypt-generator.com/ or generate via backend code.

-- Example: For password "admin123" with bcrypt rounds=10:
-- The hash would look like: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Replace YOUR_EMAIL_HERE and YOUR_PASSWORD_HASH_HERE below:

INSERT INTO Users (Email, PasswordHash, Role, Status, CreatedAt, LastLoginAt)
VALUES (
    'admin@example.com',                    -- Replace with your admin email
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- Replace with your password hash (see instructions)
    'admin',                                 -- Role: 'admin' or 'user'
    'active',                                -- Status: 'pending', 'active', 'inactive', 'rejected'
    GETDATE(),                               -- CreatedAt: current timestamp
    NULL                                     -- LastLoginAt: null initially
);

-- ============================================
-- Alternative: If your table structure is different
-- ============================================
-- Adjust column names based on your actual schema:
-- - Email might be: Email, email, UserEmail, etc.
-- - PasswordHash might be: PasswordHash, password_hash, Password, etc.
-- - Role might be: Role, role, UserRole, etc.
-- - Status might be: Status, status, UserStatus, IsActive, etc.
-- - CreatedAt might be: CreatedAt, created_at, CreatedDate, etc.

-- ============================================
-- Verify the admin was created:
-- ============================================
SELECT Id, Email, Role, Status, CreatedAt 
FROM Users 
WHERE Role = 'admin';

-- ============================================
-- How to Generate Password Hash:
-- ============================================
-- Method 1: Use your backend code (recommended)
--   - Create a temporary script in your backend to hash a password
--   - Example (Node.js/NestJS):
--     const bcrypt = require('bcrypt');
--     const hash = await bcrypt.hash('your-password', 10);
--     console.log(hash);
--
-- Method 2: Use online bcrypt generator
--   - Go to https://bcrypt-generator.com/
--   - Enter your password
--   - Set rounds to 10 (or whatever your backend uses)
--   - Copy the hash
--
-- Method 3: Use backend API (if available)
--   - Some backends have a /auth/hash-password endpoint for testing
--   - Or use a migration/seeding script
