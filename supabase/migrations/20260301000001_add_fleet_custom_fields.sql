-- Add custom_fields to Fleet tables
ALTER TABLE driver_assignments ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Create GIN indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_assignments_custom_fields ON driver_assignments USING GIN (custom_fields) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_custom_fields ON vehicle_maintenance USING GIN (custom_fields) WHERE deleted_at IS NULL;
