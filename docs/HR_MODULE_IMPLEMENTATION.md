# 👥 Human Resources (HR) Module Implementation Plan

## 📌 Overview

The HR Module is a core component of the ERP system, designed to manage the full employee lifecycle, organizational structure, and HR operations. It centralizes all workforce data, automates repetitive workflows (leave, attendance, payroll), and provides actionable insights through reporting.

---

## 🏗️ Technology Stack

- **Frontend**: Next.js (App Router), TailwindCSS, Lucide Icons.
- **Components**: `EditableTable` (for unified CRUD operations).
- **Backend**: Supabase (PostgreSQL, Auth, Storage).
- **Permissions**: Role-Based Access Control (RBAC) via Supabase Row-Level Security (RLS).

---

## 📊 Database Schema (Core Tables)

Refer to `SCHEMA_MAP.md` for the full map.

### Organizational Structure

- `departments`: Manages the company hierarchy.
- `positions`: Job titles, roles, and requirements within departments.

### Employee Management

- `employees`: Core worker records, basic salary, hire dates, and status.
- `employee_documents`: Storage for contracts, IDs, and certifications.

### Operations

- `attendance`: Daily check-in/check-out logs and hour calculation.
- `leaves`: Vacation, sick leave, and unpaid leave tracking.
- `leave_types`: Configurable categories (Annual, Sick, etc.).
- `performance_reviews`: Scheduled evaluations, ratings, and goals.

### Financials

- `payroll_runs`: Salary batches for specific periods.
- `payslips`: Individual salary breakdowns and net pay.

---

## 📅 Phased Implementation

### Phase 1: Foundations (Employee & Org Management)

- **API Setup**: Implement Next.js routes for `/api/hr/employees`, `/api/hr/departments`, and `/api/hr/positions`.
- **Org Structure Pages**: Dedicated pages for Departments and Positions using `EditableTable`.
- **Employee Directory**: Transitions the mock data page to a live table linked to the database.
- **Profile Linking**: UI to link existing Auth users (`profiles`) to their `employees` record.

### Phase 2: Attendance & Leave Tracking

- **Real-Time Clocking**: Create a clock-in/out widget for the HR dashboard.
- **Attendance Log**: An administrative `EditableTable` for reviewing and correcting logs.
- **Leave Submission**: A workflow for employees to request leaves with manager approval notifications.
- **Balance Calculation**: Logic to deduct taken days from `leave_types.days_per_year`.

### Phase 3: Financials (Payroll & Payroll Runs)

- **Salary Definition**: Management of `basic_salary` and recurring allowances/deductions.
- **Payroll Batching**: Create a `payroll_run` for a month/period.
- **Payslip Generation**: Automatic generation of `payslips` based on attendance and leave status.

### Phase 4: Performance & Documents

- **Feedback System**: Implementation of the `performance_reviews` table UI.
- **Document Management**: Integration with Supabase Storage for secure file uploads within the `EditableTable`.

### Phase 5: Dashboard & Analytics

- **HR Overview**: Key metrics (Total Headcount, Attendance Rate, On-Leave status).
- **Reporting**: Exportable CSV/Excel reports for payroll and attendance.

---

## 🔐 Security & RBAC

- **Employee Level**: Can view their own profile, attendance, and leave status.
- **Manager Level**: Can approve leaves and view department attendance.
- **HR Admin**: Full access to salary data, payroll, and organizational settings.
- **Super Admin**: Bypass all checks via RLS `super_admin` type.

---

## 🎨 UI/UX Philosophy

- **Unified Interface**: Use the `EditableTable` for _every_ data-heavy list to minimize learning curves.
- **Micro-Animations**: Smooth transitions and hover states for a premium feel.
- **Responsive Design**: Mobile-friendly attendance clocking and directory access.
- **No Placeholders**: Every field must be functional or linked to a real data point.
