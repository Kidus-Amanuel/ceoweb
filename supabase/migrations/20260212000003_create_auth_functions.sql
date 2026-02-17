-- =====================================================
-- Migration: Authentication Integration & Helper Functions
-- Description: Functions and triggers for Supabase Auth integration,
--              user profile creation, and additional utility functions
-- Version: 1.0.0
-- Date: 2026-02-12
-- =====================================================

-- =====================================================
-- SECTION 1: AUTH INTEGRATION FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: handle_new_user
-- Purpose: Automatically create profile when user signs up or is invited
-- Trigger: After INSERT on auth.users
-- Notes: This handles both:
--        1. Direct sign-ups (creates super_admin if first user)
--        2. Invited users (uses company_id from invite metadata)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_role_id UUID;
  v_user_type public.user_type;
  v_meta_user_type TEXT;
BEGIN
  -- 1. Extract Metadata (Handling both snake_case and camelCase)
  v_company_id := COALESCE(
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    (NEW.raw_user_meta_data->>'companyId')::UUID
  );
  v_role_id := COALESCE(
    (NEW.raw_user_meta_data->>'role_id')::UUID,
    (NEW.raw_user_meta_data->>'roleId')::UUID
  );
  v_meta_user_type := COALESCE(
    NEW.raw_user_meta_data->>'user_type',
    NEW.raw_user_meta_data->>'userType'
  );
  
  -- 2. Determine user type
  -- Priority: 
  --   A. Explicitly set in metadata
  --   B. If company_id is present -> 'company_user'
  --   C. Default to 'super_admin' (onboarding flow)
  IF v_meta_user_type IS NOT NULL THEN
    v_user_type := v_meta_user_type::public.user_type;
  ELSIF v_company_id IS NOT NULL THEN
    v_user_type := 'company_user'::public.user_type;
  ELSE
    v_user_type := 'super_admin'::public.user_type;
  END IF;
  
  -- 3. Create the profile
  INSERT INTO public.profiles (
    id, 
    company_id, 
    user_type,
    full_name,
    status,
    onboarding
  ) VALUES (
    NEW.id,
    v_company_id,
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'active'::public.user_status,
    -- Invited company_users are considered "onboarded" once they sign up
    -- because their organization context is already set.
    (v_user_type = 'company_user')
  );

  -- 4. If invited/joined with context, link to company and role
  IF v_company_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO public.company_users (
      user_id,
      company_id,
      role_id,
      status,
      position
    ) VALUES (
      NEW.id,
      v_company_id,
      v_role_id,
      'active',
      COALESCE(NEW.raw_user_meta_data->>'position', NEW.raw_user_meta_data->>'role_name', NEW.raw_user_meta_data->>'roleName')
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Auto-creates profile for new auth.users, handles invitations via metadata';

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------
-- FUNCTION: handle_user_invitation
-- Purpose: Creates company_users record when user accepts invitation
-- Notes: This should be called after profile is created
--        It links the user to company and assigns role
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION handle_user_invitation(
  p_user_id UUID,
  p_company_id UUID,
  p_role_id UUID,
  p_position TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_user_id UUID;
BEGIN
  -- Verify the role belongs to the company
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE id = p_role_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Role does not belong to the specified company';
  END IF;
  
  -- Create company_users record
  INSERT INTO company_users (
    user_id,
    company_id,
    role_id,
    position,
    status
  ) VALUES (
    p_user_id,
    p_company_id,
    p_role_id,
    p_position,
    'active'
  )
  RETURNING id INTO v_company_user_id;
  
  -- Update profile with company_id if not set
  UPDATE profiles
  SET company_id = p_company_id
  WHERE id = p_user_id AND company_id IS NULL;
  
  RETURN v_company_user_id;
END;
$$;

COMMENT ON FUNCTION handle_user_invitation IS 'Links invited user to company with role assignment';

-- =====================================================
-- SECTION 2: PERMISSION MANAGEMENT FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: get_user_permissions
-- Purpose: Returns all permissions for current user as JSON array
-- Used in: Frontend to build permission state
-- Returns: [{"module": "crm", "action": "view"}, ...]
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'module', rp.module,
        'action', rp.action
      )
    ),
    '[]'::json
  )
  FROM company_users cu
  JOIN role_permissions rp ON rp.role_id = cu.role_id
  WHERE cu.user_id = auth.uid()
    AND cu.status = 'active';
$$;

COMMENT ON FUNCTION get_user_permissions IS 'Returns all permissions for current user as JSON array';

-- -----------------------------------------------------
-- FUNCTION: get_user_role_info
-- Purpose: Returns complete role info for current user
-- Used in: Frontend dashboard, profile display
-- Returns: JSON with role name, company, permissions
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role_info()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'user_id', cu.user_id,
    'company_id', cu.company_id,
    'company_name', c.name,
    'role_id', r.id,
    'role_name', r.name,
    'position', cu.position,
    'status', cu.status,
    'user_type', p.user_type,
    'permissions', get_user_permissions()
  )
  FROM company_users cu
  JOIN roles r ON r.id = cu.role_id
  JOIN companies c ON c.id = cu.company_id
  JOIN profiles p ON p.id = cu.user_id
  WHERE cu.user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_role_info IS 'Returns complete role and permission info for current user';

-- -----------------------------------------------------
-- FUNCTION: assign_role_permissions
-- Purpose: Bulk assign permissions to a role
-- Used in: Role creation/management
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION assign_role_permissions(
  p_role_id UUID,
  p_permissions JSON  -- [{"module": "crm", "action": "view"}, ...]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permission JSON;
  v_count INTEGER := 0;
BEGIN
  -- Verify role exists and user has access to it
  IF NOT EXISTS (
    SELECT 1 FROM roles 
    WHERE id = p_role_id 
    AND (
      company_id = get_user_company_id() 
      OR get_user_type() = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Role not found or access denied';
  END IF;
  
  -- Insert permissions (ON CONFLICT DO NOTHING handles duplicates)
  FOR v_permission IN SELECT * FROM json_array_elements(p_permissions)
  LOOP
    INSERT INTO role_permissions (role_id, module, action)
    VALUES (
      p_role_id,
      v_permission->>'module',
      v_permission->>'action'
    )
    ON CONFLICT (role_id, module, action) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION assign_role_permissions IS 'Bulk assign permissions to a role from JSON array';

-- =====================================================
-- SECTION 3: UTILITY FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: is_company_owner
-- Purpose: Check if current user is owner of a company
-- Used in: Permission checks, UI rendering
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION is_company_owner(p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM companies 
    WHERE id = COALESCE(p_company_id, get_user_company_id())
      AND owner_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_company_owner IS 'Check if current user owns the specified company';

-- -----------------------------------------------------
-- FUNCTION: get_company_stats
-- Purpose: Returns statistics for a company
-- Used in: Dashboard, analytics
-- Returns: JSON with counts of users, roles, etc.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_company_stats(p_company_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'total_users', (
      SELECT COUNT(*) FROM company_users 
      WHERE company_id = COALESCE(p_company_id, get_user_company_id())
    ),
    'active_users', (
      SELECT COUNT(*) FROM company_users 
      WHERE company_id = COALESCE(p_company_id, get_user_company_id())
        AND status = 'active'
    ),
    'total_roles', (
      SELECT COUNT(*) FROM roles 
      WHERE company_id = COALESCE(p_company_id, get_user_company_id())
    ),
    'total_projects', (
      SELECT COUNT(*) FROM projects 
      WHERE company_id = COALESCE(p_company_id, get_user_company_id())
    ),
    'total_employees', (
      SELECT COUNT(*) FROM employees 
      WHERE company_id = COALESCE(p_company_id, get_user_company_id())
    )
  );
$$;

COMMENT ON FUNCTION get_company_stats IS 'Returns statistics for a company (users, roles, projects, etc.)';

-- =====================================================
-- SECTION 4: VALIDATION FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: validate_company_access
-- Purpose: Validates that a user can access a specific resource
-- Used in: Application-level permission checks
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validate_company_access(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_sql TEXT;
BEGIN
  -- Super admins always have access
  IF get_user_type() = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Build dynamic query to check company_id
  v_sql := format(
    'SELECT company_id FROM %I WHERE id = $1',
    p_table_name
  );
  
  EXECUTE v_sql INTO v_company_id USING p_record_id;
  
  -- Check if record's company matches user's company
  RETURN v_company_id = get_user_company_id();
END;
$$;

COMMENT ON FUNCTION validate_company_access IS 'Validates user can access a resource in specified table';

-- =====================================================
-- SECTION 5: AUDIT LOGGING (OPTIONAL)
-- =====================================================

-- -----------------------------------------------------
-- TABLE: audit_logs (Optional - for tracking changes)
-- Purpose: Track all important changes in the system
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT audit_logs_valid_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail of all important data changes';

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view audit logs for their company
CREATE POLICY "AuditLogs: company_user can view own company logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR get_user_type() = 'super_admin'
  );

-- Only system can insert audit logs (no direct user inserts)
CREATE POLICY "AuditLogs: system only inserts"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- No one can insert directly via SQL

-- -----------------------------------------------------
-- FUNCTION: log_audit
-- Purpose: Helper function to create audit log entries
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  ) VALUES (
    get_user_company_id(),
    auth.uid(),
    p_table_name,
    p_record_id,
    p_action,
    p_old_data,
    p_new_data
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION log_audit IS 'Creates audit log entry for tracking changes';
