-- =====================================================
-- Migration: Core Multi-Tenant ERP Schema
-- Description: Creates the foundational schema for a multi-tenant ERP system
--              with super_admin and company_user roles, dynamic role system,
--              and module-based permissions
-- Version: 1.0.0
-- Date: 2026-02-12
-- =====================================================

-- =====================================================
-- SECTION 1: ENUMS AND TYPES
-- =====================================================

-- User type enumeration: super_admin (platform owner) or company_user (tenant user)
CREATE TYPE user_type AS ENUM ('super_admin', 'company_user');

-- User status enumeration
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'inactive');

-- Company status enumeration  
CREATE TYPE company_status AS ENUM ('active', 'suspended', 'trial');

-- =====================================================
-- SECTION 2: CORE TABLES
-- =====================================================

-- -----------------------------------------------------
-- TABLE: companies
-- Purpose: Multi-tenant company/organization table
-- RLS: Enabled - users can only access their own company
-- -----------------------------------------------------
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT true,
  status company_status DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT companies_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT companies_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

-- Indexes for companies table
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status) WHERE is_active = true;

-- Comments
COMMENT ON TABLE companies IS 'Tenant companies in the multi-tenant ERP system';
COMMENT ON COLUMN companies.owner_id IS 'Company owner who created/manages the company';
COMMENT ON COLUMN companies.slug IS 'URL-friendly unique identifier for the company';

-- -----------------------------------------------------
-- TABLE: modules  
-- Purpose: Available ERP modules (CRM, HR, Fleet, etc.)
-- RLS: Public read access
-- -----------------------------------------------------
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT modules_name_lowercase CHECK (name = lower(name))
);

-- Insert core modules
INSERT INTO modules (name, display_name, description) VALUES
  ('crm', 'CRM', 'Customer Relationship Management'),
  ('hr', 'HR', 'Human Resources'),
  ('fleet', 'Fleet', 'Fleet Management'),
  ('inventory', 'Inventory', 'Inventory Management'),
  ('finance', 'Finance', 'Financial Management');

COMMENT ON TABLE modules IS 'Available ERP modules that companies can enable';

-- -----------------------------------------------------
-- TABLE: profiles
-- Purpose: Extends auth.users with company and role info
-- RLS: Enabled - strict company isolation
-- -----------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_type user_type NOT NULL DEFAULT 'company_user',
  full_name TEXT,
  avatar_url TEXT,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: company_users must have a company, super_admins must not
  CONSTRAINT profiles_company_user_has_company CHECK (
    (user_type = 'company_user' AND company_id IS NOT NULL) OR
    (user_type = 'super_admin' AND company_id IS NULL)
  )
);

-- Indexes for profiles table
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_status ON profiles(status);

COMMENT ON TABLE profiles IS 'User profiles extending auth.users with company association';
COMMENT ON COLUMN profiles.user_type IS 'super_admin for platform owners, company_user for regular users';
COMMENT ON COLUMN profiles.company_id IS 'Company association - NULL for super_admins only';

-- -----------------------------------------------------
-- TABLE: roles
-- Purpose: Company-specific role definitions
-- RLS: Enabled - users can only see roles in their company
-- -----------------------------------------------------
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT roles_name_not_empty CHECK (char_length(name) > 0),
  -- Unique role name per company
  CONSTRAINT roles_unique_per_company UNIQUE (company_id, name)
);

-- Indexes for roles table
CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_name ON roles(company_id, name);

COMMENT ON TABLE roles IS 'Company-specific role definitions (e.g., General Manager, HR Manager)';
COMMENT ON COLUMN roles.company_id IS 'Roles are scoped to a specific company';

-- -----------------------------------------------------
-- TABLE: company_users
-- Purpose: Associates users with companies and assigns roles
-- RLS: Enabled - strict company isolation
-- -----------------------------------------------------
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  position TEXT,
  status user_status DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  -- Each user can only be in one company (for now - can be relaxed later)
  CONSTRAINT company_users_user_unique UNIQUE (user_id)
  -- NOTE: Role-company matching enforced via trigger (see below)
);

-- Indexes for company_users table
CREATE INDEX idx_company_users_user_id ON company_users(user_id);
CREATE INDEX idx_company_users_company_id ON company_users(company_id);
CREATE INDEX idx_company_users_role_id ON company_users(role_id);
CREATE INDEX idx_company_users_status ON company_users(status);

COMMENT ON TABLE company_users IS 'Associates users with companies and assigns company-specific roles';
COMMENT ON COLUMN company_users.position IS 'Job position/title within the company';
COMMENT ON COLUMN company_users.status IS 'User status within this company';

-- -----------------------------------------------------
-- TABLE: role_permissions
-- Purpose: Granular module-action permissions per role
-- RLS: Enabled - view permissions for own company roles
-- -----------------------------------------------------
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT role_permissions_unique UNIQUE (role_id, module, action),
  CONSTRAINT role_permissions_valid_action CHECK (
    action IN ('view', 'create', 'edit', 'delete', 'export', 'approve')
  )
  -- NOTE: Module validation enforced via trigger (see below)
);

-- Indexes for role_permissions table
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_module ON role_permissions(module);
CREATE INDEX idx_role_permissions_action ON role_permissions(action);

COMMENT ON TABLE role_permissions IS 'Granular permissions: which actions each role can perform on each module';
COMMENT ON COLUMN role_permissions.module IS 'Module name (crm, hr, fleet, etc.)';
COMMENT ON COLUMN role_permissions.action IS 'Permitted action (view, create, edit, delete, export, approve)';

-- =====================================================
-- SECTION 3: HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: get_user_company_id
-- Purpose: Returns the company_id for the current authenticated user
-- Used in: RLS policies for cleaner syntax
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_company_id IS 'Returns company_id for current user, used in RLS policies';

-- -----------------------------------------------------
-- FUNCTION: get_user_type
-- Purpose: Returns the user_type for the current authenticated user
-- Used in: RLS policies to differentiate super_admin from company_user
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_type()
RETURNS user_type
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_type 
  FROM profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_type IS 'Returns user_type (super_admin or company_user) for current user';

-- -----------------------------------------------------
-- FUNCTION: has_permission
-- Purpose: Check if current user has specific permission
-- Used in: RLS policies and application logic
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION has_permission(
  p_module TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_users cu
    JOIN role_permissions rp ON rp.role_id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND rp.module = p_module
      AND rp.action = p_action
      AND cu.status = 'active'
  );
$$;

COMMENT ON FUNCTION has_permission IS 'Check if current user has permission for module+action';

-- -----------------------------------------------------
-- FUNCTION: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp
-- Used in: Triggers on all tables with updated_at column
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to auto-update updated_at timestamp';

-- =====================================================
-- SECTION 4: TRIGGERS
-- =====================================================

-- Auto-update updated_at for companies
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for roles
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- TRIGGER FUNCTION: validate_company_users_role
-- Purpose: Ensures role_id belongs to the same company
-- Replaces CHECK constraint (subqueries not allowed in CHECK)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validate_company_users_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM roles
    WHERE id = NEW.role_id
    AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Role % does not belong to company %', NEW.role_id, NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_company_users_role IS 'Ensures role belongs to the same company as the company_user';

CREATE TRIGGER trg_validate_company_users_role
  BEFORE INSERT OR UPDATE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_users_role();

-- -----------------------------------------------------
-- TRIGGER FUNCTION: validate_role_permissions_module
-- Purpose: Ensures module name exists in modules table
-- Replaces CHECK constraint (subqueries not allowed in CHECK)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validate_role_permissions_module()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM modules
    WHERE name = NEW.module
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Module "%" does not exist or is not active', NEW.module;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_role_permissions_module IS 'Ensures module exists and is active before adding permissions';

CREATE TRIGGER trg_validate_role_permissions_module
  BEFORE INSERT OR UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_permissions_module();

-- =====================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS POLICIES: companies
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see their own
CREATE POLICY "Companies: super_admin can view all"
  ON companies FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Companies: company_user can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = get_user_company_id()
  );

-- INSERT: Authenticated users can create companies (becomes owner)
CREATE POLICY "Companies: authenticated users can create"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
  );

-- UPDATE: Company owner or super_admin can update
CREATE POLICY "Companies: owner can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR get_user_type() = 'super_admin'
  );

-- DELETE: Company owner only (super_admin can delete via admin panel)
CREATE POLICY "Companies: owner can delete own company"
  ON companies FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid() OR get_user_type() = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS POLICIES: profiles
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see profiles in their company
CREATE POLICY "Profiles: super_admin can view all"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Profiles: company_user can view same company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
  );

-- INSERT: Super admin can create any profile, users can create own profile
CREATE POLICY "Profiles: users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() OR get_user_type() = 'super_admin'
  );

-- UPDATE: Users can update own profile, super_admin can update any
CREATE POLICY "Profiles: users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR get_user_type() = 'super_admin'
  );

-- DELETE: Super admin only
CREATE POLICY "Profiles: super_admin can delete"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS POLICIES: roles
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see their company roles
CREATE POLICY "Roles: super_admin can view all"
  ON roles FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "Roles: company_user can view own company roles"
  ON roles FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
  );

-- INSERT: Company owner or super_admin can create roles
CREATE POLICY "Roles: company owner can create roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() 
    OR get_user_type() = 'super_admin'
  );

-- UPDATE: Company owner or super_admin can update roles
CREATE POLICY "Roles: company owner can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- DELETE: Company owner or super_admin can delete roles
CREATE POLICY "Roles: company owner can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS POLICIES: company_users
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see their company members
CREATE POLICY "CompanyUsers: super_admin can view all"
  ON company_users FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "CompanyUsers: company_user can view same company"
  ON company_users FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
  );

-- INSERT: Company owner or super_admin can add users
CREATE POLICY "CompanyUsers: company owner can invite users"
  ON company_users FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- UPDATE: Company owner or super_admin can update
CREATE POLICY "CompanyUsers: company owner can update"
  ON company_users FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- DELETE: Company owner or super_admin can delete
CREATE POLICY "CompanyUsers: company owner can remove users"
  ON company_users FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS POLICIES: role_permissions
-- -----------------------------------------------------

-- SELECT: Super admins see all, company users see their company role permissions
CREATE POLICY "RolePermissions: super_admin can view all"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    get_user_type() = 'super_admin'
  );

CREATE POLICY "RolePermissions: company_user can view own company permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    role_id IN (
      SELECT id FROM roles WHERE company_id = get_user_company_id()
    )
  );

-- INSERT/UPDATE/DELETE: Company owner or super_admin only
CREATE POLICY "RolePermissions: company owner can manage"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    role_id IN (
      SELECT id FROM roles WHERE company_id = get_user_company_id()
    )
    OR get_user_type() = 'super_admin'
  );

CREATE POLICY "RolePermissions: company owner can update"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (
    role_id IN (
      SELECT id FROM roles WHERE company_id = get_user_company_id()
    )
    OR get_user_type() = 'super_admin'
  );

CREATE POLICY "RolePermissions: company owner can delete"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (
    role_id IN (
      SELECT id FROM roles WHERE company_id = get_user_company_id()
    )
    OR get_user_type() = 'super_admin'
  );

-- =====================================================
-- SECTION 6: MODULES TABLE - PUBLIC READ ACCESS
-- =====================================================

-- Modules table doesn't need strict RLS, it's reference data
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules: anyone can view active modules"
  ON modules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only super_admin can modify modules
CREATE POLICY "Modules: super_admin can manage"
  ON modules FOR ALL
  TO authenticated
  USING (get_user_type() = 'super_admin')
  WITH CHECK (get_user_type() = 'super_admin');
