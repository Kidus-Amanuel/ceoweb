-- Migration: Fix Roles and Permissions Schema
-- Date: 2026-03-19

DO $$ 
BEGIN
    -- 1. Create role table if it doesn't exist (unlikely but safe)
    -- But since we know it exists, let's just modify it.

    -- Add custom_fields to roles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'custom_fields') THEN
        ALTER TABLE roles ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Modify department column
    -- If it's already UUID, we don't need to do much.
    -- But we need to ensure the foreign key is there.
    -- We can check the data type
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'department') <> 'uuid' THEN
        ALTER TABLE roles ALTER COLUMN department TYPE UUID USING (CASE WHEN department ~ '^[0-9a-fA-F-]{36}$' THEN department::UUID ELSE NULL END);
    END IF;

    -- Add foreign key constraint for department
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'roles_department_fkey') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_department_fkey FOREIGN KEY (department) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;

    -- 3. Update Role Permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'updated_at') THEN
        ALTER TABLE role_permissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

END $$;

-- 4. Triggers (idempotent because of DROP TRIGGER)
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at 
    BEFORE UPDATE ON role_permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
