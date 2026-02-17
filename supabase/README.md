# Multi-Tenant ERP Database Schema

Production-ready Supabase database schema for a multi-tenant ERP system with dynamic role-based access control (RBAC) and strict Row-Level Security (RLS) policies.

## 📋 Features

- ✅ **Multi-tenant architecture** with strict company isolation
- ✅ **Dynamic role system** (super_admin + company-specific roles)
- ✅ **Module-based permissions** (CRM, HR, Fleet, Inventory, Finance)
- ✅ **Comprehensive RLS policies** enforcing tenant boundaries
- ✅ **Supabase Auth integration** with auto-profile creation
- ✅ **Audit logging** for compliance and tracking
- ✅ **Helper functions** for permission checking
- ✅ **Production-ready** with indexes, constraints, and comments

## 🏗️ Architecture

### User Types

1. **super_admin** - Platform owner, can access all companies
2. **company_user** - Regular user belonging to one company

### Core Tables

```
companies → profiles → company_users → roles → role_permissions
                                           ↓
                                      modules
```

### Modules

- **CRM** - Customer Relationship Management
- **HR** - Human Resources
- **Fleet** - Vehicle & Driver Management
- **Inventory** - Product & Warehouse Management
- **Finance** - Financial Operations

## 🚀 Quick Start

### 1. Initialize Supabase (if not done)

```bash
cd supabase
supabase init
```

### 2. Start Local Supabase

```bash
supabase start
```

### 3. Apply Migrations

```bash
# Apply all migrations
supabase db reset

# Or apply migrations manually
supabase migration up
```

### 4. Load Seed Data (Optional - for testing)

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres < seed.sql
```

## 📁 Migration Files

| File                                         | Description                                                           |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `20260212_000001_create_core_schema.sql`     | Core multi-tenant tables, enums, helper functions, and RLS policies   |
| `20260212_000002_create_business_tables.sql` | Business entities (projects, employees, customers, vehicles) with RLS |
| `20260212_000003_create_auth_functions.sql`  | Auth integration, permission functions, audit logging                 |
| `seed.sql`                                   | Sample data for development/testing                                   |

## 🔐 Security Model

### Row-Level Security (RLS)

All tables enforce strict RLS policies:

- **super_admin**: Can access all data across companies
- **company_user**: Can only access data from their company
- **Ownership**: Some tables support owner-based access (e.g., projects, customers)

### Permission Checks

Permissions are granular: `module + action`

**Actions**: `view`, `create`, `edit`, `delete`, `export`, `approve`

Example RLS policy:

```sql
CREATE POLICY "Projects: authorized users can create"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND has_permission('crm', 'create')
  );
```

## 🛠️ Helper Functions

### Permission Checking

```typescript
// In your application
const { data } = await supabase.rpc("get_user_permissions");
// Returns: [{"module": "crm", "action": "view"}, ...]

const { data } = await supabase.rpc("get_user_role_info");
// Returns complete user role and permission info
```

### User Invitation

```sql
-- Create user via Supabase Auth
-- Then link to company with role:
SELECT handle_user_invitation(
  'user-uuid',
  'company-uuid',
  'role-uuid',
  'Job Position'
);
```

## 📊 Database Schema

### Core Tables

#### `companies`

- Multi-tenant company records
- Each user belongs to one company (except super_admin)

#### `profiles`

- Extends `auth.users`
- Links users to companies
- Tracks user_type (super_admin | company_user)

#### `roles`

- Company-specific role definitions
- E.g., "General Manager", "HR Manager", "Sales Executive"

#### `company_users`

- Associates users with companies
- Assigns role to user
- Tracks position and status

#### `role_permissions`

- Granular module-action permissions
- E.g., role "HR Manager" has hr+view, hr+create, hr+edit

#### `modules`

- Reference table of available modules
- Pre-populated: CRM, HR, Fleet, Inventory, Finance

### Business Tables (Examples)

#### `projects`

- Company projects
- Owner-based access control
- Requires CRM permissions

#### `employees`

- HR employee records
- Sensitive data with strict access
- Requires HR permissions

#### `customers`

- CRM customer records
- Assignment-based access
- Requires CRM permissions

#### `vehicles`

- Fleet vehicle tracking
- Driver assignment tracking
- Requires Fleet permissions

## 🧪 Testing

### Test RLS Policies

```sql
-- As company user (set session)
SET LOCAL request.jwt.claims = '{"sub": "user-id", "role": "authenticated"}';

-- Verify company isolation
SELECT * FROM projects; -- Should only see own company

-- Try accessing other company (should fail)
INSERT INTO projects (company_id, ...)
VALUES ('other-company-id', ...); -- Should be blocked by RLS
```

### Test Permissions

```sql
-- Check if user has permission
SELECT has_permission('crm', 'create'); -- true/false

-- Get all permissions
SELECT * FROM get_user_permissions();

-- Get role info
SELECT * FROM get_user_role_info();
```

## 🔄 Pushing to Production

```bash
# After testing locally
supabase db push

# Or create a migration from remote changes
supabase db pull
```

## 📝 Usage Examples

### TypeScript/Next.js

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, key);

// Check permissions
const { data: permissions } = await supabase.rpc("get_user_permissions");
const canCreate = permissions.some(
  (p) => p.module === "crm" && p.action === "create",
);

// Get current user role info
const { data: roleInfo } = await supabase.rpc("get_user_role_info");
console.log(roleInfo.role_name, roleInfo.permissions);

// Query data (RLS automatically filters by company)
const { data: projects } = await supabase.from("projects").select("*");
// No need to filter by company_id - RLS does it!
```

## 🎯 Best Practices

1. **Never bypass RLS** - All queries go through RLS policies
2. **Use helper functions** - `get_user_company_id()`, `has_permission()`
3. **Check permissions** - Both frontend (UX) and backend (security)
4. **Audit critical actions** - Use `log_audit()` for important changes
5. **Test with multiple users** - Verify cross-company isolation

## 📚 Documentation References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 🐛 Troubleshooting

### RLS Blocking Queries

```sql
-- Check current user context
SELECT auth.uid(), get_user_company_id(), get_user_type();

-- Temporarily disable RLS for testing (DANGEROUS - dev only!)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### Permission Issues

```sql
-- Verify role permissions
SELECT r.name, rp.module, rp.action
FROM company_users cu
JOIN roles r ON r.id = cu.role_id
JOIN role_permissions rp ON rp.role_id = r.id
WHERE cu.user_id = auth.uid();
```

## 📦 Next Steps

1. **Expand business tables** - Add tables for deals, invoices, shipments, etc.
2. **Add approval workflows** - Extend with approval tables and logic
3. **Implement soft deletes** - Add `deleted_at` columns
4. **Build frontend permissions** - Use `get_user_permissions()` for UI
5. **Add more modules** - Extend with Accounting, Project Management, etc.

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-12  
**Compatibility**: Supabase CLI 1.136.3+, PostgreSQL 15+
