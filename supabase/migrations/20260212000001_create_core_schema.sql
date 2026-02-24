-- Set search path to include public and extensions
SELECT set_config('search_path', 'public, extensions', false);

-- =============================================================================
-- PHASE 0: MODULES REFERENCE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS modules (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your supported modules
INSERT INTO modules (name, display_name, description) VALUES
    ('hr', 'Human Resources', 'Employees, leaves, payroll'),
    ('crm', 'Customer Relationship Management', 'Customers, deals, support'),
    ('inventory', 'Inventory Management', 'Products, suppliers, stock'),
    ('fleet', 'Fleet Management', 'Vehicles, maintenance, trips'),
    ('finance', 'Finance', 'Invoices, payments, accounting'),
    ('projects', 'Project Management', 'Projects, tasks, time tracking'),
    ('trade', 'International Trade', 'Shipments, containers, customs, ports')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key to role_permissions (if table already exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_module
            FOREIGN KEY (module) REFERENCES modules(name) ON DELETE RESTRICT;
    END IF;
END $$;

-- =============================================================================
-- ENHANCED MULTI‑TENANT ERP SCHEMA v4.0
-- =============================================================================

-- =============================================================================
-- PHASE 1: EXTENSIONS, ENUMS & CORE TABLES
-- =============================================================================

-- 1.1 Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1.2 Enums (idempotent)
DO $$ BEGIN CREATE TYPE user_type AS ENUM ('super_admin', 'company_user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE company_status AS ENUM ('active', 'suspended', 'trial', 'churned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'terminated', 'on_leave', 'onboarding'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('draft', 'pending_approval', 'approved', 'issued', 'received', 'cancelled', 'fulfilled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'reimbursed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE stock_movement_type AS ENUM ('receive', 'dispatch', 'adjustment', 'return'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE shipment_status AS ENUM ('planned', 'in_transit', 'port_arrival', 'customs_hold', 'released', 'delivered', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE shipment_mode AS ENUM ('sea', 'air', 'land', 'multimodal'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE container_status AS ENUM ('empty', 'loaded', 'sealed', 'opened', 'discharged'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1.3 Plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    max_users INTEGER NOT NULL,
    modules JSONB NOT NULL DEFAULT '["hr", "crm","trade"]',
    price_monthly DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (name, max_users, price_monthly, modules) VALUES
    ('Starter', 5, 29.00, '["hr", "crm","trade"]'),
    ('Business', 20, 99.00, '["hr", "crm", "inventory", "finance","trade"]'),
    ('Enterprise', 1000, 499.00, '["hr", "crm", "inventory", "finance","trade", "fleet", "projects"]')
ON CONFLICT (name) DO UPDATE SET 
    max_users = EXCLUDED.max_users,
    modules = EXCLUDED.modules,
    price_monthly = EXCLUDED.price_monthly;

-- 1.4 Companies
CREATE OR REPLACE FUNCTION get_starter_plan_id() RETURNS UUID AS $$
    SELECT id FROM plans WHERE name = 'Starter' LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL,
    plan_id UUID DEFAULT get_starter_plan_id() REFERENCES plans(id),
    status company_status DEFAULT 'trial',
    settings JSONB DEFAULT '{"currency": "USD", "fiscal_year_start": "01-01"}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan_id) WHERE deleted_at IS NULL;

-- 1.5 Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    user_type user_type DEFAULT 'company_user',
    preferences JSONB DEFAULT '{}',
    onboarding BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE deleted_at IS NULL;

-- 1.6 Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    department TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id) WHERE deleted_at IS NULL;

-- 1.7 Role Permissions (normalized)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module TEXT NOT NULL,      -- 'hr', 'crm', 'inventory', 'fleet', 'finance', 'projects'
    action TEXT NOT NULL,      -- 'view', 'create', 'edit', 'delete', 'approve', 'export'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- Ensure department column exists on roles (for migrations)
DO $$ BEGIN
    ALTER TABLE roles ADD COLUMN IF NOT EXISTS department TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 1.8 Company Users
CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'active',
    position TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role_id);

-- Ensure position column exists on company_users
DO $$ BEGIN
    ALTER TABLE company_users ADD COLUMN IF NOT EXISTS position TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================================================
-- PHASE 2: HELPER FUNCTIONS
-- =============================================================================

-- 2.1 Get current user's company
CREATE OR REPLACE FUNCTION get_current_company_id() RETURNS UUID AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2.2 Get current user type
CREATE OR REPLACE FUNCTION get_current_user_type() RETURNS user_type AS $$
    SELECT user_type FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 2.3 Check permission (super_admin bypass)
CREATE OR REPLACE FUNCTION has_permission(p_module TEXT, p_action TEXT) RETURNS BOOLEAN AS $$
BEGIN
    IF get_current_user_type() = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1
        FROM company_users cu
        JOIN role_permissions rp ON rp.role_id = cu.role_id
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = get_current_company_id()
          AND rp.module = p_module
          AND rp.action = p_action
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2.4 Get User Role Info (RPC for Frontend Context)
CREATE OR REPLACE FUNCTION get_user_role_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', p.id,
        'company_id', p.company_id,
        'company_name', c.name,
        'plan_name', pl.name,
        'plan_modules', COALESCE(pl.modules, '[]'::jsonb),
        'role_id', cu.role_id,
        'role_name', r.name,
        'position', cu.position,
        'status', COALESCE(cu.status, 'active'),
        'user_type', p.user_type,
        'permissions', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('module', rp.module, 'action', rp.action))
                FROM role_permissions rp
                WHERE rp.role_id = cu.role_id
            ),
            '[]'::jsonb
        )
    ) INTO result
    FROM profiles p
    LEFT JOIN companies c ON c.id = p.company_id
    LEFT JOIN plans pl ON pl.id = c.plan_id
    LEFT JOIN company_users cu ON cu.user_id = p.id AND (p.company_id IS NULL OR cu.company_id = p.company_id)
    LEFT JOIN roles r ON r.id = cu.role_id
    WHERE p.id = auth.uid();

    RETURN result;
END;
$$;


-- 2.4 Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PHASE 3: AUDIT LOGGING
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changes JSONB;
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    BEGIN
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            v_company_id = NEW.company_id;
        ELSE
            v_company_id = OLD.company_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_company_id = NULL;
    END;

    v_user_id = auth.uid();

    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        changes = jsonb_build_object('old', old_data);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        changes = jsonb_build_object('old', old_data, 'new', new_data);
    ELSE
        new_data = to_jsonb(NEW);
        changes = jsonb_build_object('new', new_data);
    END IF;

    INSERT INTO audit_logs (company_id, user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_company_id, v_user_id, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, old_data, new_data);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PHASE 4: PLAN ENFORCEMENT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION check_user_limit() RETURNS TRIGGER AS $$
DECLARE
    v_max_users INTEGER;
    v_current_users INTEGER;
BEGIN
    SELECT p.max_users INTO v_max_users
    FROM companies c
    JOIN plans p ON p.id = c.plan_id
    WHERE c.id = NEW.company_id;

    SELECT COUNT(*) INTO v_current_users
    FROM company_users
    WHERE company_id = NEW.company_id AND status = 'active';

    IF v_current_users >= v_max_users THEN
        RAISE EXCEPTION 'User limit (%) exceeded for this company', v_max_users;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_user_limit ON company_users;
CREATE TRIGGER trg_check_user_limit
    BEFORE INSERT ON company_users
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION check_user_limit();

-- =============================================================================
-- PHASE 5: HR MODULE (Complete)
-- =============================================================================

-- 5.1 Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);

-- 5.2 Positions
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    requirements TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, title)
);

CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id) WHERE deleted_at IS NULL;

-- 5.3 Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    employee_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    job_title TEXT,
    hire_date DATE,
    termination_date DATE,
    basic_salary DECIMAL(12,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2),
    status employee_status DEFAULT 'active',
    bank_details JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_custom_fields ON employees USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- 5.4 Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    paid BOOLEAN DEFAULT TRUE,
    days_per_year INTEGER,
    carry_over BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id) WHERE deleted_at IS NULL;

-- 5.5 Leaves
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_taken NUMERIC(5,2) NOT NULL,
    reason TEXT,
    status leave_status DEFAULT 'pending',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_company ON leaves(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date) WHERE deleted_at IS NULL;

-- 5.6 Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    hours_worked NUMERIC(5,2),
    status attendance_status DEFAULT 'present',
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date) WHERE deleted_at IS NULL;

-- 5.7 Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_company ON employee_documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emp_docs_employee ON employee_documents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emp_docs_expiry ON employee_documents(expiry_date) WHERE deleted_at IS NULL;

-- 5.8 Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    review_date DATE NOT NULL,
    period_start DATE,
    period_end DATE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    goals TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_company ON performance_reviews(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON performance_reviews(employee_id) WHERE deleted_at IS NULL;

-- 5.9 Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    processed_date TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    total_cost DECIMAL(15,2),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id) WHERE deleted_at IS NULL;

-- 5.10 Payslips
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    basic_pay DECIMAL(12,2) NOT NULL,
    total_allowances DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL,
    breakdown JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payslips_company ON payslips(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payslips_payroll ON payslips(payroll_run_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- PHASE 6: INVENTORY MODULE (Complete)
-- =============================================================================

-- 6.1 Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_company ON product_categories(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);

-- 6.2 Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email) WHERE deleted_at IS NULL;

-- 6.3 Products (unified)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'physical' CHECK (type IN ('physical', 'service', 'digital')),
    unit TEXT,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_custom_fields ON products USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- 6.4 Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id) WHERE deleted_at IS NULL;

-- 6.5 Stock Levels (snapshot)
CREATE TABLE IF NOT EXISTS stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_company ON stock_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels(warehouse_id);

-- 6.6 Stock Movements (audit)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    quantity_change INTEGER NOT NULL,
    movement_type stock_movement_type NOT NULL,
    reference_type TEXT, -- 'purchase_order', 'sales_order', 'adjustment'
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);

-- 6.7 Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_number TEXT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status order_status DEFAULT 'draft',
    subtotal DECIMAL(12,2),
    tax DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status) WHERE deleted_at IS NULL;

-- 6.8 Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

-- 6.9 Goods Receipts
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_gr_company ON goods_receipts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(purchase_order_id) WHERE deleted_at IS NULL;

-- 6.10 Goods Receipt Items
CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gr_items_gr ON goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_po_item ON goods_receipt_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_product ON goods_receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_warehouse ON goods_receipt_items(warehouse_id);

-- =============================================================================
-- PHASE 7: CRM & SALES MODULE (Complete)
-- =============================================================================

-- 7.1 Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type TEXT DEFAULT 'company' CHECK (type IN ('person', 'company')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_assigned ON customers(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON customers USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- 7.2 Customer Contacts
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    position TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_company ON customer_contacts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON customer_contacts(email) WHERE deleted_at IS NULL;

-- 7.3 Deals / Opportunities
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    value DECIMAL(12,2) DEFAULT 0,
    stage deal_stage DEFAULT 'lead',
    probability INTEGER DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage) WHERE deleted_at IS NULL;

-- 7.4 Activities
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    related_type TEXT NOT NULL CHECK (related_type IN ('customer', 'deal', 'contact', 'ticket')),
    related_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task')),
    subject TEXT,
    notes TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_related ON activities(related_type, related_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_due ON activities(due_date) WHERE deleted_at IS NULL;

-- 7.5 Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    subtotal DECIMAL(12,2),
    tax DECIMAL(12,2),
    total DECIMAL(12,2),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_deal ON quotes(deal_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status) WHERE deleted_at IS NULL;

-- 7.6 Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price - discount) * (1 + tax_rate/100)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- 7.7 Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_ship_date DATE,
    status order_status DEFAULT 'draft',
    payment_status payment_status DEFAULT 'unpaid',
    subtotal DECIMAL(12,2),
    tax_total DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status) WHERE deleted_at IS NULL;

-- 7.8 Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price - discount) * (1 + tax_rate/100)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_so_items_so ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_so_items_product ON sales_order_items(product_id);

-- 7.9 Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_company ON support_tickets(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status) WHERE deleted_at IS NULL;

-- =============================================================================
-- PHASE 8: FLEET MODULE (Complete)
-- =============================================================================

-- 8.1 Vehicle Types
CREATE TABLE IF NOT EXISTS vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_company ON vehicle_types(company_id) WHERE deleted_at IS NULL;

-- 8.2 Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL,
    vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL,
    make TEXT,
    model TEXT,
    year INTEGER CHECK (year BETWEEN 1900 AND EXTRACT(YEAR FROM NOW()) + 1),
    vin TEXT,
    license_plate TEXT,
    assigned_driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status vehicle_status DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, vehicle_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(assigned_driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_custom_fields ON vehicles USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- 8.3 Driver Assignments (history)
CREATE TABLE IF NOT EXISTS driver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT assignment_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_driver_assignments_company ON driver_assignments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_driver_assignments_vehicle ON driver_assignments(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id) WHERE deleted_at IS NULL;

-- 8.4 Maintenance Logs
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    type TEXT CHECK (type IN ('routine', 'repair', 'inspection', 'emergency')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    odometer_reading INTEGER,
    performed_by TEXT,
    next_due_date DATE,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company ON vehicle_maintenance(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_due ON vehicle_maintenance(next_due_date) WHERE deleted_at IS NULL;

-- 8.5 Fuel Logs
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    fuel_date DATE NOT NULL,
    fuel_type TEXT,
    quantity DECIMAL(8,2) NOT NULL,
    unit_price DECIMAL(8,2),
    total_cost DECIMAL(10,2),
    odometer_reading INTEGER,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_company ON fuel_logs(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(fuel_date) WHERE deleted_at IS NULL;

-- 8.6 Trips
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_odometer INTEGER,
    end_odometer INTEGER,
    distance INTEGER,
    purpose TEXT,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_company ON trips(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_start ON trips(start_time) WHERE deleted_at IS NULL;

-- 8.7 Vehicle Documents
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_company ON vehicle_documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON vehicle_documents(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_expiry ON vehicle_documents(expiry_date) WHERE deleted_at IS NULL;

-- 8.8 Insurance Policies
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    policy_number TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT,
    coverage_amount DECIMAL(12,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium DECIMAL(10,2),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_company ON insurance_policies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_vehicle ON insurance_policies(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_dates ON insurance_policies(start_date, end_date) WHERE deleted_at IS NULL;

-- =============================================================================
-- PHASE 9: PROJECTS MODULE
-- =============================================================================

-- 9.1 Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    deadline DATE,
    budget DECIMAL(12,2),
    status project_status DEFAULT 'planning',
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id) WHERE deleted_at IS NULL;

-- 9.2 Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    estimated_hours DECIMAL(5,2),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;

-- 9.3 Time Logs
CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_company ON time_logs(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_logs_employee ON time_logs(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON time_logs(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_logs_start ON time_logs(start_time) WHERE deleted_at IS NULL;

-- =============================================================================
-- PHASE 10: FINANCE MODULE (Complete)
-- =============================================================================

-- 10.1 Currencies (reference)
CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO currencies (code, name, symbol) VALUES
    ('USD', 'US Dollar', '$'),
    ('EUR', 'Euro', '€'),
    ('GBP', 'British Pound', '£'),
    ('JPY', 'Japanese Yen', '¥'),
    ('CNY', 'Chinese Yuan', '¥')
ON CONFLICT (code) DO NOTHING;

-- 10.2 Exchange Rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    from_currency TEXT NOT NULL REFERENCES currencies(code),
    to_currency TEXT NOT NULL REFERENCES currencies(code),
    rate DECIMAL(12,6) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, from_currency, to_currency, date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);

-- 10.3 Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_account_id);

-- 10.4 Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON tax_rates(company_id) WHERE deleted_at IS NULL;

-- 10.5 Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'bank_transfer' CHECK (type IN ('cash', 'bank_transfer', 'credit_card', 'check', 'online')),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id) WHERE deleted_at IS NULL;

-- 10.6 Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status invoice_status DEFAULT 'draft',
    subtotal DECIMAL(12,2),
    tax_total DECIMAL(12,2),
    total DECIMAL(12,2),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    currency_code TEXT REFERENCES currencies(code),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date) WHERE deleted_at IS NULL;

-- 10.7 Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- 10.8 Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_number TEXT NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    reference TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date) WHERE deleted_at IS NULL;

-- 10.9 Bills (Accounts Payable)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bill_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(12,2),
    tax_total DECIMAL(12,2),
    total DECIMAL(12,2),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    currency_code TEXT REFERENCES currencies(code),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_company ON bills(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bills_supplier ON bills(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status) WHERE deleted_at IS NULL;

-- 10.10 Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product ON bill_items(product_id);

-- 10.11 Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    receipt_url TEXT,
    status expense_status DEFAULT 'draft',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_company ON expense_claims(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee ON expense_claims(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status) WHERE deleted_at IS NULL;

-- 10.12 Journal Entries (Double‑entry)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    description TEXT,
    total_debit DECIMAL(12,2) NOT NULL,
    total_credit DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, entry_number),
    CONSTRAINT journal_balanced CHECK (total_debit = total_credit)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date) WHERE deleted_at IS NULL;

-- 10.13 Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit DECIMAL(12,2) DEFAULT 0,
    credit DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);

-- 10.14 Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name),
    CONSTRAINT period_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_company ON financial_periods(company_id);

-- =============================================================================
-- PHASE 10B: INTERNATIONAL TRADE MODULE
-- =============================================================================

-- 10B.1 Ports
CREATE TABLE IF NOT EXISTS ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT, -- UN/LOCODE
    country_code TEXT,
    location_type TEXT CHECK (location_type IN ('sea', 'air', 'land_terminal')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- 10B.2 Freight Forwarders
CREATE TABLE IF NOT EXISTS freight_forwarders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10B.3 Vessels
CREATE TABLE IF NOT EXISTS vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    imo_number TEXT,
    mmsi TEXT,
    vessel_type TEXT,
    flag_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, imo_number)
);

-- 10B.4 Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_number TEXT NOT NULL,
    mode shipment_mode DEFAULT 'sea',
    status shipment_status DEFAULT 'planned',
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    vessel_id UUID REFERENCES vessels(id),
    freight_forwarder_id UUID REFERENCES freight_forwarders(id),
    departure_date DATE,
    estimated_arrival_date DATE,
    actual_arrival_date DATE,
    bill_of_lading TEXT,
    total_weight NUMERIC(10,2),
    weight_unit TEXT DEFAULT 'kg',
    custom_fields JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, shipment_number)
);

-- 10B.5 Shipment Items
CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT,
    hs_code TEXT, -- Harmonized System code for customs
    unit_value DECIMAL(12,2),
    total_value DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10B.6 Containers
CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    container_number TEXT NOT NULL,
    type TEXT, -- e.g., 20ft, 40ft HQ
    seal_number TEXT,
    status container_status DEFAULT 'loaded',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, container_number)
);

-- 10B.7 Container Items
CREATE TABLE IF NOT EXISTS container_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    shipment_item_id UUID NOT NULL REFERENCES shipment_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10B.8 Customs Clearance
CREATE TABLE IF NOT EXISTS customs_clearance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    declaration_number TEXT,
    status TEXT DEFAULT 'pending', -- pending, cleared, exam_required, rejected
    submission_date TIMESTAMPTZ,
    clearance_date TIMESTAMPTZ,
    duty_amount DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shipment_id)
);

-- 10B.9 Shipment Events (Timeline)
CREATE TABLE IF NOT EXISTS shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- departure, arrival, gating, loading
    event_timestamp TIMESTAMPTZ NOT NULL,
    location TEXT,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_containers_shipment ON containers(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);


-- =============================================================================
-- PHASE 11: AUTO‑UPDATE TRIGGERS (for all tables with updated_at)
-- =============================================================================

-- Helper to generate triggers (we'll list them explicitly for clarity)
DO $$ DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'companies', 'profiles', 'roles', 'role_permissions', 'company_users',
        'departments', 'positions', 'employees', 'leave_types', 'leaves', 'attendance',
        'employee_documents', 'performance_reviews', 'payroll_runs', 'payslips',
        'product_categories', 'suppliers', 'products', 'warehouses', 'stock_levels',
        'purchase_orders', 'purchase_order_items', 'goods_receipts',
        'customers', 'customer_contacts', 'deals', 'activities', 'quotes', 'sales_orders',
        'support_tickets', 'vehicle_types', 'vehicles', 'driver_assignments',
        'vehicle_maintenance', 'fuel_logs', 'trips', 'vehicle_documents', 'insurance_policies',
        'projects', 'tasks', 'time_logs',
        'exchange_rates', 'chart_of_accounts', 'tax_rates', 'payment_methods',
        'invoices', 'payments', 'bills', 'expense_claims', 'journal_entries', 'financial_periods',
        'ports', 'freight_forwarders', 'vessels', 'shipments', 'containers', 'customs_clearance'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 12: RLS POLICIES (Granular, with permission checks)
-- =============================================================================

-- Enable RLS on all tables (idempotent)
DO $$ DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        -- Clean up old restrictive policies
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I;', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
END $$;

-- Helper to create policy if not exists (handles USING vs WITH CHECK correctly)
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
    p_policy_name text,
    p_table_name text,
    p_command text,   -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    p_using text DEFAULT NULL,
    p_check text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = p_policy_name AND tablename = p_table_name) THEN
        IF p_command IN ('SELECT', 'DELETE') THEN
            IF p_using IS NULL THEN
                RAISE EXCEPTION 'USING expression required for % policy', p_command;
            END IF;
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)',
                           p_policy_name, p_table_name, p_command, p_using);
        ELSIF p_command = 'INSERT' THEN
            IF p_check IS NULL THEN
                RAISE EXCEPTION 'WITH CHECK expression required for INSERT policy';
            END IF;
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated WITH CHECK (%s)',
                           p_policy_name, p_table_name, p_command, p_check);
        ELSIF p_command = 'UPDATE' THEN
            IF p_using IS NULL THEN
                RAISE EXCEPTION 'USING expression required for UPDATE policy';
            END IF;
            IF p_check IS NULL THEN
                p_check := p_using;  -- reuse USING for CHECK if not provided
            END IF;
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
                           p_policy_name, p_table_name, p_command, p_using, p_check);
        ELSE
            RAISE EXCEPTION 'Unsupported command: %', p_command;
        END IF;
    END IF;
END;
$$;

-- Now create policies for each table.

DO $$
DECLARE
    t text;
BEGIN
    -- 0. GLOBAL CONFIG (Modules, Plans)
    PERFORM create_policy_if_not_exists(
        'modules_select', 'modules', 'SELECT',
        'true' -- Publicly readable
    );
    PERFORM create_policy_if_not_exists(
        'plans_select', 'plans', 'SELECT',
        'true' -- Publicly readable
    );

    -- 1. COMPANIES (Core)
    PERFORM create_policy_if_not_exists(
        'companies_select', 'companies', 'SELECT',
        'owner_id = auth.uid() OR id = get_current_company_id()'
    );
    PERFORM create_policy_if_not_exists(
        'companies_insert', 'companies', 'INSERT',
        NULL,
        'get_current_user_type() = ''super_admin'' AND owner_id = auth.uid()'
    );
    PERFORM create_policy_if_not_exists(
        'companies_update', 'companies', 'UPDATE',
        'owner_id = auth.uid()',
        'owner_id = auth.uid()'
    );

    -- 2. PROFILES (Core)
    -- Avoid infinite recursion:
    -- 1. Users can always see their own profile
    -- 2. Users can see profiles in their company (but we must avoid calling get_current_company_id() recursively if possible,
    --    or rely on SECURITY DEFINER function above)
    PERFORM create_policy_if_not_exists(
        'profiles_select', 'profiles', 'SELECT',
        'id = auth.uid() OR company_id = get_current_company_id()' 
    );
    PERFORM create_policy_if_not_exists(
        'profiles_update', 'profiles', 'UPDATE',
        'id = auth.uid()',
        'id = auth.uid()' -- Users can update their own profile
    );
    PERFORM create_policy_if_not_exists(
        'profiles_insert', 'profiles', 'INSERT',
        NULL,
        'id = auth.uid()'
    );

    -- 3. ROLES (Core)
    PERFORM create_policy_if_not_exists(
        'roles_select', 'roles', 'SELECT',
        'company_id = get_current_company_id() OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())'
    );
    PERFORM create_policy_if_not_exists(
        'roles_insert', 'roles', 'INSERT',
        NULL,
        'company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())'
    );
    PERFORM create_policy_if_not_exists(
        'roles_update', 'roles', 'UPDATE',
        'company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())',
        'company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())'
    );
    -- Note: Regular permission-based role management can be added here (e.g. valid managers can delete roles)

    -- 4. ROLE PERMISSIONS (Core)
    -- Allow inserting permissions if you own the company of the role
    PERFORM create_policy_if_not_exists(
        'role_permissions_insert', 'role_permissions', 'INSERT',
        NULL,
        'role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()))'
    );
    PERFORM create_policy_if_not_exists(
        'role_permissions_select', 'role_permissions', 'SELECT',
        'role_id IN (SELECT id FROM roles WHERE company_id = get_current_company_id() OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()))'
    );

    -- 5. COMPANY USERS (Core)
    PERFORM create_policy_if_not_exists(
        'company_users_select', 'company_users', 'SELECT',
        'company_id = get_current_company_id() OR user_id = auth.uid()'
    );
    PERFORM create_policy_if_not_exists(
        'company_users_insert', 'company_users', 'INSERT',
        NULL,
        'company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())' -- Owner can add users (e.g. themselves)
    );
    -- Employees (HR)
    PERFORM create_policy_if_not_exists(
        'employees_select', 'employees', 'SELECT',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''view''))'
    );
    PERFORM create_policy_if_not_exists(
        'employees_insert', 'employees', 'INSERT',
        NULL,
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''create''))'
    );
    PERFORM create_policy_if_not_exists(
        'employees_update', 'employees', 'UPDATE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''edit''))',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''edit''))'
    );
    PERFORM create_policy_if_not_exists(
        'employees_delete', 'employees', 'DELETE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''delete''))'
    );

    -- Customers (CRM)
    PERFORM create_policy_if_not_exists(
        'customers_select', 'customers', 'SELECT',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''view''))'
    );
    PERFORM create_policy_if_not_exists(
        'customers_insert', 'customers', 'INSERT',
        NULL,
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''create''))'
    );
    PERFORM create_policy_if_not_exists(
        'customers_update', 'customers', 'UPDATE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''edit''))',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''edit''))'
    );
    PERFORM create_policy_if_not_exists(
        'customers_delete', 'customers', 'DELETE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''delete''))'
    );

    -- Products (shared across modules)
    PERFORM create_policy_if_not_exists(
        'products_select', 'products', 'SELECT',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND (
            has_permission(''crm'', ''view'') OR
            has_permission(''inventory'', ''view'') OR
            has_permission(''finance'', ''view'')
        ))'
    );
    PERFORM create_policy_if_not_exists(
        'products_insert', 'products', 'INSERT',
        NULL,
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''create''))'
    );
    PERFORM create_policy_if_not_exists(
        'products_update', 'products', 'UPDATE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''edit''))',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''edit''))'
    );
    PERFORM create_policy_if_not_exists(
        'products_delete', 'products', 'DELETE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''delete''))'
    );

    -- =========================================================================
    -- GENERATE POLICIES FOR ALL MODULES (Loop-based)
    -- =========================================================================

    -- HR Module Tables
    FOREACH t IN ARRAY ARRAY['departments', 'positions', 'leaves', 'attendance', 'employee_documents', 'performance_reviews', 'payroll_runs', 'payslips'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''hr'', ''delete''))');
    END LOOP;

    -- CRM Module Tables
    FOREACH t IN ARRAY ARRAY['customer_contacts', 'deals', 'activities', 'quotes', 'sales_orders', 'support_tickets'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''crm'', ''delete''))');
    END LOOP;

    -- Inventory Module Tables
    FOREACH t IN ARRAY ARRAY['product_categories', 'suppliers', 'warehouses', 'stock_levels', 'stock_movements', 'purchase_orders', 'goods_receipts'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''inventory'', ''delete''))');
    END LOOP;

    -- Fleet Module Tables
    FOREACH t IN ARRAY ARRAY['vehicle_types', 'vehicles', 'driver_assignments', 'vehicle_maintenance', 'fuel_logs', 'trips', 'vehicle_documents', 'insurance_policies'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''delete''))');
    END LOOP;

    -- Projects Module Tables
    FOREACH t IN ARRAY ARRAY['projects', 'tasks', 'time_logs'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''projects'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''projects'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''projects'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''projects'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''projects'', ''delete''))');
    END LOOP;

    -- Finance Module Tables
    FOREACH t IN ARRAY ARRAY['exchange_rates', 'chart_of_accounts', 'tax_rates', 'payment_methods', 'invoices', 'payments', 'bills', 'expense_claims', 'journal_entries', 'financial_periods'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''finance'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''finance'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''finance'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''finance'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''finance'', ''delete''))');
    END LOOP;

    -- International Trade Module Tables
    FOREACH t IN ARRAY ARRAY['ports', 'freight_forwarders', 'vessels', 'shipments', 'containers', 'customs_clearance'] LOOP
        PERFORM create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''trade'', ''view''))');
        PERFORM create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''trade'', ''create''))');
        PERFORM create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''trade'', ''edit''))', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''trade'', ''edit''))');
        PERFORM create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''trade'', ''delete''))');
    END LOOP;

    -- Trade Child Tables
    PERFORM create_policy_if_not_exists('shipment_items_select', 'shipment_items', 'SELECT', 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('shipment_items_mod', 'shipment_items', 'INSERT', NULL, 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('shipment_items_upd', 'shipment_items', 'UPDATE', 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('shipment_items_del', 'shipment_items', 'DELETE', 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('container_items_select', 'container_items', 'SELECT', 'container_id IN (SELECT id FROM containers WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('container_items_mod', 'container_items', 'INSERT', NULL, 'container_id IN (SELECT id FROM containers WHERE company_id = get_current_company_id())');
    
    PERFORM create_policy_if_not_exists('shipment_events_select', 'shipment_events', 'SELECT', 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('shipment_events_mod', 'shipment_events', 'INSERT', NULL, 'shipment_id IN (SELECT id FROM shipments WHERE company_id = get_current_company_id())');


    -- Child Tables (Items) - Implicit access via Parent
    -- If you can view/edit the parent (checked via module permission), you can view/edit the items.
    -- We can use a simpler check: exists in parent with company_id
    
    PERFORM create_policy_if_not_exists('quote_items_select', 'quote_items', 'SELECT', 'quote_id IN (SELECT id FROM quotes WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('quote_items_mod', 'quote_items', 'INSERT', NULL, 'quote_id IN (SELECT id FROM quotes WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('quote_items_upd', 'quote_items', 'UPDATE', 'quote_id IN (SELECT id FROM quotes WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('quote_items_del', 'quote_items', 'DELETE', 'quote_id IN (SELECT id FROM quotes WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('so_items_select', 'sales_order_items', 'SELECT', 'sales_order_id IN (SELECT id FROM sales_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('so_items_mod', 'sales_order_items', 'INSERT', NULL, 'sales_order_id IN (SELECT id FROM sales_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('so_items_upd', 'sales_order_items', 'UPDATE', 'sales_order_id IN (SELECT id FROM sales_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('so_items_del', 'sales_order_items', 'DELETE', 'sales_order_id IN (SELECT id FROM sales_orders WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('po_items_select', 'purchase_order_items', 'SELECT', 'purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('po_items_mod', 'purchase_order_items', 'INSERT', NULL, 'purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('po_items_upd', 'purchase_order_items', 'UPDATE', 'purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('po_items_del', 'purchase_order_items', 'DELETE', 'purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id = get_current_company_id())');
    
    PERFORM create_policy_if_not_exists('inv_items_select', 'invoice_items', 'SELECT', 'invoice_id IN (SELECT id FROM invoices WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('inv_items_mod', 'invoice_items', 'INSERT', NULL, 'invoice_id IN (SELECT id FROM invoices WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('inv_items_upd', 'invoice_items', 'UPDATE', 'invoice_id IN (SELECT id FROM invoices WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('inv_items_del', 'invoice_items', 'DELETE', 'invoice_id IN (SELECT id FROM invoices WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('bill_items_select', 'bill_items', 'SELECT', 'bill_id IN (SELECT id FROM bills WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('bill_items_mod', 'bill_items', 'INSERT', NULL, 'bill_id IN (SELECT id FROM bills WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('bill_items_upd', 'bill_items', 'UPDATE', 'bill_id IN (SELECT id FROM bills WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('bill_items_del', 'bill_items', 'DELETE', 'bill_id IN (SELECT id FROM bills WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('gr_items_select', 'goods_receipt_items', 'SELECT', 'goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('gr_items_mod', 'goods_receipt_items', 'INSERT', NULL, 'goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('gr_items_upd', 'goods_receipt_items', 'UPDATE', 'goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('gr_items_del', 'goods_receipt_items', 'DELETE', 'goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id = get_current_company_id())');

    PERFORM create_policy_if_not_exists('je_lines_select', 'journal_entry_lines', 'SELECT', 'journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('je_lines_mod', 'journal_entry_lines', 'INSERT', NULL, 'journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('je_lines_upd', 'journal_entry_lines', 'UPDATE', 'journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_current_company_id())');
    PERFORM create_policy_if_not_exists('je_lines_del', 'journal_entry_lines', 'DELETE', 'journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_current_company_id())');


END $$;

-- =============================================================================
-- PHASE 13: AUDIT TRIGGER ACTIVATION (selective)
-- =============================================================================

CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON deals FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION audit_trigger();
-- Add more as needed

-- =============================================================================
-- PHASE 14: AUTH TRIGGER (handles new user signup)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_role_id UUID;
  v_user_type user_type;
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_onboarding BOOLEAN;
  v_dept_name TEXT;
  v_dept_id UUID;
  v_pos_id UUID;
BEGIN
  -- Extract Metadata
  v_company_id := COALESCE((NEW.raw_user_meta_data->>'company_id')::UUID, (NEW.raw_user_meta_data->>'companyId')::UUID);
  v_role_id := COALESCE((NEW.raw_user_meta_data->>'role_id')::UUID, (NEW.raw_user_meta_data->>'roleId')::UUID);
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName');

  -- Determine User Type & Onboarding Status
  IF v_company_id IS NOT NULL THEN
    v_user_type := 'company_user';
    v_onboarding := TRUE; -- Invited users skip company creation
  ELSE
    v_user_type := 'super_admin';
    v_onboarding := FALSE; -- Owner must complete onboarding
  END IF;

  -- 1. Create Profile
  INSERT INTO public.profiles (id, company_id, user_type, full_name, email, onboarding) 
  VALUES (NEW.id, v_company_id, v_user_type, COALESCE(v_full_name, NEW.email), NEW.email, v_onboarding)
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    user_type = EXCLUDED.user_type,
    onboarding = EXCLUDED.onboarding;

  -- 2. Link to Company (if applicable)
  IF v_company_id IS NOT NULL THEN
    -- A. Add to company_users
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.company_users (user_id, company_id, role_id, status) 
        VALUES (NEW.id, v_company_id, v_role_id, 'active') 
        ON CONFLICT (user_id, company_id) DO NOTHING;
        
        -- Resolve Department and Position IDs from the Role
        SELECT department INTO v_dept_name FROM roles WHERE id = v_role_id;
        IF v_dept_name IS NOT NULL THEN
            SELECT id INTO v_dept_id FROM departments WHERE company_id = v_company_id AND name = v_dept_name LIMIT 1;
        END IF;
        
        -- Position title usually matches Role name
        SELECT id INTO v_pos_id FROM positions 
        WHERE company_id = v_company_id 
        AND title = (SELECT name FROM roles WHERE id = v_role_id) 
        LIMIT 1;
    END IF;

    -- B. Add to employees table (Auto-create Employee Record)
    -- Parse name safely
    IF v_full_name IS NOT NULL AND v_full_name NOT LIKE '%@%' THEN
        v_first_name := split_part(v_full_name, ' ', 1);
        v_last_name := NULLIF(substring(v_full_name from length(v_first_name) + 2), '');
    ELSE
        -- Default to empty if it looks like an email or is missing
        v_first_name := '';
        v_last_name := '';
    END IF;
    
    IF v_last_name IS NULL THEN v_last_name := ''; END IF;

    INSERT INTO public.employees (
        company_id, 
        user_id, 
        department_id,
        position_id,
        employee_code, 
        first_name, 
        last_name, 
        email, 
        status, 
        hire_date
    ) VALUES (
        v_company_id,
        NEW.id,
        v_dept_id,
        v_pos_id,
        'EMP-' || substring(NEW.id::text, 1, 8),
        v_first_name,
        v_last_name,
        NEW.email,
        'active',
        CURRENT_DATE
    ) ON CONFLICT (company_id, employee_code) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- DONE – All modules are now complete and idempotent.
-- =============================================================================
