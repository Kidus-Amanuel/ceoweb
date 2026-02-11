# Next.js 14+ App Router - Complete Folder Structure

## Overview

This document defines the complete `app/` directory structure following Next.js 14+ App Router conventions with enterprise-grade patterns for authentication, authorization, multi-tenancy, and modular architecture.

---

## 🎯 Key Improvements Over Original Structure

### 1. **Consistent Pattern Application**

- Every module now has: `loading.tsx`, `error.tsx`, and proper `layout.tsx`
- Standardized CRUD patterns: list → new → [id] → edit
- Unified API route structure matching frontend modules

### 2. **Enhanced Error Handling**

- Global error boundaries at multiple levels
- Specific 401 (unauthorized) and 403 (forbidden) pages
- Module-level error boundaries for isolated failures

### 3. **Better Loading States**

- Streaming-friendly loading.tsx at strategic levels
- Suspense boundaries for improved UX
- Skeleton screens where applicable

### 4. **Organized API Routes**

- RESTful patterns for each module
- Centralized webhook handling
- Auth helpers and server actions co-located

### 5. **Middleware Enhancements**

- Auth verification
- Onboarding completion check
- Role-based access control (RBAC)
- Company context injection

---

## 📁 Complete Folder Structure

```
app/
├── layout.tsx                          # Root layout (Supabase, React Query, Theme providers)
├── globals.css                         # Global styles + Tailwind directives
├── not-found.tsx                       # Global 404 page
├── error.tsx                           # Global error boundary
├── loading.tsx                         # Global loading state
├── template.tsx                        # Optional: for animations between routes
│
├── middleware.ts                       # 🔒 Auth + Onboarding + RBAC guards
│
├── (auth)/                             # 🌐 Route Group: Public/Unauthenticated
│   ├── layout.tsx                      # Centered card layout with branding
│   ├── error.tsx                       # Auth-specific error boundary
│   ├── login/
│   │   ├── page.tsx                    # Login form (email/password, OAuth)
│   │   └── loading.tsx                 # Login loading state
│   ├── signup/
│   │   ├── page.tsx                    # Registration form
│   │   └── loading.tsx                 # Signup loading state
│   ├── reset-password/
│   │   ├── page.tsx                    # Password reset request
│   │   └── success/
│   │       └── page.tsx                # Reset email sent confirmation
│   ├── verify-email/
│   │   └── page.tsx                    # Email verification handler
│   └── callback/
│       └── page.tsx                    # OAuth callback handler (Google, etc.)
│
├── (onboarding)/                       # 🚀 Route Group: First-Time Setup
│   ├── layout.tsx                      # Onboarding layout (logo, progress bar, no nav)
│   ├── error.tsx                       # Onboarding error boundary
│   └── onboarding/
│       ├── page.tsx                    # Step 1: Company information
│       ├── contact/
│       │   └── page.tsx                # Step 2: Contact details
│       ├── branding/
│       │   └── page.tsx                # Step 3: Logo upload + brand colors
│       ├── preferences/
│       │   └── page.tsx                # Step 4: Timezone, currency, language
│       └── complete/
│           └── page.tsx                # Step 5: Review, confirm, finalize
│
├── (dashboard)/                        # 🏢 Route Group: Authenticated Application
│   ├── layout.tsx                      # Main app layout (sidebar, header, breadcrumbs)
│   ├── loading.tsx                     # Dashboard-level loading skeleton
│   ├── error.tsx                       # Dashboard-level error boundary
│   ├── unauthorized.tsx                # 401 Unauthorized page
│   ├── forbidden.tsx                   # 403 Forbidden page (insufficient permissions)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                    # 📊 Main dashboard home (widgets, metrics)
│   │   ├── loading.tsx                 # Dashboard loading skeleton
│   │   └── error.tsx                   # Dashboard error boundary
│   │
│   ├── crm/
│   │   ├── layout.tsx                  # CRM module layout + sub-navigation tabs
│   │   ├── page.tsx                    # CRM overview/redirect to customers
│   │   ├── loading.tsx                 # CRM module loading
│   │   ├── error.tsx                   # CRM module error boundary
│   │   │
│   │   ├── customers/
│   │   │   ├── page.tsx                # Customer list (table/grid view)
│   │   │   ├── loading.tsx             # Customer list loading
│   │   │   ├── new/
│   │   │   │   ├── page.tsx            # New customer form
│   │   │   │   └── loading.tsx         # Form loading state
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Customer detail view
│   │   │       ├── loading.tsx         # Detail loading
│   │   │       ├── error.tsx           # Customer-specific error
│   │   │       └── edit/
│   │   │           └── page.tsx        # Edit customer form
│   │   │
│   │   ├── deals/
│   │   │   ├── page.tsx                # Deals pipeline (Kanban board)
│   │   │   ├── loading.tsx             # Pipeline loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # New deal form
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Deal detail view
│   │   │       └── edit/
│   │   │           └── page.tsx        # Edit deal
│   │   │
│   │   ├── activities/
│   │   │   ├── page.tsx                # Activities timeline/list
│   │   │   ├── loading.tsx             # Activities loading
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Activity detail
│   │   │
│   │   └── reports/
│   │       ├── page.tsx                # CRM reports dashboard
│   │       ├── sales-funnel/
│   │       │   └── page.tsx            # Sales funnel report
│   │       └── customer-insights/
│   │           └── page.tsx            # Customer insights report
│   │
│   ├── fleet/
│   │   ├── layout.tsx                  # Fleet module layout + sub-navigation
│   │   ├── page.tsx                    # Fleet overview dashboard
│   │   ├── loading.tsx                 # Fleet module loading
│   │   ├── error.tsx                   # Fleet module error boundary
│   │   │
│   │   ├── vehicles/
│   │   │   ├── page.tsx                # Vehicle list (table with filters)
│   │   │   ├── loading.tsx             # Vehicle list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new vehicle form
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Vehicle detail + telemetry
│   │   │       ├── loading.tsx         # Vehicle detail loading
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit vehicle
│   │   │       └── history/
│   │   │           └── page.tsx        # Vehicle maintenance history
│   │   │
│   │   ├── drivers/
│   │   │   ├── page.tsx                # Driver list
│   │   │   ├── loading.tsx             # Driver list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new driver
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Driver profile
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit driver
│   │   │       └── performance/
│   │   │           └── page.tsx        # Driver performance metrics
│   │   │
│   │   ├── shipments/
│   │   │   ├── page.tsx                # Shipment list (active/completed)
│   │   │   ├── loading.tsx             # Shipment list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create new shipment
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Shipment tracking detail
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit shipment
│   │   │       └── tracking/
│   │   │           └── page.tsx        # Live tracking map
│   │   │
│   │   ├── maintenance/
│   │   │   ├── page.tsx                # Maintenance schedule list
│   │   │   ├── loading.tsx             # Maintenance loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Schedule maintenance
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Maintenance record detail
│   │   │       └── edit/
│   │   │           └── page.tsx        # Edit maintenance record
│   │   │
│   │   └── reports/
│   │       ├── page.tsx                # Fleet reports dashboard
│   │       └── fuel-efficiency/
│   │           └── page.tsx            # Fuel efficiency report
│   │
│   ├── inventory/
│   │   ├── layout.tsx                  # Inventory module layout + sub-navigation
│   │   ├── page.tsx                    # Inventory overview (stock alerts, low stock)
│   │   ├── loading.tsx                 # Inventory module loading
│   │   ├── error.tsx                   # Inventory module error boundary
│   │   │
│   │   ├── products/
│   │   │   ├── page.tsx                # Product catalog (grid/list with search)
│   │   │   ├── loading.tsx             # Product list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new product
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Product detail (stock levels, history)
│   │   │       ├── loading.tsx         # Product detail loading
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit product
│   │   │       └── stock-movements/
│   │   │           └── page.tsx        # Product stock movement history
│   │   │
│   │   ├── warehouses/
│   │   │   ├── page.tsx                # Warehouse list
│   │   │   ├── loading.tsx             # Warehouse list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new warehouse
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Warehouse detail (capacity, stock)
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit warehouse
│   │   │       └── inventory/
│   │   │           └── page.tsx        # Warehouse inventory breakdown
│   │   │
│   │   ├── purchase-orders/
│   │   │   ├── page.tsx                # Purchase order list (pending, completed)
│   │   │   ├── loading.tsx             # PO list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create purchase order
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Purchase order detail
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit PO (if pending)
│   │   │       └── receive/
│   │   │           └── page.tsx        # Receive/fulfill PO
│   │   │
│   │   ├── vendors/
│   │   │   ├── page.tsx                # Vendor list
│   │   │   ├── loading.tsx             # Vendor list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new vendor
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Vendor profile
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit vendor
│   │   │       └── orders/
│   │   │           └── page.tsx        # Vendor order history
│   │   │
│   │   └── reports/
│   │       ├── page.tsx                # Inventory reports dashboard
│   │       ├── stock-valuation/
│   │       │   └── page.tsx            # Stock valuation report
│   │       └── turnover/
│   │           └── page.tsx            # Inventory turnover report
│   │
│   ├── hr/
│   │   ├── layout.tsx                  # HR module layout + sub-navigation
│   │   ├── page.tsx                    # HR overview (headcount, upcoming reviews)
│   │   ├── loading.tsx                 # HR module loading
│   │   ├── error.tsx                   # HR module error boundary
│   │   │
│   │   ├── employees/
│   │   │   ├── page.tsx                # Employee directory (searchable list)
│   │   │   ├── loading.tsx             # Employee list loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Add new employee (onboarding)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Employee profile (details, documents)
│   │   │       ├── loading.tsx         # Employee detail loading
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # Edit employee info
│   │   │       ├── documents/
│   │   │       │   └── page.tsx        # Employee documents
│   │   │       └── history/
│   │   │           └── page.tsx        # Employment history (promotions, etc.)
│   │   │
│   │   ├── attendance/
│   │   │   ├── page.tsx                # Attendance tracking dashboard
│   │   │   ├── loading.tsx             # Attendance loading
│   │   │   ├── clock-in/
│   │   │   │   └── page.tsx            # Clock in/out interface
│   │   │   └── reports/
│   │   │       └── page.tsx            # Attendance reports
│   │   │
│   │   ├── leave/
│   │   │   ├── page.tsx                # Leave requests list (pending, approved)
│   │   │   ├── loading.tsx             # Leave loading
│   │   │   ├── request/
│   │   │   │   └── page.tsx            # Request leave form
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Leave request detail (approve/reject)
│   │   │
│   │   ├── payroll/
│   │   │   ├── page.tsx                # Payroll dashboard (upcoming, history)
│   │   │   ├── loading.tsx             # Payroll loading
│   │   │   ├── run/
│   │   │   │   └── page.tsx            # Run payroll process
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Payroll run detail (employee breakdown)
│   │   │
│   │   ├── performance/
│   │   │   ├── page.tsx                # Performance reviews list
│   │   │   ├── loading.tsx             # Performance loading
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create performance review
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Performance review detail
│   │   │       └── edit/
│   │   │           └── page.tsx        # Edit review (if draft)
│   │   │
│   │   └── reports/
│   │       ├── page.tsx                # HR reports dashboard
│   │       ├── headcount/
│   │       │   └── page.tsx            # Headcount analysis
│   │       └── turnover/
│   │           └── page.tsx            # Employee turnover report
│   │
│   ├── chat/
│   │   ├── layout.tsx                  # Chat module layout (sidebar with channels)
│   │   ├── page.tsx                    # Chat index (redirect to general or recent)
│   │   ├── loading.tsx                 # Chat loading
│   │   ├── error.tsx                   # Chat error boundary
│   │   ├── new/
│   │   │   └── page.tsx                # Create new channel or DM
│   │   └── [channelId]/
│   │       ├── page.tsx                # Chat channel view (messages, input)
│   │       ├── loading.tsx             # Channel loading
│   │       └── settings/
│   │           └── page.tsx            # Channel settings (members, notifications)
│   │
│   ├── ai-agent/
│   │   ├── layout.tsx                  # AI Agent module layout
│   │   ├── page.tsx                    # AI index (new conversation, recent history)
│   │   ├── loading.tsx                 # AI loading
│   │   ├── error.tsx                   # AI error boundary
│   │   └── [conversationId]/
│   │       ├── page.tsx                # AI conversation view (chat interface)
│   │       ├── loading.tsx             # Conversation loading
│   │       └── share/
│   │           └── page.tsx            # Share conversation (public link)
│   │
│   └── settings/
│       ├── layout.tsx                  # Settings module layout (sidebar navigation)
│       ├── page.tsx                    # Settings index (redirect to profile)
│       ├── loading.tsx                 # Settings loading
│       ├── error.tsx                   # Settings error boundary
│       │
│       ├── profile/
│       │   ├── page.tsx                # Personal profile settings
│       │   └── loading.tsx             # Profile loading
│       │
│       ├── account/
│       │   ├── page.tsx                # Account settings (email, password)
│       │   └── loading.tsx             # Account loading
│       │
│       ├── notifications/
│       │   └── page.tsx                # Notification preferences
│       │
│       ├── security/
│       │   └── page.tsx                # Security settings (2FA, sessions)
│       │
│       ├── company/
│       │   ├── page.tsx                # Company settings (name, branding)
│       │   ├── loading.tsx             # Company loading
│       │   └── branding/
│       │       └── page.tsx            # Logo, colors, theme customization
│       │
│       ├── users/
│       │   ├── page.tsx                # Team/user management (list)
│       │   ├── loading.tsx             # Users loading
│       │   ├── invite/
│       │   │   └── page.tsx            # Invite new user form
│       │   └── [id]/
│       │       ├── page.tsx            # User detail (permissions, activity)
│       │       └── edit/
│       │           └── page.tsx        # Edit user (role assignment)
│       │
│       ├── roles/
│       │   ├── page.tsx                # Role management (list)
│       │   ├── loading.tsx             # Roles loading
│       │   ├── new/
│       │   │   └── page.tsx            # Create new role
│       │   └── [id]/
│       │       ├── page.tsx            # Role detail (permissions)
│       │       └── edit/
│       │           └── page.tsx        # Edit role permissions
│       │
│       ├── integrations/
│       │   ├── page.tsx                # Third-party integrations list
│       │   └── [integrationId]/
│       │       └── page.tsx            # Integration configuration
│       │
│       └── billing/
│           ├── page.tsx                # Billing overview (plan, usage)
│           ├── loading.tsx             # Billing loading
│           ├── subscription/
│           │   └── page.tsx            # Subscription management
│           ├── invoices/
│           │   └── page.tsx            # Invoice history
│           └── payment-methods/
│               └── page.tsx            # Payment method management
│
├── admin/                              # 🔐 Super Admin Section (Platform Admin)
│   ├── layout.tsx                      # Admin layout (different sidebar, branding)
│   ├── page.tsx                        # Admin dashboard (platform metrics)
│   ├── loading.tsx                     # Admin loading
│   ├── error.tsx                       # Admin error boundary
│   │
│   ├── tenants/
│   │   ├── page.tsx                    # Tenant/company list (all companies)
│   │   ├── loading.tsx                 # Tenant list loading
│   │   ├── new/
│   │   │   └── page.tsx                # Create new tenant
│   │   └── [id]/
│   │       ├── page.tsx                # Tenant detail (users, usage)
│   │       ├── edit/
│   │       │   └── page.tsx            # Edit tenant settings
│   │       └── impersonate/
│   │           └── page.tsx            # Impersonate tenant (login as)
│   │
│   ├── users/
│   │   ├── page.tsx                    # All platform users
│   │   └── [id]/
│   │       └── page.tsx                # Platform user detail
│   │
│   ├── analytics/
│   │   └── page.tsx                    # Platform-wide analytics
│   │
│   └── settings/
│       └── page.tsx                    # Platform settings (feature flags, etc.)
│
└── api/                                # 🔌 API Routes (Server-Side Logic)
    │
    ├── auth/
    │   ├── login/
    │   │   └── route.ts                # POST: Sign in with credentials
    │   ├── signup/
    │   │   └── route.ts                # POST: Register new user
    │   ├── logout/
    │   │   └── route.ts                # POST: Sign out
    │   ├── refresh/
    │   │   └── route.ts                # POST: Refresh auth token
    │   ├── verify-email/
    │   │   └── route.ts                # GET: Verify email token
    │   ├── reset-password/
    │   │   └── route.ts                # POST: Request password reset
    │   └── callback/
    │       └── route.ts                # GET: OAuth callback handler
    │
    ├── onboarding/
    │   ├── status/
    │   │   └── route.ts                # GET: Check onboarding status
    │   └── complete/
    │       └── route.ts                # POST: Mark onboarding complete
    │
    ├── crm/
    │   ├── customers/
    │   │   ├── route.ts                # GET: List customers, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single customer
    │   ├── deals/
    │   │   ├── route.ts                # GET: List deals, POST: Create deal
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single deal
    │   └── activities/
    │       ├── route.ts                # GET: List activities, POST: Create
    │       └── [id]/
    │           └── route.ts            # GET, PATCH, DELETE: Single activity
    │
    ├── fleet/
    │   ├── vehicles/
    │   │   ├── route.ts                # GET: List vehicles, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single vehicle
    │   ├── drivers/
    │   │   ├── route.ts                # GET: List drivers, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single driver
    │   └── shipments/
    │       ├── route.ts                # GET: List shipments, POST: Create
    │       └── [id]/
    │           └── route.ts            # GET, PATCH, DELETE: Single shipment
    │
    ├── inventory/
    │   ├── products/
    │   │   ├── route.ts                # GET: List products, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single product
    │   ├── warehouses/
    │   │   ├── route.ts                # GET: List warehouses, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single warehouse
    │   ├── purchase-orders/
    │   │   ├── route.ts                # GET: List POs, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single PO
    │   └── vendors/
    │       ├── route.ts                # GET: List vendors, POST: Create
    │       └── [id]/
    │           └── route.ts            # GET, PATCH, DELETE: Single vendor
    │
    ├── hr/
    │   ├── employees/
    │   │   ├── route.ts                # GET: List employees, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH, DELETE: Single employee
    │   ├── leave/
    │   │   ├── route.ts                # GET: List leave requests, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET, PATCH: Single leave request
    │   └── payroll/
    │       ├── route.ts                # GET: List payroll runs, POST: Create
    │       └── [id]/
    │           └── route.ts            # GET: Single payroll run detail
    │
    ├── chat/
    │   ├── channels/
    │   │   ├── route.ts                # GET: List channels, POST: Create
    │   │   └── [id]/
    │   │       ├── route.ts            # GET, PATCH, DELETE: Single channel
    │   │       └── messages/
    │   │           └── route.ts        # GET: Messages, POST: Send message
    │   └── messages/
    │       └── [id]/
    │           └── route.ts            # PATCH, DELETE: Single message
    │
    ├── ai-agent/
    │   ├── conversations/
    │   │   ├── route.ts                # GET: List conversations, POST: Create
    │   │   └── [id]/
    │   │       └── route.ts            # GET: Single conversation
    │   └── chat/
    │       └── route.ts                # POST: Send AI message, stream response
    │
    ├── users/
    │   ├── route.ts                    # GET: List users (company), POST: Invite
    │   ├── me/
    │   │   └── route.ts                # GET, PATCH: Current user profile
    │   └── [id]/
    │       └── route.ts                # GET, PATCH, DELETE: Single user
    │
    ├── upload/
    │   └── route.ts                    # POST: Upload file (S3/Supabase Storage)
    │
    ├── webhooks/
    │   ├── supabase/
    │   │   └── route.ts                # POST: Supabase webhooks (DB events)
    │   └── stripe/
    │       └── route.ts                # POST: Stripe webhooks (payments)
    │
    └── health/
        └── route.ts                    # GET: Health check endpoint
```

---

## 🛡️ Middleware Logic

**File:** `app/middleware.ts`

```typescript
// Key responsibilities:
// 1. Check authentication status (Supabase session)
// 2. Redirect unauthenticated users to /login
// 3. Check onboarding completion
// 4. Redirect incomplete onboarding → /onboarding
// 5. Check role-based access for admin routes
// 6. Inject company context into request headers
```

**Flow:**

1. Public routes `(auth)` → Allow all
2. Authenticated routes → Verify session
3. Dashboard routes → Check `onboarding_completed = true`
4. Admin routes → Check `role = 'super_admin'`

---

## 📋 Layout Hierarchy

### Root Layout (`app/layout.tsx`)

- **Providers:** Supabase Auth, React Query, Theme (dark/light mode)
- **Global:** Font imports, metadata, viewport config
- **Children:** All route groups

### Auth Layout (`app/(auth)/layout.tsx`)

- **Style:** Centered card, gradient background, logo
- **No navigation:** Clean, focused experience

### Onboarding Layout (`app/(onboarding)/layout.tsx`)

- **UI:** Logo, progress indicator (1/4, 2/4, etc.)
- **No sidebar:** Streamlined setup flow

### Dashboard Layout (`app/(dashboard)/layout.tsx`)

- **Components:** Sidebar, header, breadcrumbs, user menu
- **Context:** Company data, user permissions
- **Navigation:** Global app navigation

### Module Layouts (e.g., `app/(dashboard)/crm/layout.tsx`)

- **Sub-navigation:** Tabs for module sections (Customers, Deals, Reports)
- **Context:** Module-specific state/providers

### Admin Layout (`app/admin/layout.tsx`)

- **Different branding:** Admin-specific theme, sidebar
- **Restricted:** Only accessible to super admins

---

## 🎨 File Naming Conventions

| File            | Purpose                                   |
| --------------- | ----------------------------------------- |
| `page.tsx`      | Page component (route handler)            |
| `layout.tsx`    | Shared layout wrapper                     |
| `loading.tsx`   | Loading UI (Suspense fallback)            |
| `error.tsx`     | Error boundary                            |
| `not-found.tsx` | 404 handler                               |
| `route.ts`      | API route handler                         |
| `template.tsx`  | Re-renders on navigation (for animations) |

---

## 🚀 Route Groups Explained

### `(auth)` - Public Routes

- **URL:** `/login`, `/signup`, `/reset-password`
- **Auth:** Not required
- **Purpose:** Authentication flows

### `(onboarding)` - Setup Flow

- **URL:** `/onboarding/*`
- **Auth:** Required, but `onboarding_completed = false`
- **Purpose:** First-time company setup

### `(dashboard)` - Main Application

- **URL:** `/dashboard`, `/crm`, `/fleet`, etc.
- **Auth:** Required, `onboarding_completed = true`
- **Purpose:** Core business modules

### `admin` - Platform Admin

- **URL:** `/admin/*`
- **Auth:** Required, `role = 'super_admin'`
- **Purpose:** Multi-tenant platform management

---

## 🔄 Standardized CRUD Patterns

Every resource follows this pattern:

```
/module/resource/          → List view (page.tsx)
/module/resource/new       → Create form (page.tsx)
/module/resource/[id]      → Detail view (page.tsx)
/module/resource/[id]/edit → Edit form (page.tsx)
```

**Benefits:**

- Predictable URL structure
- Consistent user experience
- Easier to maintain and extend

---

## 📊 Loading & Error States

### Strategic Placement

- **Root level:** Global fallbacks
- **Module level:** Isolated failures
- **Page level:** Granular loading states

### Example: CRM Customers

```
crm/customers/
├── page.tsx       → Customer list
├── loading.tsx    → Shows skeleton table while loading
└── error.tsx      → Shows error if list fetch fails
```

This prevents a CRM error from breaking the entire app.

---

## 🔌 API Routes Organization

### RESTful Patterns

- `GET /api/crm/customers` → List customers
- `POST /api/crm/customers` → Create customer
- `GET /api/crm/customers/[id]` → Get single customer
- `PATCH /api/crm/customers/[id]` → Update customer
- `DELETE /api/crm/customers/[id]` → Delete customer

### Server Actions (Alternative)

You can also use Server Actions for mutations instead of API routes:

- Co-locate in `app/actions/crm/customers.ts`
- Use `'use server'` directive
- Call directly from client components

---

## ✅ Key Features Covered

### ✓ Authentication & Authorization

- Login, signup, OAuth callback, email verification
- Password reset flow
- Role-based access control (RBAC)

### ✓ Onboarding Flow

- Multi-step company setup
- Progress tracking
- Middleware enforcement

### ✓ Multi-Tenancy

- Company context injection
- Super admin tenant management
- Tenant isolation via RLS (Supabase)

### ✓ Modular Business Logic

- CRM (Customers, Deals, Activities, Reports)
- Fleet (Vehicles, Drivers, Shipments, Maintenance)
- Inventory (Products, Warehouses, POs, Vendors)
- HR (Employees, Attendance, Leave, Payroll, Performance)
- Chat (Channels, Messages)
- AI Agent (Conversations)

### ✓ Settings & Configuration

- User profile & account settings
- Company settings & branding
- Team management & role assignment
- Integrations & billing

### ✓ Error Handling

- Global error boundaries
- Module-specific error handling
- 404, 401, 403 pages

### ✓ Performance Optimization

- Streaming with loading.tsx
- Suspense boundaries
- Parallel data fetching

---

## 📝 Implementation Checklist

### Phase 1: Foundation

- [ ] Set up root layout with providers
- [ ] Configure middleware (auth + onboarding)
- [ ] Create auth layout and pages
- [ ] Create onboarding layout and flow
- [ ] Set up global error and loading states

### Phase 2: Dashboard Core

- [ ] Create dashboard layout (sidebar + header)
- [ ] Build main dashboard page
- [ ] Add 401/403 error pages
- [ ] Implement navigation component

### Phase 3: Core Modules

- [ ] CRM module (customers, deals, activities)
- [ ] Fleet module (vehicles, drivers, shipments)
- [ ] Inventory module (products, warehouses, POs)
- [ ] HR module (employees, leave, payroll)

### Phase 4: Additional Features

- [ ] Chat module
- [ ] AI Agent module
- [ ] Settings module
- [ ] Admin panel

### Phase 5: API & Integrations

- [ ] API routes for all modules
- [ ] Webhook handlers
- [ ] File upload endpoint
- [ ] Third-party integrations

---

## 🎯 Best Practices Applied

1. **Co-location:** Related files grouped together
2. **Separation of Concerns:** Route groups for logical separation
3. **Error Isolation:** Module-level error boundaries
4. **Loading States:** Progressive loading with Suspense
5. **SEO:** Proper metadata in each layout
6. **Type Safety:** TypeScript throughout
7. **Accessibility:** Semantic HTML, ARIA labels
8. **Performance:** Server Components by default, Client only when needed
9. **Security:** Middleware guards, RLS policies, input validation
10. **Scalability:** Modular structure supports future growth

---

## 📚 Related Documentation

- **Next.js App Router:** https://nextjs.org/docs/app
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **React Query:** https://tanstack.com/query/latest
- **Tailwind CSS:** https://tailwindcss.com/docs

---

**Last Updated:** 2026-02-11  
**Version:** 1.0 - Refined Structure
