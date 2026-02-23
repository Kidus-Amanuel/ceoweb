# Enterprise Resource Planning (ERP) System Architecture Guide

## 1. Core Architecture: Multi-Tenancy & Security

### Multi-Tenant Strategy

This system uses a **Row-Level Security (RLS)** based multi-tenancy approach.

- **Single Database, Shared Schema**: All tenants (companies) share the same tables.
- **Tenant Isolation**: Every table has a `company_id` column.
- **RLS Enforcement**: PostgreSQL Row Level Security policies automatically filter query results so users _only_ see data for their `company_id`.

**Why this approach?**

- **Scalability**: Easier to manage migrations and backups compared to "schema-per-tenant".
- **Performance**: PostgreSQL creates efficient plans for indexed `company_id` queries.
- **Simplicity**: Application code (Next.js) doesn't need complex connection switching logic.

### User & Authentication

- **Supabase Auth**: Handles identity (users, passwords, JWTs).
- **Public vs. Private**: `auth.users` is managed by Supabase. Our `profiles` table extends this with application-specific data (`company_id`, `role`, `preferences`).
- **One User, One Company** (Strict Mode): A user profile is strictly tied to one `company_id`. Features like "Switch Company" would require a many-to-many `user_companies` table (not implemented in v2.0 for simplicity, but easily upgradeable).

## 2. Dynamic Role-Based Access Control (RBAC)

Instead of hardcoding roles (like "Admin", "Manager"), we use a **Dynamic Permission System**.

- **Roles Table**: Companies define their own roles (e.g., "Junior Sales Rep", "Regional Manager").
- **Permissions JSONB**: Permissions are stored as a JSON object, allowing flexible, granular control without new columns.
  - Example: `{"crm": ["view", "create"], "hr": ["view_own"]}`
- **Checking Permissions**: A PL/pgSQL function `has_permission(module, action)` is used in RLS policies and API endpoints.

## 3. Subscription & Plans System

The `plans` table defines the tiers (Free, Starter, Pro).

- **Limits**: `max_users`, `max_storage_mb`, and `modules` (enabled features) are defined in the plan.
- **Enforcement**:
  - **Database Level**: Policies can check `plans.modules` before allowing inserts to specific tables.
  - **Application Level**: The API checks `plans.max_users` before inviting a new team member.

## 4. Business Modules Overview

### Human Resources (HR)

- **Employees**: Central record, linked to `auth.users` if they have login access.
- **Leaves**: Leave requests with approval status workflow.
- **Attendance**: GPS-tagged check-in/out records.

### Customer Relationship Management (CRM)

- **Customers**: Unifies Companies and Contacts.
- **Deals**: Pipeline management with stages and values.
- **Activities**: Logs all interactions (calls, emails) to build a timeline.

### Inventory & Supply Chain

- **Multi-Warehouse**: Track stock across different physical locations.
- **Stock Movements**: An immutable ledger of every stock change (Receive, Dispatch, Adjust). _Never update quantity directly without a movement record._

### Fleet Management

- **Vehicles**: Track assets, assignments, and status.
- **Maintenance**: Log service history and costs.
- **Drivers**: Assigned from the `employees` table.

### Finance

- **Double-Entry Lite**: Uses `journal_entries` and `journal_lines` for accounting integrity.
- **Chart of Accounts**: Customizable per company for financial reporting.

## 5. Extensibility: Custom Fields

Every major entity (`employees`, `customers`, `products`, etc.) has a `custom_fields` **JSONB** column.

- **Purpose**: Allows tenants to track data specific to their business without altering the database schema.
- **Example**: A logistics company might add `{"license_class": "CDL-A"}` to employees, while a tech company adds `{"github_username": "dev123"}`.
- **Searchable**: PostgreSQL's JSONB indexes allow high-performance searching on these dynamic fields.

## 6. Audit Logging

A trigger-based system (`audit_trigger`) automatically records changes to critical tables (`audit_logs`).

- **What is logged**: Who (User ID), When, What Table, What Record, and the **Data Change** (Diff of Old vs New values).
- **Compliance**: Essential for enterprise clients requiring change tracking.

---

## 7. Migration Guide

To deploy this schema:

1. Run `advanced_erp_schema_v2.sql` in your Supabase SQL Editor.
2. Enable Realtime triggers if you need live updates (e.g. for the Chat module).
3. Update your `types_db.ts` (if using TypeScript) to reflect the new schema.
