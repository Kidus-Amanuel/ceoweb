-- =============================================================================
-- PERFORMANCE INDEXES FOR FLEET VEHICLES
-- =============================================================================

-- 1. Index for company isolation and deletion filter (Common in almost all queries)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_deleted ON vehicles (company_id, deleted_at) WHERE deleted_at IS NULL;

-- 2. Index for searching by identity (vehicle_number, license_plate)
-- Using gin trgm or just btree if we use exact or prefix. ilike %...% benefits from trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_vehicles_search_trgm ON vehicles USING gin (
    (vehicle_number || ' ' || license_plate || ' ' || COALESCE(make, '') || ' ' || COALESCE(model, '')) gin_trgm_ops
);

-- 3. Index for sorting (created_at desc)
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles (company_id, created_at DESC) WHERE deleted_at IS NULL;

-- 4. Index for status filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (company_id, status) WHERE deleted_at IS NULL;

-- 5. Index for driver assignment
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON vehicles (assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
