-- =====================================================
-- Migration: Relax company_users constraint for super_admin
-- Description: Allows super_admin to have multiple companies while
--              enforcing single-company limit for company_user.
-- =====================================================

-- 1. Drop the existing single-company constraint
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_user_unique;

-- 2. Add composite unique constraint to prevent duplicate roles in the same company
-- (Users can be in multiple companies, but only once per company)
ALTER TABLE company_users ADD CONSTRAINT company_users_user_company_unique UNIQUE (user_id, company_id);

-- 3. Create trigger function to enforce single-company rule for regular users
CREATE OR REPLACE FUNCTION enforce_single_company_for_regular_users()
RETURNS TRIGGER AS $$
DECLARE
    v_user_type user_type;
    v_company_count INTEGER;
BEGIN
    -- Get user type from profiles
    SELECT user_type INTO v_user_type FROM profiles WHERE id = NEW.user_id;

    -- If user is a company_user, check if they already have a company association
    IF v_user_type = 'company_user' THEN
        SELECT count(*) INTO v_company_count FROM company_users WHERE user_id = NEW.user_id AND id != NEW.id;
        
        IF v_company_count > 0 THEN
            RAISE EXCEPTION 'Regular company users can only be associated with one company.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply trigger to company_users table
DROP TRIGGER IF EXISTS trg_enforce_single_company ON company_users;
CREATE TRIGGER trg_enforce_single_company
    BEFORE INSERT OR UPDATE ON company_users
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_company_for_regular_users();

COMMENT ON FUNCTION enforce_single_company_for_regular_users IS 'Enforces that only super_admin can have multiple company associations in company_users table.';
