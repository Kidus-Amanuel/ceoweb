# ERP System Modules and Submodules

## Complete List of Modules and Their Submodules

### 1. CRM (Customer Relationship Management)

- **Customers**: Manage customer records, contact information, and communication history
- **Deals**: Track sales opportunities, stages, and probabilities
- **Activities**: Schedule and manage tasks, meetings, calls, and notes
- **Overviews**: Dashboard and analytics for CRM performance

### 2. HR (Human Resources)

- **Employees**: Manage employee profiles, contact information, and employment details
- **Departments**: Organize employees into departments and teams
- **Leave Requests**: Track employee leave applications and approvals
- **Attendance**: Monitor employee attendance and time tracking
- **Payroll**: Manage salary calculations, deductions, and payments
- **Performance**: Track employee performance reviews and feedback

### 3. Fleet

- **Vehicles**: Manage vehicle details, maintenance records, and GPS tracking
- **Drivers**: Maintain driver information and license details
- **Maintenance**: Schedule and track vehicle maintenance and repairs

### 4. Inventory

- **Products**: Manage product catalog, categories, and stock levels
- **Warehouses**: Track warehouse locations and capacity
- **Inventory Movements**: Monitor stock transfers and movements between locations
- **Suppliers**: Manage supplier information and relationships
- **Vendors**: Track vendor details and purchase history
- **Purchase Orders**: Create and manage purchase orders
- **Stock**: Real-time inventory status and stock level tracking

### 5. Finance

- **Invoices**: Create, send, and track customer invoices
- **Expenses**: Track and categorize business expenses
- **Payments**: Record and manage customer payments

### 6. International Trade

- **Shipments**: Manage international shipment details and tracking
- **Containers**: Track container information and logistics
- **Ports**: Manage port details and operations
- **Vessels**: Maintain vessel information and schedules
- **Clearance**: Track customs clearance processes and documentation

## Custom Fields Support

Each module and submodule supports custom fields that can be defined and configured through the company settings. Custom fields are dynamically included in:

- Data fetching (read_module_data)
- Table rendering
- AI responses
- User interfaces

## Dynamic Column Handling

The read_module_data tool automatically:

1. Fetches custom column definitions from company settings
2. Extracts custom field values from the custom_fields JSON column
3. Adds custom columns to the display columns list
4. Handles custom fields with proper formatting in responses

This ensures that the AI responses always include all relevant columns, both built-in and custom, providing a complete view of the data.
