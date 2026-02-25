-- =============================================================================
-- MIGRATION: TRACCAR FLEET INTEGRATION MAPPINGS
-- =============================================================================

-- Set search path to include public and extensions
SELECT set_config('search_path', 'public, extensions', false);

-- 1. Traccar Tenant Mapping
-- Maps an ERP Company to a Traccar User (acting as a tenant/manager)
CREATE TABLE IF NOT EXISTS traccar_tenant_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    traccar_user_id INTEGER NOT NULL UNIQUE,
    api_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_traccar_tenant_company ON traccar_tenant_mappings(company_id);

-- 2. Traccar Device Mapping
-- Maps an ERP Vehicle to a Traccar Device
CREATE TABLE IF NOT EXISTS traccar_device_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    erp_vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    traccar_device_id INTEGER NOT NULL UNIQUE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, erp_vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_traccar_device_company ON traccar_device_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_traccar_device_vehicle ON traccar_device_mappings(erp_vehicle_id);

-- 3. Add GPS caching to vehicles (for offline summary & AI agent access)
DO $$ BEGIN
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10,8);
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(11,8);
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ignition_status BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null; END $$;


-- =============================================================================
-- TRIGGERS & RLS FOR NEW MAPPING TABLES
-- =============================================================================

-- Auto-update updated_at trigger
DO $$ DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'traccar_tenant_mappings', 'traccar_device_mappings'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;


-- Enable RLS
ALTER TABLE traccar_tenant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE traccar_device_mappings ENABLE ROW LEVEL SECURITY;

-- Helper to create policy if not exists (handles USING vs WITH CHECK correctly)
CREATE OR REPLACE FUNCTION _internal_create_policy_if_not_exists(
    p_policy_name text,
    p_table_name text,
    p_command text,   -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    p_using text DEFAULT NULL,
    p_check text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $func$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = p_policy_name AND tablename = p_table_name) THEN
        IF p_command IN ('SELECT', 'DELETE') THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)',
                           p_policy_name, p_table_name, p_command, p_using);
        ELSIF p_command = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated WITH CHECK (%s)',
                           p_policy_name, p_table_name, p_command, p_check);
        ELSIF p_command = 'UPDATE' THEN
            IF p_check IS NULL THEN p_check := p_using; END IF;
            EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
                           p_policy_name, p_table_name, p_command, p_using, p_check);
        END IF;
    END IF;
END;
$func$;

-- Adding Policies (same permissions as fleet module)
DO $poly$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['traccar_tenant_mappings', 'traccar_device_mappings'] LOOP
        PERFORM _internal_create_policy_if_not_exists(t || '_select', t, 'SELECT', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''view''))');
        PERFORM _internal_create_policy_if_not_exists(t || '_insert', t, 'INSERT', NULL, 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''create''))');
        PERFORM _internal_create_policy_if_not_exists(t || '_update', t, 'UPDATE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''edit''))');
        PERFORM _internal_create_policy_if_not_exists(t || '_delete', t, 'DELETE', 'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''fleet'', ''delete''))');
    END LOOP;
END $poly$;

DROP FUNCTION IF EXISTS _internal_create_policy_if_not_exists(text, text, text, text, text);
