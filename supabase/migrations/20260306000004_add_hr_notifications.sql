-- =============================================================================
-- HR MODULE NOTIFICATION INTEGRATION
-- Includes all Add, Edit, Delete Triggers for HR Entities
-- =============================================================================

-- 1. HELPER FUNCTION TO GET HR MANAGERS
CREATE OR REPLACE FUNCTION get_hr_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'hr' 'edit' or 'approve' permission
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'hr'
      AND rp.action IN ('edit', 'approve', 'manage', 'delete')
    LIMIT 1;

    RETURN COALESCE(v_role_id, NULL);
END;
$$;

-- 2. TRIGGER FUNCTION FOR LEAVES (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION trg_notify_on_leave_change()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT := 'An employee';
    v_employee_user_id UUID;
    v_role_id UUID;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    
    -- Safe extraction
    BEGIN
        SELECT first_name || ' ' || last_name, user_id INTO v_employee_name, v_employee_user_id 
        FROM employees WHERE id = v_record.employee_id;
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
        ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
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


-- 3. TRIGGER FUNCTION FOR EMPLOYEES (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION trg_notify_on_employee_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_name TEXT;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := v_record.first_name || ' ' || v_record.last_name;
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Employee Onboarded', v_name || ' was added to the employee directory.', jsonb_build_object('employee_id', v_record.id, 'type', 'employee_added'));
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
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


-- 4. TRIGGER FUNCTION FOR PERFORMANCE REVIEWS (INSERT ONLY)
CREATE OR REPLACE FUNCTION trg_notify_on_performance_review()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_user_id UUID;
BEGIN
    SELECT user_id INTO v_employee_user_id FROM employees WHERE id = NEW.employee_id;

    IF v_employee_user_id IS NOT NULL THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_user_id, title, content, metadata)
        VALUES (NEW.company_id, auth.uid(), 'hr', 'user', v_employee_user_id, 'Performance Review Published', 'A new performance review has been published for your profile.', jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating, 'type', 'performance_review'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. ATTACH TRIGGERS

-- 5.1 Leaves Trigger
DROP TRIGGER IF EXISTS trg_leave_request_notification ON leaves;
DROP TRIGGER IF EXISTS trg_leave_status_notification ON leaves;
DROP TRIGGER IF EXISTS trg_leave_change_notification ON leaves;
CREATE TRIGGER trg_leave_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON leaves
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_leave_change();

-- 5.2 Employees Trigger
DROP TRIGGER IF EXISTS trg_employee_change_notification ON employees;
CREATE TRIGGER trg_employee_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_employee_change();

-- 5.3 Performance Review Trigger
DROP TRIGGER IF EXISTS trg_performance_review_notification ON performance_reviews;
CREATE TRIGGER trg_performance_review_notification
    AFTER INSERT ON performance_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_performance_review();
