-- =============================================================================
-- HR MODULE NOTIFICATION FIXES
-- Fixes NULL name concatenation and improves role targeting for all HR notification triggers
-- =============================================================================

-- 1. IMPROVED HELPER FUNCTION TO GET HR MANAGERS
-- Prioritizes high-level management roles and handles multiple role possibilities
CREATE OR REPLACE FUNCTION get_hr_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Priority 1: Look for a role that has 'hr' 'manage' or 'approve' permission
    -- Sorting by action priority ensures we pick the most appropriate role if multiple exist
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'hr'
      AND rp.action IN ('manage', 'approve', 'delete', 'edit')
    ORDER BY 
        CASE 
            WHEN rp.action = 'manage' THEN 1 
            WHEN rp.action = 'approve' THEN 2 
            ELSE 3 
        END ASC
    LIMIT 1;

    -- Note: If this still returns NULL, the triggers will default to 'company' scope
    RETURN v_role_id;
END;
$$;


-- 2. UPDATED TRIGGER FUNCTION FOR LEAVES (NULL-SAFE)
CREATE OR REPLACE FUNCTION trg_notify_on_leave_change()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT := 'An employee';
    v_employee_user_id UUID;
    v_role_id UUID;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    
    -- Safe extraction with COALESCE to prevent NULL strings breaking notifications
    BEGIN
        SELECT 
            COALESCE(first_name, 'Unknown') || ' ' || COALESCE(last_name, 'Employee'), 
            user_id 
        INTO v_employee_name, v_employee_user_id 
        FROM employees 
        WHERE id = v_record.employee_id;
    EXCEPTION WHEN OTHERS THEN
        v_employee_name := 'Unknown Employee';
    END;
    
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Leave Request', v_employee_name || ' has submitted a new leave request.', jsonb_build_object('leave_id', v_record.id, 'employee_id', v_record.employee_id, 'type', 'leave_request'));
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF v_employee_user_id IS NOT NULL THEN
                INSERT INTO notifications (company_id, actor_id, category, scope, target_user_id, title, content, metadata)
                VALUES (NEW.company_id, auth.uid(), 'hr', 'user', v_employee_user_id, 'Leave Request ' || INITCAP(NEW.status), 'Your leave request starting ' || NEW.start_date || ' has been ' || NEW.status || '.', jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'type', 'leave_status_update'));
            END IF;
        ELSIF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (to_jsonb(OLD)->>'deleted_at' IS NULL AND to_jsonb(NEW)->>'deleted_at' IS NOT NULL) THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Request Cancelled', v_employee_name || '''s leave request has been cancelled.', jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id, 'type', 'leave_cancelled'));
        ELSE
            -- Treat as Edit
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Request Updated', v_employee_name || '''s leave request has been updated.', jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id, 'type', 'leave_updated'));
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Request Deleted', v_employee_name || '''s leave request was permanently deleted.', jsonb_build_object('leave_id', OLD.id, 'employee_id', OLD.employee_id, 'type', 'leave_deleted'));
    END IF;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. UPDATED TRIGGER FUNCTION FOR EMPLOYEES (NULL-SAFE)
CREATE OR REPLACE FUNCTION trg_notify_on_employee_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_name TEXT;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(v_record.first_name, 'Unknown') || ' ' || COALESCE(v_record.last_name, 'Employee');
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Employee Onboarded', v_name || ' was added to the employee directory.', jsonb_build_object('employee_id', v_record.id, 'type', 'employee_added'));
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (to_jsonb(OLD)->>'deleted_at' IS NULL AND to_jsonb(NEW)->>'deleted_at' IS NOT NULL) THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Employee Removed', v_name || ' was removed from the employee directory.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_removed'));
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Employee Status Changed', v_name || '''s status has changed to ' || NEW.status || '.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_status_changed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Employee Profile Updated', v_name || '''s profile was updated.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_updated'));
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Employee Hard Deleted', v_name || ' was permanently deleted from the database.', jsonb_build_object('employee_id', OLD.id, 'type', 'employee_deleted'));
    END IF;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
