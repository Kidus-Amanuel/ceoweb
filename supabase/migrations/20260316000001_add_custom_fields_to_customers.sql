-- Add custom fields column to customers table
ALTER TABLE IF EXISTS customers
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Create index for custom fields
CREATE INDEX IF NOT EXISTS idx_customers_custom_fields
  ON customers
  USING GIN (custom_fields)
  WHERE deleted_at IS NULL;
