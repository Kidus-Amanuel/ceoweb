-- =====================================================
-- Migration: Automated Employee Creation
-- Description: Automatically creates an employee record when a user 
--              is linked to a company in the company_users table.
-- =====================================================

-- 1. Create a sequence for employee numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 10001;

-- 1b. Ensure employees table has status column (needed for trigger)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';

-- 2. Refine the existing validate_employee_profile function
-- Original function in 20260212000002_create_business_tables.sql
-- was too restrictive for super_admin multi-tenancy.
CREATE OR REPLACE FUNCTION validate_employee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_type user_type;
    v_profile_company_id UUID;
BEGIN
    SELECT user_type, company_id INTO v_user_type, v_profile_company_id 
    FROM profiles 
    WHERE id = NEW.profile_id;

    -- If it's a regular company_user, profiles.company_id must match employees.company_id
    IF v_user_type = 'company_user' THEN
        IF v_profile_company_id != NEW.company_id THEN
             RAISE EXCEPTION 'Profile % belongs to company %, but employee record is for company %', 
                NEW.profile_id, v_profile_company_id, NEW.company_id;
        END IF;
    END IF;

    -- For super_admin, profiles.company_id is NULL, which is fine since they can be in multiple companies.
    -- We just need to ensure the profile exists (which the foreign key does).

    RETURN NEW;
END;
$$;

-- 3. Create composite unique index on employees if not already there
-- This prevents a user from having multiple employee records in the same company
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_profile_company_unique;
ALTER TABLE employees ADD CONSTRAINT employees_profile_company_unique UNIQUE (profile_id, company_id);

-- 4. Create trigger function for automatic employee sync
CREATE OR REPLACE FUNCTION sync_company_user_to_employee()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_exists BOOLEAN;
BEGIN
    -- Check if employee record already exists for this profile in this company
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
            position,
            hire_date,
            status -- Added status if needed, though employees table uses default
        ) VALUES (
            NEW.company_id,
            NEW.user_id,
            'EMP-' || nextval('employee_number_seq')::TEXT,
            NEW.position,
            CURRENT_DATE,
            'active' 
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach sync trigger to company_users
DROP TRIGGER IF EXISTS trg_sync_company_user_to_employee ON company_users;
CREATE TRIGGER trg_sync_company_user_to_employee
    AFTER INSERT OR UPDATE ON company_users
    FOR EACH ROW
    EXECUTE FUNCTION sync_company_user_to_employee();

COMMENT ON FUNCTION sync_company_user_to_employee IS 'Automates employee record creation when a user is assigned to a company.';
