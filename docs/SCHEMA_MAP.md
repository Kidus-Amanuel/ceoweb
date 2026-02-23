# ERP Database Schema Map

This document provides a high-level overview of the database tables grouped by their respective modules.

---

## 🏗️ Core Infrastructure

_Fundamental ERP structure, multi-tenancy, and security._

- **`companies`**: Primary tenant table.
- **`profiles`**: User profiles linked to Auth.
- **`roles`**: Customizable roles per company.
- **`role_permissions`**: Module-level permission mapping.
- **`company_users`**: User-to-company assignments.
- **`plans`**: Subscription tiers and limits.
- **`audit_logs`**: Security tracking for all data changes.

---

## 👥 Human Resources (HR)

_Employee management, attendance, and payroll._

- **`employees`**: Detailed worker records and employment history.
- **`departments`**: Organizational hierarchy.
- **`positions`**: Job titles within departments.
- **`attendance`**: Daily check-in/check-out logs.
- **`leaves`**: Vacation and sick leave tracking.
- **`leave_types`**: Configurable leave categories.
- **`payroll_runs`**: Salary processing batches.
- **`payslips`**: Individual pay records and breakdowns.
- **`performance_reviews`**: Employee evaluations and feedback.
- **`employee_documents`**: Links to contracts and certifications.

---

## 📦 Inventory Management

_Products, suppliers, and stock control._

- **`products`**: Unified table for goods and services.
- **`product_categories`**: Hierarchical organization of products.
- **`suppliers`**: Vendor and manufacturer database.
- **`warehouses`**: Storage locations.
- **`stock_levels`**: Real-time quantity snapshots.
- **`stock_movements`**: History of all stock changes.
- **`purchase_orders`**: Procurement requests.
- **`goods_receipts`**: Incoming stock records.

---

## 🚢 International Trade (Import/Export)

_Tracking global product shipments, logistics, and port activities._

- **`shipments`**: Main record for international trade shipments.
- **`shipment_items`**: Line items/products included in a shipment.
- **`containers`**: Tracking individual shipping containers.
- **`container_items`**: Mapping specific products to containers.
- **`customs_clearance`**: Documentation and status of regulatory approval.
- **`ports`**: Arrival and departure locations (sea/air/land).
- **`freight_forwarders`**: Logistics partners and agent details.
- **`vessels`**: Ship or transport vehicle details (names, IMO, etc.).
- **`shipment_events`**: Timeline of milestones (departure, port arrival, clearance).

---

## 🤝 CRM & Sales

_Customer relations and sales pipeline._

- **`customers`**: Client companies and individuals.
- **`customer_contacts`**: Individual people at client companies.
- **`deals`**: Sales opportunities and pipeline stages.
- **`activities`**: Logs of calls, meetings, and notes.
- **`quotes`**: Formal price estimates.
- **`sales_orders`**: Confirmed customer orders.
- **`support_tickets`**: Customer service request management.

---

## 🚛 Fleet Management

_Vehicle tracking and maintenance._

- **`vehicles`**: Details of fleet assets.
- **`vehicle_types`**: Categorization of vehicles.
- **`driver_assignments`**: Driver history for vehicles.
- **`trips`**: Odometer and journey logs.
- **`vehicle_maintenance`**: Service and repair history.
- **`fuel_logs`**: Consumption and cost tracking.
- **`insurance_policies`**: Vehicle insurance coverage.

---

## 📊 Finance & Accounting

_Ledgers, invoicing, and fiscal management._

- **`chart_of_accounts`**: The general ledger structure.
- **`invoices`**: Accounts Receivable (billing customers).
- **`payments`**: Revenue collection records.
- **`bills`**: Accounts Payable (supplier invoices).
- **`expense_claims`**: Internal reimbursement requests.
- **`journal_entries`**: Manual ledger adjustments.
- **`financial_periods`**: Fiscal reporting control.
- **`currencies` & `exchange_rates`**: Multi-currency support.

---

## 📂 Projects & Tasks

_Internal project management._

- **`projects`**: Budgeted initiatives with deadlines.
- **`tasks`**: Granular task assignments.
- **`time_logs`**: Labor hours tracked against tasks.
