-- =====================================================
-- Migration: Business Tables with Multi-Tenant Scoping
-- Description: Creates example business tables (projects, employees)
--              demonstrating proper tenant scoping and RLS policies
-- Version: 1.0.0
-- Date: 2026-02-12
-- =====================================================

-- =====================================================
-- SECTION 1: BUSINESS ENUMS
-- =====================================================

-- Project status enumeration
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- Employee department enumeration (examples - expand as needed)
CREATE TYPE department_type AS ENUM ('hr', 'crm', 'fleet', 'inventory', 'finance', 'operations', 'it');

-- =====================================================
-- SECTION 2: BUSINESS TABLES
-- =====================================================

-- -----------------------------------------------------
-- TABLE: projects
-- Purpose: Example business entity scoped by company
-- Demonstrates: Multi-tenant isolation, ownership tracking
-- RLS: Strict company-level isolation
-- -----------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status project_status DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT projects_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT projects_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
  -- NOTE: Owner-company matching enforced via trigger (see below)
);

-- Indexes for projects table
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

COMMENT ON TABLE projects IS 'Company projects - demonstrates multi-tenant business data';
COMMENT ON COLUMN projects.company_id IS 'Tenant isolation - all queries must filter by this';
COMMENT ON COLUMN projects.owner_id IS 'Project owner/manager - must be a user in the same company';

-- -----------------------------------------------------
-- TABLE: employees
-- Purpose: HR module - employee records
-- Demonstrates: HR data isolation, department tracking
-- RLS: Strict company-level isolation
-- -----------------------------------------------------
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  department department_type,
  position TEXT,
  hire_date DATE,
  termination_date DATE,
  salary DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT employees_number_not_empty CHECK (char_length(employee_number) > 0),
  CONSTRAINT employees_dates_valid CHECK (
    termination_date IS NULL OR termination_date >= hire_date
  ),
  -- Employee number unique per company
  CONSTRAINT employees_number_unique_per_company UNIQUE (company_id, employee_number)
  -- NOTE: Profile-company matching enforced via trigger (see below)
);

-- Indexes for employees table
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_employees_employee_number ON employees(company_id, employee_number);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);

COMMENT ON TABLE employees IS 'HR employee records - scoped to company with sensitive data protection';
COMMENT ON COLUMN employees.company_id IS 'Tenant isolation - strict company-level access control';
COMMENT ON COLUMN employees.profile_id IS 'Links to user profile - profile must be in same company';
COMMENT ON COLUMN employees.salary IS 'Sensitive - additional RLS policies may restrict access';

-- -----------------------------------------------------
-- TABLE: customers (CRM Module Example)
-- Purpose: CRM module - customer/client records
-- Demonstrates: CRM module data isolation, assignment tracking
-- RLS: Strict company-level isolation
-- -----------------------------------------------------
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT customers_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT customers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
  CONSTRAINT customers_valid_status CHECK (status IN ('active', 'inactive', 'prospect', 'churned'))
);

-- Indexes for customers table
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email ON customers(email);

COMMENT ON TABLE customers IS 'CRM customer records - scoped by company with assignment tracking';
COMMENT ON COLUMN customers.assigned_to IS 'Sales rep/account manager - ownership for conditional access';

-- -----------------------------------------------------
-- TABLE: vehicles (Fleet Module Example)
-- Purpose: Fleet module - vehicle tracking
-- Demonstrates: Fleet module data isolation, driver assignment
-- RLS: Strict company-level isolation
-- -----------------------------------------------------
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT vehicles_number_not_empty CHECK (char_length(vehicle_number) > 0),
  CONSTRAINT vehicles_number_unique_per_company UNIQUE (company_id, vehicle_number),
  CONSTRAINT vehicles_year_valid CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1)),
  CONSTRAINT vehicles_valid_status CHECK (status IN ('active', 'maintenance', 'retired'))
);

-- Indexes for vehicles table
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_vehicle_number ON vehicles(company_id, vehicle_number);
CREATE INDEX idx_vehicles_assigned_driver ON vehicles(assigned_driver_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

COMMENT ON TABLE vehicles IS 'Fleet vehicle records - scoped by company with driver assignment';
COMMENT ON COLUMN vehicles.assigned_driver_id IS 'Currently assigned driver - for conditional access in RLS';

-- =====================================================
-- SECTION 3: TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Auto-update updated_at for projects
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for employees
CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for customers
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for vehicles
CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- TRIGGER FUNCTION: validate_project_owner
-- Purpose: Ensures project owner belongs to the same company
-- Replaces CHECK constraint (subqueries not allowed in CHECK)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validate_project_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = NEW.owner_id
    AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Project owner % is not a member of company %', NEW.owner_id, NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_project_owner IS 'Ensures project owner is a member of the project company';

CREATE TRIGGER trg_validate_project_owner
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_owner();

-- -----------------------------------------------------
-- TRIGGER FUNCTION: validate_employee_profile
-- Purpose: Ensures employee profile belongs to the same company
-- Replaces CHECK constraint (subqueries not allowed in CHECK)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validate_employee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.profile_id
    AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Profile % does not belong to company %', NEW.profile_id, NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_employee_profile IS 'Ensures employee profile belongs to the same company';

CREATE TRIGGER trg_validate_employee_profile
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_profile();

-- =====================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all business tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS POLICIES: projects
-- All operations require company membership via RLS
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see their company projects
CREATE POLICY "Projects: super_admin can view all"
  ON projects FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Projects: company_user can view company projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
  );

-- INSERT: Users with 'crm' module 'create' permission can create projects
CREATE POLICY "Projects: authorized users can create"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'create') OR 
      get_user_type() = 'super_admin'
    )
  );

-- UPDATE: Project owner or users with edit permission can update
CREATE POLICY "Projects: owner or authorized can update"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      owner_id = auth.uid() OR
      has_permission('crm', 'edit') OR
      get_user_type() = 'super_admin'
    )
  );

-- DELETE: Only users with delete permission can delete
CREATE POLICY "Projects: authorized users can delete"
  ON projects FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'delete') OR
      get_user_type() = 'super_admin'
    )
  );

-- -----------------------------------------------------
-- RLS POLICIES: employees
-- HR module - stricter access controls
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users with HR view permission
CREATE POLICY "Employees: super_admin can view all"
  ON employees FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Employees: authorized users can view company employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('hr', 'view') OR
      profile_id = auth.uid()  -- Users can view their own employee record
    )
  );

-- INSERT: Only users with HR create permission
CREATE POLICY "Employees: HR can create employee records"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      has_permission('hr', 'create') OR
      get_user_type() = 'super_admin'
    )
  );

-- UPDATE: HR edit permission required
CREATE POLICY "Employees: HR can update employee records"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('hr', 'edit') OR
      get_user_type() = 'super_admin'
    )
  );

-- DELETE: HR delete permission required (very restrictive)
CREATE POLICY "Employees: HR can delete employee records"
  ON employees FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('hr', 'delete') OR
      get_user_type() = 'super_admin'
    )
  );

-- -----------------------------------------------------
-- RLS POLICIES: customers
-- CRM module - with ownership-based access
-- -----------------------------------------------------

-- SELECT: View all company customers if has permission, or view assigned customers
CREATE POLICY "Customers: super_admin can view all"
  ON customers FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Customers: company_user can view company customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'view') OR
      assigned_to = auth.uid()  -- Can view assigned customers
    )
  );

-- INSERT: CRM create permission
CREATE POLICY "Customers: authorized users can create"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'create') OR
      get_user_type() = 'super_admin'
    )
  );

-- UPDATE: Can edit all if has permission, or own assigned customers
CREATE POLICY "Customers: authorized users can update"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'edit') OR
      assigned_to = auth.uid() OR
      get_user_type() = 'super_admin'
    )
  );

-- DELETE: CRM delete permission only
CREATE POLICY "Customers: authorized users can delete"
  ON customers FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('crm', 'delete') OR
      get_user_type() = 'super_admin'
    )
  );

-- -----------------------------------------------------
-- RLS POLICIES: vehicles
-- Fleet module - with driver assignment access
-- -----------------------------------------------------

-- SELECT: View all company vehicles if has permission, or assigned vehicle
CREATE POLICY "Vehicles: super_admin can view all"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Vehicles: company_user can view company vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('fleet', 'view') OR
      assigned_driver_id = auth.uid()  -- Drivers can view assigned vehicle
    )
  );

-- INSERT: Fleet create permission
CREATE POLICY "Vehicles: authorized users can create"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      has_permission('fleet', 'create') OR
      get_user_type() = 'super_admin'
    )
  );

-- UPDATE: Fleet edit permission
CREATE POLICY "Vehicles: authorized users can update"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('fleet', 'edit') OR
      get_user_type() = 'super_admin'
    )
  );

-- DELETE: Fleet delete permission
CREATE POLICY "Vehicles: authorized users can delete"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      has_permission('fleet', 'delete') OR
      get_user_type() = 'super_admin'
    )
  );
