-- =====================================================
-- Migration: Add Department to Roles
-- Description: Adds a department column to the roles table and 
--              updates the employee sync trigger to use it.
-- =====================================================

-- 1. Add department column to roles
-- We use the existing department_type enum
ALTER TABLE roles ADD COLUMN IF NOT EXISTS department department_type;

COMMENT ON COLUMN roles.department IS 'The department/module this role primarily belongs to';

-- 2. Update the sync trigger function to include department
CREATE OR REPLACE FUNCTION sync_company_user_to_employee()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_exists BOOLEAN;
    v_role_department department_type;
BEGIN
    -- Get the department from the assigned role
    SELECT department INTO v_role_department
    FROM roles
    WHERE id = NEW.role_id;

    -- Check if employee record already exists
    SELECT EXISTS (
        SELECT 1 FROM employees 
        WHERE profile_id = NEW.user_id 
        AND company_id = NEW.company_id
    ) INTO v_employee_exists;

    -- If not exists, create it
    IF NOT v_employee_exists THEN
        INSERT INTO employees (
            company_id,
            profile_id,
            employee_number,
            department, -- Now including department
            position,
            hire_date,
            status
        ) VALUES (
            NEW.company_id,
            NEW.user_id,
            'EMP-' || nextval('employee_number_seq')::TEXT,
            v_role_department,
            NEW.position,
            CURRENT_DATE,
            'active' 
        );
    ELSE
        -- If it exists, update it (useful if role/position changes)
        UPDATE employees
        SET 
            position = NEW.position,
            department = v_role_department,
            updated_at = NOW()
        WHERE profile_id = NEW.user_id 
        AND company_id = NEW.company_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
