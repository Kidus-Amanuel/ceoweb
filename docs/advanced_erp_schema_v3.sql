-- =====================================================
-- ADVANCED MULTI-TENANT ERP SCHEMA v3.2 (Complete)
-- Platform: PostgreSQL + Supabase + RLS
-- Architect: Advanced Agentic Coding
-- Version: 3.2.0
-- Description: Idempotent V3 Schema + Auth Triggers
-- =====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS (Safe Creation)
DO $$ BEGIN CREATE TYPE user_type AS ENUM ('super_admin', 'company_user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE company_status AS ENUM ('active', 'suspended', 'trial', 'churned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'terminated', 'on_leave', 'onboarding'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE review_rating AS ENUM ('unsatisfactory', 'meets_expectations', 'exceeds_expectations', 'outstanding'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('draft', 'pending_approval', 'approved', 'issued', 'received', 'cancelled', 'fulfilled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'reimbursed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. CORE TABLES

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    max_users INTEGER NOT NULL,
    modules JSONB DEFAULT '["hr", "crm"]', 
    price_monthly DECIMAL(10, 2) NOT NULL,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO plans (name, max_users, price_monthly, modules) VALUES
('Starter', 5, 29.00, '["hr", "crm"]'),
('Business', 20, 99.00, '["hr", "crm", "inventory", "finance"]'),
('Enterprise', 1000, 499.00, '["hr", "crm", "inventory", "finance", "fleet", "projects"]')
ON CONFLICT (name) DO UPDATE SET max_users=EXCLUDED.max_users, modules=EXCLUDED.modules;

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL, 
    plan_id UUID REFERENCES plans(id),
    status company_status DEFAULT 'trial',
    settings JSONB DEFAULT '{"currency": "USD", "fiscal_year_start": "01-01"}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    user_type user_type DEFAULT 'company_user',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions JSONB DEFAULT '{}', 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    status TEXT DEFAULT 'active',
    UNIQUE(user_id, company_id)
);

-- 4. HR MODULE

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manager_id UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    department_id UUID REFERENCES departments(id),
    employee_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    job_title TEXT,
    hire_date DATE,
    basic_salary DECIMAL(12, 2) DEFAULT 0,
    hourly_rate DECIMAL(10, 2),
    status employee_status DEFAULT 'active',
    bank_details JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, employee_code)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    processed_date TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    total_cost DECIMAL(15, 2),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    basic_pay DECIMAL(12, 2) NOT NULL,
    total_allowances DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    net_pay DECIMAL(12, 2) NOT NULL,
    breakdown JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    reviewer_id UUID REFERENCES profiles(id),
    review_period TEXT,
    rating review_rating,
    comments TEXT,
    goals_set JSONB DEFAULT '[]',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLY CHAIN

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    payment_terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'physical',
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, sku)
);
DO $$ BEGIN ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    order_number TEXT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status order_status DEFAULT 'draft',
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, order_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 6. CRM & SALES

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id), 
    order_number TEXT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    status order_status DEFAULT 'draft',
    payment_status payment_status DEFAULT 'unpaid',
    total_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, order_number)
);
DO $$ BEGIN ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    total_price DECIMAL(12, 2)
);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value DECIMAL(12, 2),
    start_date DATE NOT NULL,
    end_date DATE,
    document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    subject TEXT NOT NULL,
    description TEXT,
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 7. FINANCE

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    sales_order_id UUID REFERENCES sales_orders(id),
    customer_id UUID REFERENCES customers(id),
    invoice_number TEXT NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status invoice_status DEFAULT 'draft',
    subtotal DECIMAL(12, 2),
    tax_total DECIMAL(12, 2),
    total DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_url TEXT,
    status expense_status DEFAULT 'draft',
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROJECTS

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    deadline DATE,
    budget DECIMAL(12, 2),
    status project_status DEFAULT 'planning',
    manager_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    estimated_hours DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RLS POLICIES & SECURITY

CREATE OR REPLACE FUNCTION get_current_company_id() RETURNS UUID AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Apply simplified isolation policies (Drop first to be idempotent)
DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', tbl);
        -- Note: We can't automatically apply one policy to all because 'companies' and 'profiles' have slightly different logic
    END LOOP;
END $$;

-- Manual Policy Re-creation
CREATE POLICY "Tenant Isolation" ON companies USING (id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON profiles USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON employees USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON customers USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON products USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON suppliers USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON purchase_orders USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON sales_orders USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON contracts USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON tickets USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON invoices USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON expense_claims USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON projects USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON tasks USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON time_logs USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON departments USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON company_users USING (company_id = get_current_company_id());
CREATE POLICY "Tenant Isolation" ON roles USING (company_id = get_current_company_id());

-- 10. AUTH TRIGGER (CRITICAL for Signup)
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
BEGIN
  -- Extract Metadata
  v_company_id := COALESCE((NEW.raw_user_meta_data->>'company_id')::UUID, (NEW.raw_user_meta_data->>'companyId')::UUID);
  v_role_id := COALESCE((NEW.raw_user_meta_data->>'role_id')::UUID, (NEW.raw_user_meta_data->>'roleId')::UUID);
  
  IF v_company_id IS NOT NULL THEN
    v_user_type := 'company_user';
  ELSE
    v_user_type := 'super_admin';
  END IF;
  
  INSERT INTO public.profiles (id, company_id, user_type, full_name, email) 
  VALUES (NEW.id, v_company_id, v_user_type, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.company_users (user_id, company_id, role_id, status) 
    VALUES (NEW.id, v_company_id, v_role_id, 'active') ON CONFLICT DO NOTHING;
  END IF;
   RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- DONE
-- =====================================================
