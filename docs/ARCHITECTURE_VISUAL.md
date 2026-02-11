# 🗺️ Enterprise SaaS - Visual Architecture Guide

## 📊 Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE MULTI-TENANT SAAS                        │
│                                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Super Admin  │  │Company Admin │  │   Manager    │  │   Employee   │ │
│  │  (Platform)   │  │  (Business)  │  │ (Department) │  │   (Staff)    │ │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│          │                 │                 │                 │          │
│          └─────────────────┴─────────────────┴─────────────────┘          │
│                                    │                                       │
│                                    ▼                                       │
│                        ┌───────────────────────┐                          │
│                        │   MIDDLEWARE LAYER    │                          │
│                        │  - Auth Check         │                          │
│                        │  - Onboarding Check   │                          │
│                        │  - Role-Based Access  │                          │
│                        │  - Company Context    │                          │
│                        └───────────┬───────────┘                          │
│                                    │                                       │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │              ROUTE-BASED ACCESS CONTROL                │
        └────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌──────────────────┐        ┌─────────────────┐
│  (auth)       │          │  (onboarding)    │        │  (dashboard)    │
│  Public Area  │          │  Setup Flow      │        │  Main App       │
├───────────────┤          ├──────────────────┤        ├─────────────────┤
│ • Login       │          │ • Company Info   │        │ • Dashboard     │
│ • Signup      │          │ • Contact        │        │ • CRM           │
│ • Reset Pass  │          │ • Branding       │        │ • Fleet         │
│ • Verify      │          │ • Preferences    │        │ • Inventory     │
│ • OAuth       │          │ • Complete       │        │ • HR            │
│               │          │                  │        │ • Chat          │
│ No Auth ✗     │          │ Auth ✓           │        │ • AI Agent      │
│               │          │ Onboarding ✗     │        │ • Settings      │
│               │          │                  │        │                 │
│               │          │                  │        │ Auth ✓          │
│               │          │                  │        │ Onboarding ✓    │
└───────────────┘          └──────────────────┘        └─────────────────┘
                                                                │
                                                                ▼
                                                    ┌────────────────────┐
                                                    │   admin/           │
                                                    │   Super Admin Only │
                                                    ├────────────────────┤
                                                    │ • All Tenants      │
                                                    │ • Analytics        │
                                                    │ • Impersonate      │
                                                    │ • System Settings  │
                                                    │                    │
                                                    │ Super Admin Role ✓ │
                                                    └────────────────────┘
```

---

## 🎭 Role-Based Sidebar Differences

### Super Admin View

```
┌─────────────────────────────┐
│  🏢 PLATFORM ADMIN          │
├─────────────────────────────┤
│ 📊 Platform Overview        │
│ 🏪 Tenants (Companies)      │
│ 📈 Platform Analytics       │
│ 👥 All Users                │
│ ⚙️  System Settings          │
│ 🔐 Feature Flags            │
└─────────────────────────────┘
```

### Company Admin View

```
┌─────────────────────────────┐
│  🏢 [Company Name]          │
├─────────────────────────────┤
│ 📊 Dashboard                │
│ 👥 CRM                      │
│   ├─ Customers              │
│   ├─ Deals                  │
│   ├─ Activities             │
│   └─ Reports                │
│ 🚛 Fleet                    │
│   ├─ Vehicles               │
│   ├─ Drivers                │
│   ├─ Shipments              │
│   └─ Maintenance            │
│ 📦 Inventory                │
│   ├─ Products               │
│   ├─ Warehouses             │
│   ├─ Purchase Orders        │
│   └─ Vendors                │
│ 👔 HR                       │
│   ├─ Employees              │
│   ├─ Attendance             │
│   ├─ Leave                  │
│   ├─ Payroll                │
│   └─ Performance            │
│ 💬 Chat                     │
│ 🤖 AI Agent                 │
│ ⚙️  Settings                 │
│   ├─ Profile                │
│   ├─ Company                │
│   ├─ Team                   │
│   ├─ Roles                  │
│   └─ Billing                │
└─────────────────────────────┘
```

### Manager View (CRM Manager Example)

```
┌─────────────────────────────┐
│  👤 [User Name] (Manager)   │
├─────────────────────────────┤
│ 📊 Dashboard                │
│ 👥 CRM                      │ ← Only assigned module
│   ├─ Customers              │
│   ├─ Deals                  │
│   ├─ Activities             │
│   └─ Reports                │
│ 💬 Chat                     │
│ ⚙️  Settings                 │
│   └─ Profile                │ ← Limited settings
└─────────────────────────────┘
```

### Employee View (CRM Sales Rep Example)

```
┌─────────────────────────────┐
│  👤 [User Name] (Employee)  │
├─────────────────────────────┤
│ 📊 My Dashboard             │
│ 👥 CRM                      │ ← Department access
│   ├─ Customers              │
│   └─ My Deals               │ ← Filtered to own
│ 💬 Chat                     │ ← Universal for all
│ ⚙️  My Profile               │ ← Profile only
└─────────────────────────────┘
```

---

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ROOT LAYOUT                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Providers (Supabase, React Query, Theme)                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Route Group Layouts                        │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  (auth) Layout          (onboarding) Layout                  │ │
│  │  ┌──────────────┐       ┌──────────────────┐                 │ │
│  │  │ Centered     │       │ Logo + Progress  │                 │ │
│  │  │ Card         │       │ Bar              │                 │ │
│  │  │ No Nav       │       │ No Sidebar       │                 │ │
│  │  └──────────────┘       └──────────────────┘                 │ │
│  │                                                               │ │
│  │  (dashboard) Layout                                          │ │
│  │  ┌────────────────────────────────────────────┐              │ │
│  │  │  ┌─────────┐  ┌──────────────────────────┐ │              │ │
│  │  │  │ Sidebar │  │       Header             │ │              │ │
│  │  │  │ (Role-  │  │  User Menu | Notifs      │ │              │ │
│  │  │  │ Based)  │  └──────────────────────────┘ │              │ │
│  │  │  │         │  ┌──────────────────────────┐ │              │ │
│  │  │  │ - Dash  │  │    Breadcrumbs           │ │              │ │
│  │  │  │ - CRM   │  └──────────────────────────┘ │              │ │
│  │  │  │ - Fleet │  ┌──────────────────────────┐ │              │ │
│  │  │  │ - HR    │  │                          │ │              │ │
│  │  │  │ - Chat  │  │     Page Content         │ │              │ │
│  │  │  │         │  │                          │ │              │ │
│  │  │  │         │  │  (Module-specific        │ │              │ │
│  │  │  │         │  │   layout if nested)      │ │              │ │
│  │  │  │         │  │                          │ │              │ │
│  │  │  └─────────┘  └──────────────────────────┘ │              │ │
│  │  └────────────────────────────────────────────┘              │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  UI Component   │
                    │  (React)        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Custom Hook    │  ← useCustomers, useAuth, etc.
                    │  (Composable)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  React Query    │  ← Caching, refetching
                    │  (TanStack)     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  API Client     │  ← lib/api/crm.ts
                    │  (Fetch/Axios)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Next.js API    │  ← app/api/crm/customers/route.ts
                    │  Route Handler  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Supabase       │  ← Database + Auth
                    │  (PostgreSQL)   │
                    └─────────────────┘
```

---

## 🗄️ Database Structure (Simplified)

```
┌──────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  public.users (Supabase Auth integrated)                        │
│  ├─ id                                                           │
│  ├─ email                                                        │
│  ├─ role_id ─────────────┐                                      │
│  ├─ company_id ──────────┼────┐                                 │
│  ├─ onboarding_completed │    │                                 │
│  └─ created_at           │    │                                 │
│                          │    │                                 │
│  public.roles            │    │                                 │
│  ├─ id    ◄──────────────┘    │                                 │
│  ├─ name (super_admin, admin, manager, employee)                │
│  ├─ level (hierarchy)         │                                 │
│  └─ created_at                │                                 │
│                               │                                 │
│  public.companies             │                                 │
│  ├─ id    ◄───────────────────┘                                 │
│  ├─ name                                                         │
│  ├─ logo_url                                                     │
│  ├─ settings (JSONB)                                             │
│  └─ created_at                                                   │
│                                                                  │
│  public.permissions                                              │
│  ├─ id                                                           │
│  ├─ resource (e.g., 'crm.customers')                            │
│  ├─ action (e.g., 'create', 'read', 'update', 'delete')        │
│  └─ description                                                  │
│                                                                  │
│  public.role_permissions (many-to-many)                         │
│  ├─ role_id                                                      │
│  └─ permission_id                                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    MODULE TABLES                           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  CRM                                                       │ │
│  │  ├─ customers (company_id, name, email, ...)              │ │
│  │  ├─ deals (company_id, customer_id, amount, stage, ...)   │ │
│  │  └─ activities (company_id, user_id, type, ...)           │ │
│  │                                                            │ │
│  │  Fleet                                                     │ │
│  │  ├─ vehicles (company_id, registration, ...)              │ │
│  │  ├─ drivers (company_id, user_id, ...)                    │ │
│  │  └─ shipments (company_id, vehicle_id, ...)               │ │
│  │                                                            │ │
│  │  Inventory                                                 │ │
│  │  ├─ products (company_id, sku, name, ...)                 │ │
│  │  ├─ warehouses (company_id, location, ...)                │ │
│  │  └─ purchase_orders (company_id, vendor_id, ...)          │ │
│  │                                                            │ │
│  │  HR                                                        │ │
│  │  ├─ employees (company_id, user_id, ...)                  │ │
│  │  ├─ leave_requests (company_id, employee_id, ...)         │ │
│  │  └─ payroll_runs (company_id, ...)                        │ │
│  │                                                            │ │
│  │  Chat                                                      │ │
│  │  ├─ channels (company_id, name, type, ...)                │ │
│  │  ├─ messages (channel_id, user_id, content, ...)          │ │
│  │  └─ channel_members (channel_id, user_id, ...)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🔒 Row Level Security (RLS) Policies on ALL tables              │
│     - Users can only access their company's data                 │
│     - Admins can see all data in their company                   │
│     - Employees see filtered data (own deals, assigned vehicles) │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER JOURNEY FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: Registration
  ┌──────────────┐
  │ /signup      │ → User fills form → POST /api/auth/signup
  └──────────────┘
         │
         ├─► Creates Supabase auth account
         ├─► Creates user record with role_id = 'company_admin'
         ├─► Sets onboarding_completed = false
         └─► Sends verification email

STEP 2: Email Verification
  ┌──────────────┐
  │ /verify      │ → Click email link → Supabase verifies email
  └──────────────┘

STEP 3: Login
  ┌──────────────┐
  │ /login       │ → Enter credentials → POST /api/auth/login
  └──────────────┘
         │
         └─► Middleware checks session

STEP 4: Middleware Checks
  ┌─────────────────────────────────────────────────────┐
  │  MIDDLEWARE                                         │
  ├─────────────────────────────────────────────────────┤
  │  ✓ Is authenticated?                                │
  │    ├─ No  → Redirect to /login                      │
  │    └─ Yes → Continue                                │
  │                                                      │
  │  ✓ Onboarding completed?                            │
  │    ├─ No  → Redirect to /onboarding                 │
  │    └─ Yes → Continue                                │
  │                                                      │
  │  ✓ Has role access for route?                       │
  │    ├─ No  → Show 403 Forbidden                      │
  │    └─ Yes → Allow access                            │
  │                                                      │
  │  ✓ Inject company context                           │
  └─────────────────────────────────────────────────────┘

STEP 5: Onboarding (First Login)
  ┌──────────────────┐
  │ /onboarding      │ → Step 1: Company info
  │ /onboarding      │ → Step 2: Contact details
  │   /contact       │
  │ /onboarding      │ → Step 3: Branding
  │   /branding      │
  │ /onboarding      │ → Step 4: Preferences
  │   /preferences   │
  │ /onboarding      │ → Step 5: Complete
  │   /complete      │ → POST /api/onboarding/complete
  └──────────────────┘
         │
         └─► Sets onboarding_completed = true

STEP 6: Dashboard Access
  ┌──────────────┐
  │ /dashboard   │ ← User lands here after onboarding
  └──────────────┘
         │
         ├─► Sidebar renders based on role
         ├─► Permissions checked for every action
         └─► Company data filtered via RLS
```

---

## 📱 Module Deep Dive: CRM Example

```
CRM MODULE STRUCTURE
┌────────────────────────────────────────────────────────────────┐
│  Frontend (app/)                  Backend (app/api/)           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  /crm/customers                   /api/crm/customers          │
│  ├─ page.tsx                      └─ route.ts                 │
│  │  └─ CustomerList                  ├─ GET  (list)           │
│  │                                   └─ POST (create)          │
│  ├─ new/                                                       │
│  │  └─ page.tsx                  /api/crm/customers/[id]      │
│  │     └─ CustomerForm            └─ route.ts                 │
│  │                                   ├─ GET    (single)        │
│  └─ [id]/                            ├─ PATCH  (update)        │
│     ├─ page.tsx                      └─ DELETE (delete)        │
│     │  └─ CustomerDetail                                       │
│     └─ edit/                                                   │
│        └─ page.tsx                                             │
│           └─ CustomerEditForm                                  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  Components (components/crm/)     Hooks (composables/api/crm/)│
├────────────────────────────────────────────────────────────────┤
│  customers/                       useCustomers.ts              │
│  ├─ CustomerList.tsx              ├─ useCustomers() → fetch   │
│  ├─ CustomerCard.tsx              ├─ useCustomer(id)          │
│  ├─ CustomerForm.tsx              ├─ useCreateCustomer()      │
│  ├─ CustomerDetail.tsx            ├─ useUpdateCustomer()      │
│  └─ CustomerFilters.tsx           └─ useDeleteCustomer()      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  Database (Supabase)              Types (types/crm.types.ts)  │
├────────────────────────────────────────────────────────────────┤
│  customers table                  interface Customer {        │
│  ├─ id (uuid)                       id: string;               │
│  ├─ company_id (uuid)               company_id: string;       │
│  ├─ name (text)                     name: string;             │
│  ├─ email (text)                    email: string;            │
│  ├─ phone (text)                    phone?: string;           │
│  ├─ created_by (uuid)               created_at: Date;         │
│  └─ created_at (timestamptz)      }                           │
│                                                                │
│  RLS Policy:                      Validation (lib/validation/)│
│  "Users can only see customers    customerSchema (Zod)        │
│   from their own company"         ├─ name: required           │
│                                   ├─ email: email format      │
│                                   └─ phone: optional          │
└────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Multi-Tenancy Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      MULTI-TENANCY MODEL                         │
└──────────────────────────────────────────────────────────────────┘

Company A                 Company B                 Company C
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ ID: comp-123 │         │ ID: comp-456 │         │ ID: comp-789 │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ Users (5)    │         │ Users (20)   │         │ Users (3)    │
│ - Admin      │         │ - Admin      │         │ - Admin      │
│ - Manager    │         │ - 2 Managers │         │ - Employee   │
│ - 3 Employees│         │ - 17 Employees│        │ - Employee   │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ Data         │         │ Data         │         │ Data         │
│ - 50 Customers│        │ - 200 Cust.  │         │ - 10 Cust.   │
│ - 10 Vehicles│         │ - 50 Vehicles│         │ - 2 Vehicles │
│ - 100 Products│        │ - 500 Prod.  │         │ - 20 Products│
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   SHARED DATABASE      │
                    │   (with RLS)           │
                    ├────────────────────────┤
                    │  All tables have       │
                    │  company_id column     │
                    │                        │
                    │  RLS filters by        │
                    │  current user's        │
                    │  company_id            │
                    └────────────────────────┘

ISOLATION METHODS:
  ✓ Row Level Security (RLS) in Supabase
  ✓ Middleware injects company_id into requests
  ✓ API routes filter by company_id
  ✓ Frontend components only show company data
```

---

## 🎨 Component Reusability Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                   COMPONENT HIERARCHY                            │
└──────────────────────────────────────────────────────────────────┘

LEVEL 1: Base UI Components (components/shared/ui/)
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Button  │  │  Input   │  │  Select  │  ← Pure UI, no logic
  └──────────┘  └──────────┘  └──────────┘
       ▲             ▲             ▲
       │             │             │
       └─────────────┴─────────────┘
                     │
LEVEL 2: Form Components (components/shared/forms/)
  ┌─────────────────────────────────────┐
  │  FormField (uses Button, Input)     │  ← Combines base UI
  └─────────────────────────────────────┘
                     ▲
                     │
LEVEL 3: Domain Components (components/crm/customers/)
  ┌─────────────────────────────────────┐
  │  CustomerForm                       │  ← Uses FormField
  │  (uses FormField, business logic)   │     + business logic
  └─────────────────────────────────────┘
                     ▲
                     │
LEVEL 4: Page Components (app/(dashboard)/crm/customers/new/)
  ┌─────────────────────────────────────┐
  │  New Customer Page                  │  ← Uses CustomerForm
  │  (uses CustomerForm, handles save)  │     + routing logic
  └─────────────────────────────────────┘
```

---

## 🚀 Quick Reference: Common Patterns

### Pattern 1: Fetching Data

```typescript
// Hook (composables/api/crm/useCustomers.ts)
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/crm/customers");
      return response.json();
    },
  });
}

// Component usage
const { data: customers, isLoading } = useCustomers();
```

### Pattern 2: Permission Check

```typescript
const { hasPermission } = usePermissions();

if (hasPermission('crm.customers', 'create')) {
  return <Button>Add Customer</Button>;
}
```

### Pattern 3: Role-Based Rendering

```typescript
const { hasRole } = usePermissions();

return (
  <>
    {hasRole('company_admin') && <BillingSection />}
    {hasRole('employee') && <LimitedView />}
  </>
);
```

### Pattern 4: Company-Scoped Query

```typescript
// Automatic via RLS - no manual filtering needed!
const customers = await supabase.from("customers").select("*");
// RLS automatically filters by current user's company_id
```

---

## 📚 Documentation Map

```
Project Root
├── COMPLETE_PROJECT_STRUCTURE.md  ← Full folder structure
├── GETTING_STARTED.md             ← Quick start guide (phases)
├── ARCHITECTURE_VISUAL.md         ← This file (diagrams)
│
└── .app/
    ├── APP_STRUCTURE.md           ← Next.js App Router details
    └── ROLE_PERMISSIONS.md        ← RBAC matrix
```

---

**Last Updated**: 2026-02-11  
**Version**: 1.0  
**Purpose**: Visual reference for system architecture
