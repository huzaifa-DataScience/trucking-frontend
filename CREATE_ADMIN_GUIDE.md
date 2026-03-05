# Creating the First Admin User

Since the admin panel requires admin access to approve users, you need to create the first admin user **directly in the database**.

## Quick Steps

### Option 1: SQL Script (Recommended)

1. **Open the SQL script**: `create-first-admin.sql`

2. **Generate a password hash**:
   - **Method A (Backend Code)**: Create a temporary script:
     ```typescript
     // In your backend project
     import * as bcrypt from 'bcrypt';
     const hash = await bcrypt.hash('your-password-here', 10);
     console.log(hash);
     ```
   - **Method B (Online Tool)**: Use https://bcrypt-generator.com/
     - Enter your password
     - Set rounds to `10` (or whatever your backend uses)
     - Copy the generated hash

3. **Edit the SQL script**:
   - Replace `'admin@example.com'` with your admin email
   - Replace the password hash with your generated hash
   - Adjust table/column names if your schema differs

4. **Run the SQL script** in SQL Server Management Studio or via your backend's database connection

5. **Verify**:
   ```sql
   SELECT Id, Email, Role, Status FROM Users WHERE Role = 'admin';
   ```

6. **Login**:
   - Go to `http://localhost:3002/login`
   - Use your admin email and password
   - You should now see the "User Management" link in the sidebar

---

### Option 2: Backend Seeding Script

If your backend has a seeding/migration system, you can add an admin user there:

**Example (NestJS):**

```typescript
// In your backend seeding script or migration
import * as bcrypt from 'bcrypt';

async function seedAdmin() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'your-secure-password';
  
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  
  await userRepository.save({
    email: adminEmail,
    passwordHash: passwordHash,
    role: 'admin',
    status: 'active',
    createdAt: new Date(),
  });
}
```

---

### Option 3: Temporary Backend Endpoint (One-Time Use)

Create a temporary endpoint in your backend that creates the first admin (then remove it):

```typescript
// TEMPORARY - Remove after creating first admin!
@Post('create-first-admin')
async createFirstAdmin(@Body() dto: { email: string; password: string }) {
  const existingAdmin = await this.userService.findOneByEmail(dto.email);
  if (existingAdmin) {
    throw new BadRequestException('Admin already exists');
  }
  
  const passwordHash = await bcrypt.hash(dto.password, 10);
  
  return this.userService.create({
    email: dto.email,
    passwordHash,
    role: 'admin',
    status: 'active',
  });
}
```

Then call it once:
```bash
curl -X POST http://localhost:3000/auth/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

**⚠️ IMPORTANT**: Remove this endpoint immediately after creating the admin!

---

## After Creating the First Admin

1. **Login** with your admin credentials
2. **Access Admin Panel**: Click "User Management" in the sidebar
3. **Approve Other Users**: Any users who sign up will appear as "Pending" and you can approve them
4. **Promote Users to Admin**: You can change any user's role to "admin" via the User Detail Modal

---

## Troubleshooting

### "Access denied" or 403 error
- Verify the user has `role = 'admin'` in the database
- Check that the backend is checking the role correctly

### Password hash doesn't work
- Ensure you're using the same hashing algorithm as your backend (usually bcrypt with 10 rounds)
- Check your backend's password hashing configuration

### Table/column names don't match
- Check your backend's User entity/schema
- Common variations:
  - `Users` vs `users` vs `dbo.Users`
  - `PasswordHash` vs `password_hash` vs `Password`
  - `Role` vs `role` vs `UserRole`
  - `Status` vs `status` vs `UserStatus`

### Can't find the Users table
- Check your database schema
- The table might be in a different schema (e.g., `dbo.Users`)
- Use: `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%User%'`

---

## Security Notes

- **Change the default password** immediately after first login
- **Use a strong password** (at least 12 characters, mix of letters, numbers, symbols)
- **Never commit** the SQL script with a real password hash to version control
- **Remove** any temporary admin creation endpoints after use
