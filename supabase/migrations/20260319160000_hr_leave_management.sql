-- =============================================================================
-- HR LEAVE MANAGEMENT SCHEMA
-- =============================================================================

-- 1. LEAVE TYPES (CATEGORIES)
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  paid BOOLEAN DEFAULT TRUE,
  days_per_year INTEGER,
  carry_over BOOLEAN DEFAULT FALSE,
  custom_fields JSONB DEFAULT '{}'::JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leave_types_pkey PRIMARY KEY (id),
  CONSTRAINT leave_types_company_id_name_key UNIQUE (company_id, name),
  CONSTRAINT leave_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE
);

-- Indices for leave_types
CREATE INDEX IF NOT EXISTS idx_leave_types_company ON public.leave_types (company_id) WHERE (deleted_at IS NULL);

-- Trigger for update_at
DROP TRIGGER IF EXISTS update_leave_types_updated_at ON public.leave_types;
CREATE TRIGGER update_leave_types_updated_at 
  BEFORE UPDATE ON public.leave_types 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. LEAVE RECORDS
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_taken NUMERIC(5, 2) NOT NULL,
  reason TEXT,
  status public.leave_status DEFAULT 'pending'::public.leave_status,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  custom_fields JSONB DEFAULT '{}'::JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leaves_pkey PRIMARY KEY (id),
  CONSTRAINT leaves_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT leaves_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE,
  CONSTRAINT leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees (id) ON DELETE CASCADE,
  CONSTRAINT leaves_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types (id) ON DELETE RESTRICT,
  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);

-- Indices for leaves
CREATE INDEX IF NOT EXISTS idx_leaves_company ON public.leaves (company_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON public.leaves (employee_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves (status) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leaves (start_date, end_date) WHERE (deleted_at IS NULL);

-- Trigger for update_at
DROP TRIGGER IF EXISTS update_leaves_updated_at ON public.leaves;
CREATE TRIGGER update_leaves_updated_at 
  BEFORE UPDATE ON public.leaves 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 3.1 LEAVE TYPES POLICIES
-- Policy: Allow everyone in the same company to view leave categories
DROP POLICY IF EXISTS "Users can view company leave types" ON public.leave_types;
CREATE POLICY "Users can view company leave types"
ON public.leave_types FOR SELECT
TO authenticated
USING (company_id = public.get_current_company_id());

-- Policy: Allow admins/managers to manage categories
DROP POLICY IF EXISTS "Admins can manage company leave types" ON public.leave_types;
CREATE POLICY "Admins can manage company leave types"
ON public.leave_types FOR ALL
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND (
      public.get_current_user_type() = 'super_admin' 
      OR EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.user_id = auth.uid() 
        AND cu.company_id = public.get_current_company_id() 
        AND cu.status = 'active'
      )
    )
)
WITH CHECK (company_id = public.get_current_company_id());

-- 3.2 LEAVE RECORDS POLICIES
-- Policy: Allow employees to view their own leave requests
DROP POLICY IF EXISTS "Employees can view their own leaves" ON public.leaves;
CREATE POLICY "Employees can view their own leaves"
ON public.leaves FOR SELECT
TO authenticated
USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- Policy: Allow managers/admins to see all company leaves
DROP POLICY IF EXISTS "Managers can view all company leaves" ON public.leaves;
CREATE POLICY "Managers can view all company leaves"
ON public.leaves FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_type() IN ('super_admin', 'company_user')
);

-- Policy: Allow users to submit their own leave
DROP POLICY IF EXISTS "Users can submit their own leaves" ON public.leaves;
CREATE POLICY "Users can submit their own leaves"
ON public.leaves FOR INSERT
TO authenticated
WITH CHECK (
    company_id = public.get_current_company_id()
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- Policy: Allow managers to manage all company leave records
DROP POLICY IF EXISTS "Admins can manage all company leave records" ON public.leaves;
CREATE POLICY "Admins can manage all company leave records"
ON public.leaves FOR ALL
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND (
      public.get_current_user_type() = 'super_admin'
      OR EXISTS (
          SELECT 1 FROM public.company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.company_id = public.get_current_company_id() 
          AND cu.status = 'active'
      )
    )
);

-- 4. ADDITIONAL POSITIONS CONFIGURATION
-- Add custom_fields to positions to support dynamic HR attributes
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

-- 5. ROLES & PERMISSIONS ENHANCEMENT
-- Add custom_fields to roles to support dynamic HR attributes
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

-- RLS for Roles (Ensuring they are enabled and have company isolation)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view company roles" ON public.roles;
CREATE POLICY "Users can view company roles" ON public.roles FOR SELECT TO authenticated
USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Admins can manage company roles" ON public.roles;
CREATE POLICY "Admins can manage company roles" ON public.roles FOR ALL TO authenticated
USING (company_id = public.get_current_company_id())
WITH CHECK (company_id = public.get_current_company_id());

-- RLS for Role Permissions
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view company role permissions" ON public.role_permissions;
CREATE POLICY "Users can view company role permissions" ON public.role_permissions FOR SELECT TO authenticated
USING (role_id IN (SELECT id FROM public.roles WHERE company_id = public.get_current_company_id()));

DROP POLICY IF EXISTS "Admins can manage company role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage company role permissions" ON public.role_permissions FOR ALL TO authenticated
USING (role_id IN (SELECT id FROM public.roles WHERE company_id = public.get_current_company_id()));
