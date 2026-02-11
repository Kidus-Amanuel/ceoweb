# Role-Based Access Control (RBAC) Matrix

## 🎭 Role Hierarchy

```
Super Admin (Platform Owner)
    │
    ├── Company Admin (Company Owner)
    │       │
    │       ├── Manager (Department/Module Manager)
    │       │       │
    │       │       └── Employee (Standard User)
    │       │
    │       └── Employee (Standard User)
    │
    └── (Can manage multiple companies)
```

---

## 👤 Role Definitions

### 1. **Super Admin**

- **Who**: Platform owner, SaaS provider
- **Scope**: All companies/tenants
- **Access**: Full system access
- **Typical Use Case**: Multi-tenant SaaS platform management

### 2. **Company Admin**

- **Who**: Company owner, CEO, Business owner
- **Scope**: Single company
- **Access**: Full company access
- **Typical Use Case**: Manages entire business operations

### 3. **Manager**

- **Who**: Department heads, Module managers
- **Scope**: Assigned modules within company
- **Access**: Limited admin rights
- **Typical Use Case**: Sales Manager, Fleet Manager, HR Manager

### 4. **Employee (Department-Specific)**

- **Who**: Department staff
- **Scope**: Specific module access
- **Access**: Read + limited write
- **Sub-roles**:
  - **CRM Employee**: Sales reps, account managers
  - **Fleet Employee**: Drivers, dispatchers
  - **Inventory Employee**: Warehouse staff
  - **HR Employee**: HR assistants

### 5. **Employee (Standard)**

- **Who**: General staff
- **Scope**: Basic app access
- **Access**: Profile, chat, assigned tasks
- **Typical Use Case**: Any employee with minimal needs

---

## 📊 Permission Matrix

### Legend

- ✅ **Full Access**: Create, Read, Update, Delete
- 👁️ **Read Only**: View only, no modifications
- 📝 **Limited Edit**: Can edit own data only
- ❌ **No Access**: Cannot access
- 🔒 **Conditional**: Based on assignment/ownership

---

## 🏢 Module Permissions

### **Dashboard Module**

| Feature              | Super Admin | Company Admin | Manager     | Employee (CRM) | Employee (Fleet) | Employee (Standard) |
| -------------------- | ----------- | ------------- | ----------- | -------------- | ---------------- | ------------------- |
| View dashboard       | ✅          | ✅            | ✅          | ✅             | ✅               | ✅                  |
| Customize widgets    | ✅          | ✅            | 🔒 Own only | ❌             | ❌               | ❌                  |
| Company-wide metrics | ✅          | ✅            | 👁️          | ❌             | ❌               | ❌                  |
| Personal metrics     | ✅          | ✅            | ✅          | ✅             | ✅               | ✅                  |

---

### **CRM Module**

| Feature              | Super Admin | Company Admin | Manager (CRM) | Employee (CRM)   | Employee (Other) |
| -------------------- | ----------- | ------------- | ------------- | ---------------- | ---------------- |
| **Customers**        |             |               |               |                  |                  |
| View all customers   | ✅          | ✅            | ✅            | 👁️               | ❌               |
| Create customer      | ✅          | ✅            | ✅            | ✅               | ❌               |
| Edit any customer    | ✅          | ✅            | ✅            | 🔒 Assigned only | ❌               |
| Delete customer      | ✅          | ✅            | ✅            | ❌               | ❌               |
| Export customers     | ✅          | ✅            | ✅            | 👁️ Own only      | ❌               |
| **Deals**            |             |               |               |                  |                  |
| View all deals       | ✅          | ✅            | ✅            | 👁️               | ❌               |
| Create deal          | ✅          | ✅            | ✅            | ✅               | ❌               |
| Edit any deal        | ✅          | ✅            | ✅            | 🔒 Own deals     | ❌               |
| Delete deal          | ✅          | ✅            | ✅            | ❌               | ❌               |
| Reassign deal        | ✅          | ✅            | ✅            | ❌               | ❌               |
| **Activities**       |             |               |               |                  |                  |
| View all activities  | ✅          | ✅            | ✅            | 👁️ Related only  | ❌               |
| Create activity      | ✅          | ✅            | ✅            | ✅               | ❌               |
| Edit/delete activity | ✅          | ✅            | ✅            | 🔒 Own only      | ❌               |
| **Reports**          |             |               |               |                  |                  |
| View CRM reports     | ✅          | ✅            | ✅            | 👁️ Own data      | ❌               |
| Export reports       | ✅          | ✅            | ✅            | 👁️ Own data      | ❌               |

---

### **Fleet Module**

| Feature                | Super Admin | Company Admin | Manager (Fleet) | Employee (Fleet/Driver) | Employee (Other) |
| ---------------------- | ----------- | ------------- | --------------- | ----------------------- | ---------------- |
| **Vehicles**           |             |               |                 |                         |                  |
| View all vehicles      | ✅          | ✅            | ✅              | 👁️ Assigned only        | ❌               |
| Add vehicle            | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Edit vehicle           | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Delete vehicle         | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Track vehicle (GPS)    | ✅          | ✅            | ✅              | 🔒 Assigned only        | ❌               |
| **Drivers**            |             |               |                 |                         |                  |
| View all drivers       | ✅          | ✅            | ✅              | 👁️                      | ❌               |
| Add driver             | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Edit driver            | ✅          | ✅            | ✅              | 📝 Own profile          | ❌               |
| Delete driver          | ✅          | ✅            | ✅              | ❌                      | ❌               |
| **Shipments**          |             |               |                 |                         |                  |
| View all shipments     | ✅          | ✅            | ✅              | 👁️ Assigned only        | ❌               |
| Create shipment        | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Update shipment status | ✅          | ✅            | ✅              | 🔒 Assigned only        | ❌               |
| Delete shipment        | ✅          | ✅            | ✅              | ❌                      | ❌               |
| **Maintenance**        |             |               |                 |                         |                  |
| View maintenance       | ✅          | ✅            | ✅              | 👁️ Assigned vehicle     | ❌               |
| Schedule maintenance   | ✅          | ✅            | ✅              | ❌                      | ❌               |
| Update maintenance     | ✅          | ✅            | ✅              | 📝 Can report issues    | ❌               |

---

### **Inventory Module**

| Feature             | Super Admin | Company Admin | Manager (Inventory) | Employee (Inventory) | Employee (Other) |
| ------------------- | ----------- | ------------- | ------------------- | -------------------- | ---------------- |
| **Products**        |             |               |                     |                      |                  |
| View all products   | ✅          | ✅            | ✅                  | ✅                   | 👁️               |
| Add product         | ✅          | ✅            | ✅                  | 🔒 With approval     | ❌               |
| Edit product        | ✅          | ✅            | ✅                  | 🔒 Stock updates     | ❌               |
| Delete product      | ✅          | ✅            | ✅                  | ❌                   | ❌               |
| **Warehouses**      |             |               |                     |                      |                  |
| View warehouses     | ✅          | ✅            | ✅                  | 👁️ Assigned only     | ❌               |
| Add warehouse       | ✅          | ✅            | ✅                  | ❌                   | ❌               |
| Edit warehouse      | ✅          | ✅            | ✅                  | ❌                   | ❌               |
| **Purchase Orders** |             |               |                     |                      |                  |
| View POs            | ✅          | ✅            | ✅                  | 👁️                   | ❌               |
| Create PO           | ✅          | ✅            | ✅                  | 🔒 With approval     | ❌               |
| Approve PO          | ✅          | ✅            | ✅                  | ❌                   | ❌               |
| Receive PO          | ✅          | ✅            | ✅                  | ✅                   | ❌               |
| **Vendors**         |             |               |                     |                      |                  |
| View vendors        | ✅          | ✅            | ✅                  | 👁️                   | ❌               |
| Add/edit vendor     | ✅          | ✅            | ✅                  | ❌                   | ❌               |

---

### **HR Module**

| Feature               | Super Admin | Company Admin | Manager (HR) | Employee (HR)      | Employee (Other)  |
| --------------------- | ----------- | ------------- | ------------ | ------------------ | ----------------- |
| **Employees**         |             |               |              |                    |                   |
| View all employees    | ✅          | ✅            | ✅           | ✅                 | 👁️ Directory only |
| View employee details | ✅          | ✅            | ✅           | 🔒 Limited info    | 📝 Own only       |
| Add employee          | ✅          | ✅            | ✅           | ✅                 | ❌                |
| Edit employee         | ✅          | ✅            | ✅           | 🔒 Basic info      | 📝 Own only       |
| Delete employee       | ✅          | ✅            | ✅           | ❌                 | ❌                |
| View salary info      | ✅          | ✅            | ✅           | 🔒 With permission | 📝 Own only       |
| **Attendance**        |             |               |              |                    |                   |
| View all attendance   | ✅          | ✅            | ✅           | ✅                 | 👁️ Own only       |
| Clock in/out          | ✅          | ✅            | ✅           | ✅                 | ✅                |
| Edit attendance       | ✅          | ✅            | ✅           | 🔒 With reason     | ❌                |
| **Leave Management**  |             |               |              |                    |                   |
| View all leave        | ✅          | ✅            | ✅           | ✅                 | 👁️ Own only       |
| Request leave         | ✅          | ✅            | ✅           | ✅                 | ✅                |
| Approve leave         | ✅          | ✅            | ✅           | 🔒 Team only       | ❌                |
| Cancel leave          | ✅          | ✅            | ✅           | 🔒 Pending only    | 🔒 Own pending    |
| **Payroll**           |             |               |              |                    |                   |
| View all payroll      | ✅          | ✅            | ✅           | ❌                 | ❌                |
| Run payroll           | ✅          | ✅            | ✅           | ❌                 | ❌                |
| View own payslip      | ✅          | ✅            | ✅           | ✅                 | ✅                |
| **Performance**       |             |               |              |                    |                   |
| View all reviews      | ✅          | ✅            | ✅           | 👁️                 | 👁️ Own only       |
| Create review         | ✅          | ✅            | ✅           | 🔒 Team only       | ❌                |
| Submit self-review    | ✅          | ✅            | ✅           | ✅                 | ✅                |

---

### **Chat Module** (Same for All Employees)

| Feature                | Super Admin | Company Admin | Manager         | Employee        | Notes                      |
| ---------------------- | ----------- | ------------- | --------------- | --------------- | -------------------------- |
| Access chat            | ✅          | ✅            | ✅              | ✅              | Universal access           |
| Create channel         | ✅          | ✅            | ✅              | 🔒 Public only  | Can create public channels |
| Create private channel | ✅          | ✅            | ✅              | ✅              | Can invite members         |
| Send messages          | ✅          | ✅            | ✅              | ✅              | Universal                  |
| Delete own messages    | ✅          | ✅            | ✅              | ✅              | Universal                  |
| Delete any message     | ✅          | ✅            | 🔒 Own channels | ❌              | Moderator role             |
| Manage members         | ✅          | ✅            | 🔒 Own channels | 🔒 Own channels | Channel owner              |
| File sharing           | ✅          | ✅            | ✅              | ✅              | Universal                  |

---

### **AI Agent Module**

| Feature                    | Super Admin | Company Admin | Manager | Employee | Notes            |
| -------------------------- | ----------- | ------------- | ------- | -------- | ---------------- |
| Access AI Agent            | ✅          | ✅            | ✅      | ✅       | Universal access |
| Start conversation         | ✅          | ✅            | ✅      | ✅       | Universal        |
| View own conversations     | ✅          | ✅            | ✅      | ✅       | Universal        |
| View others' conversations | ✅          | ✅            | ❌      | ❌       | Admin only       |
| Share conversation         | ✅          | ✅            | ✅      | ✅       | Universal        |
| Export conversation        | ✅          | ✅            | ✅      | ✅       | Universal        |

---

### **Settings Module**

| Feature               | Super Admin | Company Admin | Manager       | Employee (Any) |
| --------------------- | ----------- | ------------- | ------------- | -------------- |
| **Profile Settings**  |             |               |               |                |
| Edit own profile      | ✅          | ✅            | ✅            | ✅             |
| Change password       | ✅          | ✅            | ✅            | ✅             |
| Upload avatar         | ✅          | ✅            | ✅            | ✅             |
| **Account Settings**  |             |               |               |                |
| Email preferences     | ✅          | ✅            | ✅            | ✅             |
| Notification settings | ✅          | ✅            | ✅            | ✅             |
| Two-factor auth (2FA) | ✅          | ✅            | ✅            | ✅             |
| **Company Settings**  |             |               |               |                |
| Edit company info     | ✅          | ✅            | ❌            | ❌             |
| Upload company logo   | ✅          | ✅            | ❌            | ❌             |
| Change branding       | ✅          | ✅            | ❌            | ❌             |
| **User Management**   |             |               |               |                |
| View team             | ✅          | ✅            | 👁️ Department | 👁️ Directory   |
| Invite users          | ✅          | ✅            | 🔒 Limited    | ❌             |
| Edit user roles       | ✅          | ✅            | ❌            | ❌             |
| Deactivate users      | ✅          | ✅            | ❌            | ❌             |
| **Role Management**   |             |               |               |                |
| View roles            | ✅          | ✅            | 👁️            | ❌             |
| Create/edit roles     | ✅          | ✅            | ❌            | ❌             |
| Assign permissions    | ✅          | ✅            | ❌            | ❌             |
| **Billing**           |             |               |               |                |
| View billing          | ✅          | ✅            | ❌            | ❌             |
| Update payment method | ✅          | ✅            | ❌            | ❌             |
| View invoices         | ✅          | ✅            | ❌            | ❌             |
| Cancel subscription   | ✅          | ✅            | ❌            | ❌             |

---

### **Super Admin Panel** (admin/)

| Feature            | Super Admin | Others |
| ------------------ | ----------- | ------ |
| Access admin panel | ✅          | ❌     |
| View all tenants   | ✅          | ❌     |
| Create tenant      | ✅          | ❌     |
| Edit tenant        | ✅          | ❌     |
| Suspend tenant     | ✅          | ❌     |
| Impersonate user   | ✅          | ❌     |
| Platform analytics | ✅          | ❌     |
| System settings    | ✅          | ❌     |

---

## 🔐 Permission Implementation

### Database Schema (Supabase)

```sql
-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  level INTEGER NOT NULL, -- Hierarchy level (1=Super Admin, 2=Company Admin, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource TEXT NOT NULL, -- e.g., 'crm.customers'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Role permissions (many-to-many)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- User roles
ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
```

### Permission Checking Hook

```typescript
// composables/auth/usePermissions.ts
import { useAuth } from "./useAuth";
import { Permission } from "@/types";

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    // Super admin has all permissions
    if (user.role === "super_admin") return true;

    // Check user's role permissions
    return user.permissions.some(
      (p: Permission) => p.resource === resource && p.action === action,
    );
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.role);
  };

  return { hasPermission, hasRole, hasAnyRole };
}
```

### Usage in Components

```typescript
import { usePermissions } from '@/composables/auth/usePermissions';

export default function CustomerList() {
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('crm.customers', 'create');
  const canDelete = hasPermission('crm.customers', 'delete');

  return (
    <div>
      {canCreate && <Button>Add Customer</Button>}
      {canDelete && <Button variant="destructive">Delete</Button>}
    </div>
  );
}
```

---

## 🎯 Implementation Checklist

- [ ] Define roles in database
- [ ] Define permissions in database
- [ ] Assign permissions to roles
- [ ] Create `usePermissions` hook
- [ ] Create `WithPermission` component
- [ ] Implement middleware permission checks
- [ ] Create role-based sidebars
- [ ] Add permission checks to all pages
- [ ] Add RLS policies in Supabase
- [ ] Test all permission scenarios

---

**Last Updated:** 2026-02-11  
**Version:** 1.0 - Complete RBAC Matrix
