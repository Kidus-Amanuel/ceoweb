-- =====================================================
-- DOCUMENSO SIGNING MODULE MIGRATION v1.0
-- Integration: ERP v4.0 (RLS + Multi-tenant)
-- =====================================================

-- 1. Register Module
INSERT INTO public.modules (name, display_name, description)
VALUES ('signatures', 'Document Signing', 'Digital signatures and document tracking powered by Documenso')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Signing Table
CREATE TABLE IF NOT EXISTS public.document_signing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Documenso Tracking
    envelope_id TEXT UNIQUE, -- Documenso Envelope ID
    
    -- ERP Context
    module_name TEXT REFERENCES modules(name) ON DELETE SET NULL, -- 'hr', 'crm', etc.
    record_id UUID NOT NULL, -- ID of the target record (e.g. employee_id, deal_id)
    
    -- Status and Data
    title TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, PENDING, COMPLETED, REJECTED, EXPIRED
    document_url TEXT, -- Final signed PDF URL
    raw_response JSONB DEFAULT '{}', -- Store full Documenso API response if needed
    
    -- Timestamps
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_doc_sign_company ON public.document_signing(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_sign_record ON public.document_signing(module_name, record_id);
CREATE INDEX IF NOT EXISTS idx_doc_sign_envelope ON public.document_signing(envelope_id);

-- 4. Enable RLS
ALTER TABLE public.document_signing ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function for Triggers (if not exists)
-- (Assuming this is already in core schema but adding check for safety)

-- 6. Apply Updated_At Trigger
DO $$ BEGIN
    CREATE TRIGGER update_document_signing_updated_at 
    BEFORE UPDATE ON public.document_signing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Apply Audit Logging
DO $$ BEGIN
    CREATE TRIGGER audit_document_signing 
    AFTER INSERT OR UPDATE OR DELETE ON public.document_signing 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Apply RLS Policies (Using existing ERP helper)
DO $$
BEGIN
    PERFORM create_policy_if_not_exists(
        'document_signing_select', 'document_signing', 'SELECT',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''signatures'', ''view''))'
    );
    PERFORM create_policy_if_not_exists(
        'document_signing_insert', 'document_signing', 'INSERT',
        NULL,
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''signatures'', ''create''))'
    );
    PERFORM create_policy_if_not_exists(
        'document_signing_update', 'document_signing', 'UPDATE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''signatures'', ''edit''))',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''signatures'', ''edit''))'
    );
    PERFORM create_policy_if_not_exists(
        'document_signing_delete', 'document_signing', 'DELETE',
        'get_current_user_type() = ''super_admin'' OR (company_id = get_current_company_id() AND has_permission(''signatures'', ''delete''))'
    );
END $$;

-- 9. Comments
COMMENT ON TABLE public.document_signing IS 'Stores metadata for document signing requests sent to Documenso.';
COMMENT ON COLUMN public.document_signing.module_name IS 'The ERP module initiating the signature (e.g. hr, crm).';
COMMENT ON COLUMN public.document_signing.record_id IS 'The ID of the specific record being signed (Employee, Customer, Deal).';
