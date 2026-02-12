# ERP System Mock Data

This document contains detailed mock data for ERP system including modules, users, companies, roles, company users, and role permissions.

---

## 1. Modules

```json
[
  { "id": "mod_1", "name": "CRM", "is_active": true },
  { "id": "mod_2", "name": "HR", "is_active": true },
  { "id": "mod_3", "name": "Fleet", "is_active": true },
  { "id": "mod_4", "name": "Inventory", "is_active": true },
  { "id": "mod_5", "name": "Finance", "is_active": true }
]
```

---

## 2. Users

```json
[
  {
    "id": "user_1",
    "name": "System Admin",
    "email": "admin@erp.com",
    "user_type": "super_admin",
    "is_active": true
  },
  {
    "id": "user_2",
    "name": "Kidus Abebe",
    "email": "kidus@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_3",
    "name": "Sara Bekele",
    "email": "sara@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_4",
    "name": "Mohammed Ali",
    "email": "mohammed@xyz.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_5",
    "name": "Hana Tesfaye",
    "email": "hana@xyz.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_6",
    "name": "Daniel Hailu",
    "email": "daniel@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_7",
    "name": "Selamawit Fikru",
    "email": "selamawit@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_8",
    "name": "Bekele Tesfaye",
    "email": "bekele@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_9",
    "name": "Almaz Getachew",
    "email": "almaz@abc.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_10",
    "name": "Tadesse Yohannes",
    "email": "tadesse@xyz.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_11",
    "name": "Meron Ayele",
    "email": "meron@xyz.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_12",
    "name": "Abebe Alemu",
    "email": "abebe@xyz.com",
    "user_type": "company_user",
    "is_active": true
  },
  {
    "id": "user_13",
    "name": "Hana Bekele",
    "email": "hana2@xyz.com",
    "user_type": "company_user",
    "is_active": true
  }
]
```

---

## 3. Companies

```json
[
  {
    "id": "comp_1023",
    "name": "ABC PLC",
    "owner_id": "user_2",
    "is_active": true
  },
  {
    "id": "comp_8891",
    "name": "XYZ Trading",
    "owner_id": "user_4",
    "is_active": true
  }
]
```

---

## 4. Roles

```json
[
  {
    "id": "role_1",
    "company_id": "comp_1023",
    "name": "General Manager",
    "description": "Manages overall company operations"
  },
  {
    "id": "role_2",
    "company_id": "comp_1023",
    "name": "HR Manager",
    "description": "Manages HR department"
  },
  {
    "id": "role_3",
    "company_id": "comp_1023",
    "name": "CRM Manager",
    "description": "Manages CRM module"
  },
  {
    "id": "role_6",
    "company_id": "comp_1023",
    "name": "HR Supervisor",
    "description": "HR team supervisor"
  },
  {
    "id": "role_7",
    "company_id": "comp_1023",
    "name": "Driver",
    "description": "Fleet operations"
  },
  {
    "id": "role_8",
    "company_id": "comp_1023",
    "name": "Sales Executive",
    "description": "CRM sales team"
  },
  {
    "id": "role_4",
    "company_id": "comp_8891",
    "name": "General Manager",
    "description": "Manages overall company operations"
  },
  {
    "id": "role_5",
    "company_id": "comp_8891",
    "name": "HR Manager",
    "description": "HR team"
  },
  {
    "id": "role_9",
    "company_id": "comp_8891",
    "name": "Fleet Manager",
    "description": "Fleet management"
  },
  {
    "id": "role_10",
    "company_id": "comp_8891",
    "name": "HR Supervisor",
    "description": "HR support"
  },
  {
    "id": "role_11",
    "company_id": "comp_8891",
    "name": "Driver",
    "description": "Fleet operations"
  },
  {
    "id": "role_12",
    "company_id": "comp_8891",
    "name": "Sales Executive",
    "description": "CRM sales team"
  }
]
```

---

## 5. Company Users

```json
[
  {
    "id": "cu_1",
    "user_id": "user_2",
    "company_id": "comp_1023",
    "role_id": "role_1",
    "position": "Owner",
    "status": "active",
    "joined_at": "2025-01-01T08:00:00Z"
  },
  {
    "id": "cu_2",
    "user_id": "user_3",
    "company_id": "comp_1023",
    "role_id": "role_2",
    "position": "HR Manager",
    "status": "active",
    "joined_at": "2025-02-01T08:00:00Z"
  },
  {
    "id": "cu_5",
    "user_id": "user_6",
    "company_id": "comp_1023",
    "role_id": "role_3",
    "position": "CRM Manager",
    "status": "active",
    "joined_at": "2025-02-10T08:00:00Z"
  },
  {
    "id": "cu_6",
    "user_id": "user_7",
    "company_id": "comp_1023",
    "role_id": "role_6",
    "position": "HR Supervisor",
    "status": "active",
    "joined_at": "2025-02-15T08:00:00Z"
  },
  {
    "id": "cu_7",
    "user_id": "user_8",
    "company_id": "comp_1023",
    "role_id": "role_7",
    "position": "Driver",
    "status": "active",
    "joined_at": "2025-03-01T08:00:00Z"
  },
  {
    "id": "cu_8",
    "user_id": "user_9",
    "company_id": "comp_1023",
    "role_id": "role_8",
    "position": "Sales Executive",
    "status": "active",
    "joined_at": "2025-03-05T08:00:00Z"
  },
  {
    "id": "cu_3",
    "user_id": "user_4",
    "company_id": "comp_8891",
    "role_id": "role_4",
    "position": "Owner",
    "status": "active",
    "joined_at": "2025-03-01T08:00:00Z"
  },
  {
    "id": "cu_4",
    "user_id": "user_5",
    "company_id": "comp_8891",
    "role_id": "role_5",
    "position": "HR Manager",
    "status": "active",
    "joined_at": "2025-03-05T08:00:00Z"
  },
  {
    "id": "cu_9",
    "user_id": "user_10",
    "company_id": "comp_8891",
    "role_id": "role_9",
    "position": "Fleet Manager",
    "status": "active",
    "joined_at": "2025-03-10T08:00:00Z"
  },
  {
    "id": "cu_10",
    "user_id": "user_11",
    "company_id": "comp_8891",
    "role_id": "role_10",
    "position": "HR Supervisor",
    "status": "active",
    "joined_at": "2025-03-15T08:00:00Z"
  },
  {
    "id": "cu_11",
    "user_id": "user_12",
    "company_id": "comp_8891",
    "role_id": "role_11",
    "position": "Driver",
    "status": "active",
    "joined_at": "2025-03-20T08:00:00Z"
  },
  {
    "id": "cu_12",
    "user_id": "user_13",
    "company_id": "comp_8891",
    "role_id": "role_12",
    "position": "Sales Executive",
    "status": "active",
    "joined_at": "2025-03-25T08:00:00Z"
  }
]
```

---

## 6. Role Permissions (Sample)

```json
[
  { "role_id": "role_1", "module": "CRM", "action": "view" },
  { "role_id": "role_1", "module": "CRM", "action": "edit" },
  { "role_id": "role_1", "module": "HR", "action": "view" },
  { "role_id": "role_1", "module": "HR", "action": "edit" },
  { "role_id": "role_1", "module": "Fleet", "action": "view" },
  { "role_id": "role_1", "module": "Fleet", "action": "edit" },
  { "role_id": "role_2", "module": "HR", "action": "view" },
  { "role_id": "role_2", "module": "HR", "action": "edit" },
  { "role_id": "role_3", "module": "CRM", "action": "view" },
  { "role_id": "role_3", "module": "CRM", "action": "edit" },
  { "role_id": "role_6", "module": "HR", "action": "view" },
  { "role_id": "role_7", "module": "Fleet", "action": "view" },
  { "role_id": "role_8", "module": "CRM", "action": "view" },
  { "role_id": "role_8", "module": "CRM", "action": "create" }
]
```

---

## 7. SuperAdmin Company Access

```json
{
  "sub": "user_1",
```
