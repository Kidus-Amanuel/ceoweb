-- =====================================================
-- Seed Data: Sample Companies, Roles, and Permissions
-- Description: Test data for development and demonstration
-- Version: 1.0.0
-- Date: 2026-02-12
-- WARNING: This is for development/testing only!
--          DO NOT use in production!
-- =====================================================

-- =====================================================
-- SECTION 1: SAMPLE COMPANIES
-- =====================================================

-- Insert sample companies (using fixed UUIDs for consistency)
INSERT INTO companies (id, name, slug, owner_id, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ABC PLC', 'abc-plc', (SELECT id FROM auth.users LIMIT 1), 'active'),
  ('22222222-2222-2222-2222-222222222222', 'XYZ Trading', 'xyz-trading', (SELECT id FROM auth.users LIMIT 1), 'active')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 2: SAMPLE ROLES FOR ABC PLC
-- =====================================================

INSERT INTO roles (id, company_id, name, description) VALUES
  -- ABC PLC Roles
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'General Manager', 'Manages overall company operations'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'HR Manager', 'Manages HR department'),
  ('aaaaaaaa-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'CRM Manager', 'Manages CRM module'),
  ('aaaaaaaa-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'HR Supervisor', 'HR team supervisor'),
  ('aaaaaaaa-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Driver', 'Fleet operations'),
  ('aaaaaaaa-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Sales Executive', 'CRM sales team'),
  
  -- XYZ Trading Roles
  ('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'General Manager', 'Manages overall company operations'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'HR Manager', 'HR team'),
  ('bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Fleet Manager', 'Fleet management'),
  ('bbbbbbbb-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Sales Executive', 'CRM sales team')
ON CONFLICT ON CONSTRAINT roles_unique_per_company DO NOTHING;

-- =====================================================
-- SECTION 3: ROLE PERMISSIONS
-- =====================================================

-- General Manager (ABC PLC) - Full access to CRM, HR, Fleet
INSERT INTO role_permissions (role_id, module, action) VALUES
  -- CRM permissions
  ('aaaaaaaa-1111-1111-1111-111111111111', 'crm', 'view'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'crm', 'create'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'crm', 'edit'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'crm', 'delete'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'crm', 'export'),
  -- HR permissions
  ('aaaaaaaa-1111-1111-1111-111111111111', 'hr', 'view'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'hr', 'create'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'hr', 'edit'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'hr', 'delete'),
  -- Fleet permissions
  ('aaaaaaaa-1111-1111-1111-111111111111', 'fleet', 'view'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'fleet', 'create'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'fleet', 'edit'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'fleet', 'delete'),
  -- Inventory permissions
  ('aaaaaaaa-1111-1111-1111-111111111111', 'inventory', 'view'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'inventory', 'create'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'inventory', 'edit')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- HR Manager (ABC PLC) - Full HR access
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('aaaaaaaa-2222-2222-2222-222222222222', 'hr', 'view'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'hr', 'create'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'hr', 'edit'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'hr', 'delete'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'hr', 'export')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- CRM Manager (ABC PLC) - Full CRM access
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('aaaaaaaa-3333-3333-3333-333333333333', 'crm', 'view'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'crm', 'create'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'crm', 'edit'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'crm', 'delete'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'crm', 'export')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- HR Supervisor (ABC PLC) - HR view only
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('aaaaaaaa-4444-4444-4444-444444444444', 'hr', 'view')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Driver (ABC PLC) - Fleet view only
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('aaaaaaaa-5555-5555-5555-555555555555', 'fleet', 'view')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Sales Executive (ABC PLC) - CRM view and create
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('aaaaaaaa-6666-6666-6666-666666666666', 'crm', 'view'),
  ('aaaaaaaa-6666-6666-6666-666666666666', 'crm', 'create')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- XYZ Trading - General Manager (full access)
INSERT INTO role_permissions (role_id, module, action) VALUES
  -- CRM
  ('bbbbbbbb-1111-1111-1111-111111111111', 'crm', 'view'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'crm', 'create'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'crm', 'edit'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'crm', 'delete'),
  -- HR
  ('bbbbbbbb-1111-1111-1111-111111111111', 'hr', 'view'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'hr', 'create'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'hr', 'edit'),
  -- Fleet
  ('bbbbbbbb-1111-1111-1111-111111111111', 'fleet', 'view'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'fleet', 'create'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'fleet', 'edit')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- XYZ Trading - HR Manager
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('bbbbbbbb-2222-2222-2222-222222222222', 'hr', 'view'),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'hr', 'create'),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'hr', 'edit')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- XYZ Trading - Fleet Manager
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('bbbbbbbb-3333-3333-3333-333333333333', 'fleet', 'view'),
  ('bbbbbbbb-3333-3333-3333-333333333333', 'fleet', 'create'),
  ('bbbbbbbb-3333-3333-3333-333333333333', 'fleet', 'edit'),
  ('bbbbbbbb-3333-3333-3333-333333333333', 'fleet', 'delete')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- XYZ Trading - Sales Executive
INSERT INTO role_permissions (role_id, module, action) VALUES
  ('bbbbbbbb-4444-4444-4444-444444444444', 'crm', 'view'),
  ('bbbbbbbb-4444-4444-4444-444444444444', 'crm', 'create')
ON CONFLICT (role_id, module, action) DO NOTHING;

-- =====================================================
-- SECTION 4: SAMPLE BUSINESS DATA (Optional)
-- =====================================================

-- Note: Cannot insert sample users without actual auth.users records
-- To test with real users:
-- 1. Sign up users via Supabase Auth
-- 2. Use handle_user_invitation() to link them to companies
-- 3. Create sample projects, employees, etc.

-- Sample comment for guidance:
COMMENT ON TABLE companies IS 
  'After seeding: 
   1. Create users via Supabase Auth UI or API
   2. Use handle_user_invitation(user_id, company_id, role_id, position) to link users
   3. Users will automatically get permissions based on their role';
