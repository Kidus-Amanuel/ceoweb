-- =============================================================================
-- ERP FILE STORAGE SYSTEM MIGRATION
-- =============================================================================

-- 1. Create Storage Bucket for ERP Files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'erp-files', 
    'erp-files', 
    false, -- Private bucket, access controlled by RLS
    52428800, -- 50MB limit
    '{image/*,application/pdf,application/zip,application/x-zip-compressed,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Attachments Tracking Table (Global)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Link to the parent record
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    
    -- File details
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path within the 'erp-files' bucket
    file_type TEXT,
    file_size BIGINT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attachments_company ON attachments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_link ON attachments(table_name, record_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id) WHERE deleted_at IS NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Attachments Table
CREATE POLICY "Users can view attachments of their company" ON attachments
    FOR SELECT USING (company_id = get_current_company_id());

CREATE POLICY "Users can insert attachments for their company" ON attachments
    FOR INSERT WITH CHECK (company_id = get_current_company_id());

CREATE POLICY "Users can update their own company's attachments" ON attachments
    FOR UPDATE USING (company_id = get_current_company_id());

CREATE POLICY "Users can delete their own company's attachments" ON attachments
    FOR DELETE USING (company_id = get_current_company_id());

-- 6. Storage Bucket RLS Policies
-- NOTE: In Supabase, bucket policies are applied to storage.objects

-- Policy for SELECT (View)
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'erp-files' AND 
    (name LIKE (SELECT company_id::text FROM profiles WHERE id = auth.uid()) || '/%')
);

-- Policy for INSERT (Upload)
CREATE POLICY "Users can upload their company files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'erp-files' AND 
    (name LIKE (SELECT company_id::text FROM profiles WHERE id = auth.uid()) || '/%')
);

-- Policy for UPDATE
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'erp-files' AND 
    (name LIKE (SELECT company_id::text FROM profiles WHERE id = auth.uid()) || '/%')
);

-- Policy for DELETE
CREATE POLICY "Users can delete their company files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'erp-files' AND 
    (name LIKE (SELECT company_id::text FROM profiles WHERE id = auth.uid()) || '/%')
);

-- 7. Add trigger for updated_at
CREATE TRIGGER trg_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Add Audit Logging
CREATE TRIGGER trg_audit_attachments
    AFTER INSERT OR UPDATE OR DELETE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();
