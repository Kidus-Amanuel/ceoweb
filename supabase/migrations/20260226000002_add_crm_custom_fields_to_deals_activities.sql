-- Ensure CRM custom field payload storage exists on all CRM entities.
ALTER TABLE IF EXISTS deals
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS activities
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_deals_custom_fields
  ON deals
  USING GIN (custom_fields)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_custom_fields
  ON activities
  USING GIN (custom_fields)
  WHERE deleted_at IS NULL;
