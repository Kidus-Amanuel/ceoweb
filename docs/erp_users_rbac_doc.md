ERP Core Architecture Documentation

Multi-Tenant Role-Based Access Control System (RBAC)

---

1. System Overview

This ERP system is designed as a multi-tenant platform with strict company-level data isolation and role-based access control.

Key Principles:

- SuperAdmin manages companies at platform level.
- Company Users belong to exactly one company.
- Permissions are role-based.
- Roles are company-specific.
- Frontend controls UI visibility.
- Backend enforces security.

---

2. User Types

2.1 Super Admin

Platform-level administrator.

Capabilities:

- Create and manage companies
- View/manage all companies (based on scope)
- Configure system-level settings

Characteristics:

- Not restricted to one company
- Does not use company roles
- Does not use company permissions

  2.2 Company User

Regular ERP user associated with one company.

Characteristics:

- Belongs to exactly one company
- Has one role within that company
- Permissions are defined by role
- Access restricted to that company’s data

---

3. Database Architecture

3.1 Users Table

Stores global identity information.

## users

id (uuid, primary key)
name (varchar, not null)
email (varchar, unique, not null)
password_hash (varchar, not null)
user_type (enum: 'super_admin', 'company_user')
is_active (boolean, default true)
created_at (timestamp)
updated_at (timestamp)

Purpose:

- Stores authentication and identity
- Does NOT store company or role information

  3.2 Companies Table

## companies

id (uuid, primary key)
name (varchar, not null)
owner_id (uuid, foreign key → users.id)
is_active (boolean, default true)
created_at (timestamp)
updated_at (timestamp)

3.3 Company Users Table

## company_users

id (uuid, primary key)
user_id (uuid, foreign key → users.id)
company_id (uuid, foreign key → companies.id)
role_id (uuid, foreign key → roles.id)
position (varchar)
status (enum: 'active', 'suspended')
joined_at (timestamp)

Purpose:

- Associates user with company
- Assigns role within company
- Enables future scalability

  3.4 Roles Table

## roles

id (uuid, primary key)
company_id (uuid, foreign key → companies.id)
name (varchar, not null)
description (text)
created_at (timestamp)

3.5 Role Permissions Table

## role_permissions

id (uuid, primary key)
role_id (uuid, foreign key → roles.id)
module (varchar)
action (varchar)

3.6 Modules Table (Optional)

## modules

id (uuid, primary key)
name (varchar)
is_active (boolean)

---

4. Authentication & Token Design

4.1 Super Admin Token Structure

{
"sub": "user_1",
"name": "System Admin",
"email": "admin@erp.com",
"userType": "super_admin",
"companyScope": "limited",
"companyIds": ["comp_1023", "comp_8891"],
"sid": "session_99321",
"ver": 1,
"iat": 1710000000,
"exp": 1710086400
}

4.2 Company User Token Structure

{
"sub": "user_872364",
"name": "Kidus Abebe",
"email": "kidus@email.com",
"userType": "company_user",
"companyId": "comp_1023",
"roleId": "role_5",
"sid": "session_99821",
"ver": 1,
"iat": 1710000000,
"exp": 1710086400
}

---

5. Authorization Flow

Login Process:

1. Validate email & password
2. Check user_type
3. If company_user:
   - Retrieve company_users record
   - Get role_id
4. Generate JWT with appropriate fields
5. Return access token

Permission Loading (Frontend):

1. Decode token
2. If company_user:
   - Fetch role permissions: GET /api/roles/{roleId}/permissions
3. Store permissions in state manager
4. Dynamically render UI based on permissions

---

6. Permission Enforcement

Frontend:

- Show/hide buttons
- Show/hide modules
- Enable/disable actions

Backend:

- Validate token
- Validate company ownership
- Validate role permissions
- Reject unauthorized actions

---

7. Data Isolation Rules

- Every company_user request must include companyId
- Backend verifies:
  - user belongs to company
  - role permits action
- SuperAdmin bypasses company restriction (based on scope)

---

8. Scalability Considerations

- Supports thousands of companies
- Supports thousands of employees per company
- Custom roles per company
- Module expansion
- Future multi-company support if required

---

9. Architecture Summary

- Multi-tenant structure
- Role-Based Access Control (RBAC)
- Clean separation of identity and authorization
- Token-based authentication
- Company-level isolation
- Scalable relational design
