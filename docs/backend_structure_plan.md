# Phase 2.1 Implementation Plan: Backend Structure & Services

## Goal Description

Establish a clean, scalable backend architecture by implementing a **Service Layer** (`.app/services`), **State Management** (`.app/store`), and secure **API Routes** (`.app/app/api`). This ensures business logic is reusable and separated from the presentation layer.

## Proposed Changes

### 1. Service Layer (.app/services)

Create typed services to wrap Supabase calls and implement business logic.

- **[NEW] `auth.service.ts`**: Handle login, signup, password reset, and session management.
- **[NEW] `user.service.ts`**: Manage user profiles, roles, and permissions.
- **[NEW] `company.service.ts`**: Manage company details, onboarding, and settings.
- **[NEW] `crm.service.ts`**: CRUD operations for Customers and Deals.

### 2. State Management (.app/store)

Use Zustand for lightweight global state management (optional but recommended for complex UI state).

- **[NEW] `use-user-store.ts`**: Store current user, role, and permissions (sync with UserContext).
- **[NEW] `use-ui-store.ts`**: Manage sidebar open/close, active module, etc.

### 3. API Routes (.app/app/api)

Secure server-side endpoints for sensitive operations (e.g., inviting users, deleting records).

- **[NEW] `api/auth/invite/route.ts`**: Admin-only route to invite new users via Supabase Admin API.
- **[NEW] `api/company/onboarding/route.ts`**: Handle new company registration and setup.

## Verification Plan

### Automated Tests

- Unit tests for Services (mocking Supabase client).
- Integration tests for API routes.

### Manual Verification

- Test `auth.service.ts` by logging in/out via the UI.
- Test `api/auth/invite` using Postman or a temporary UI button (simulating an Admin).
