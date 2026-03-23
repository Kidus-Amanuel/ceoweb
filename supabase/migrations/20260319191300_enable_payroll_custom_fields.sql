-- =============================================================================
-- ENABLING CUSTOM FIELDS FOR PAYROLL
-- =============================================================================

-- Add custom_fields to payroll_runs to support dynamic HR attributes
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

-- Add custom_fields to payslips for granular metadata
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

-- Since the user also provided the schema for payslips in previous steps, 
-- let's ensure other consistency triggers or indices if needed,
-- but focusing on custom_fields for virtual columns feature.

-- Trigger for update_at on payroll_runs (ensuring it exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payroll_runs_updated_at') THEN
        CREATE TRIGGER update_payroll_runs_updated_at 
        BEFORE UPDATE ON public.payroll_runs 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Trigger for update_at on payslips
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payslips_updated_at') THEN
        CREATE TRIGGER update_payslips_updated_at 
        BEFORE UPDATE ON public.payslips 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
