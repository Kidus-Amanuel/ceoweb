-- Relax profiles_company_user_has_company constraint
-- This allows super_admin users to have a company_id (e.g. after onboarding)

-- First add onboarding column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding') THEN
        ALTER TABLE profiles ADD COLUMN onboarding BOOLEAN DEFAULT false;
    END IF;
END $$;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_company_user_has_company;

ALTER TABLE profiles ADD CONSTRAINT profiles_company_user_has_company CHECK (
    (user_type = 'company_user' AND company_id IS NOT NULL) OR
    (user_type = 'super_admin')
);

COMMENT ON CONSTRAINT profiles_company_user_has_company ON profiles IS 'Ensures company_users have a company, but allows super_admins to have one or not.';

