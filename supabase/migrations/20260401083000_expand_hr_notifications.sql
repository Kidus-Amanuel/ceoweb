-- =============================================================================
-- HR MODULE NOTIFICATION EXPANSION
-- Includes Add, Edit, Delete Triggers for Departments, Positions, Attendance, Leave Types, and Payroll Runs
-- =============================================================================

-- 1. TRIGGER FUNCTION FOR DEPARTMENTS
CREATE OR REPLACE FUNCTION trg_notify_on_department_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_record RECORD;
    v_name TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(to_jsonb(v_record)->>'name', 'Unknown Department');
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Department Added', 'The department ' || v_name || ' was created.', jsonb_build_object('department_id', v_record.id, 'type', 'department_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Department Removed', 'The department ' || v_name || ' was removed.', jsonb_build_object('department_id', NEW.id, 'type', 'department_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Department Updated', 'The department ' || v_name || ' was updated.', jsonb_build_object('department_id', NEW.id, 'type', 'department_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Department Deleted', 'The department ' || v_name || ' was permanently deleted.', jsonb_build_object('department_id', OLD.id, 'type', 'department_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. TRIGGER FUNCTION FOR POSITIONS
CREATE OR REPLACE FUNCTION trg_notify_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_record RECORD;
    v_title TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_title := COALESCE(to_jsonb(v_record)->>'title', to_jsonb(v_record)->>'name', 'Unknown Position');
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Position Added', 'The position ' || v_title || ' was created.', jsonb_build_object('position_id', v_record.id, 'type', 'position_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Position Removed', 'The position ' || v_title || ' was removed.', jsonb_build_object('position_id', NEW.id, 'type', 'position_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Position Updated', 'The position ' || v_title || ' was updated.', jsonb_build_object('position_id', NEW.id, 'type', 'position_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Position Deleted', 'The position ' || v_title || ' was permanently deleted.', jsonb_build_object('position_id', OLD.id, 'type', 'position_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. TRIGGER FUNCTION FOR ATTENDANCE
CREATE OR REPLACE FUNCTION trg_notify_on_attendance_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_record RECORD;
    v_employee_name TEXT := 'An employee';
BEGIN
    v_record := COALESCE(NEW, OLD);
    
    BEGIN
        SELECT first_name || ' ' || last_name INTO v_employee_name 
        FROM employees WHERE id = (to_jsonb(v_record)->>'employee_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_employee_name := 'Unknown Employee';
    END;
    
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Attendance Record Added', 'A new attendance record for ' || v_employee_name || ' was created.', jsonb_build_object('attendance_id', v_record.id, 'type', 'attendance_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Attendance Record Updated', 'An attendance record for ' || v_employee_name || ' was updated.', jsonb_build_object('attendance_id', NEW.id, 'type', 'attendance_updated'));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Attendance Record Deleted', 'An attendance record for ' || v_employee_name || ' was deleted.', jsonb_build_object('attendance_id', OLD.id, 'type', 'attendance_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. TRIGGER FUNCTION FOR LEAVE TYPES
CREATE OR REPLACE FUNCTION trg_notify_on_leave_type_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_record RECORD;
    v_name TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(to_jsonb(v_record)->>'name', 'Unknown Leave Type');
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'New Leave Type Added', 'The leave type ' || v_name || ' was created.', jsonb_build_object('leave_type_id', v_record.id, 'type', 'leave_type_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
             INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
             VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Type Removed', 'The leave type ' || v_name || ' was removed.', jsonb_build_object('leave_type_id', NEW.id, 'type', 'leave_type_removed'));
        ELSE
             INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
             VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Type Updated', 'The leave type ' || v_name || ' was updated.', jsonb_build_object('leave_type_id', NEW.id, 'type', 'leave_type_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Leave Type Deleted', 'The leave type ' || v_name || ' was permanently deleted.', jsonb_build_object('leave_type_id', OLD.id, 'type', 'leave_type_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. TRIGGER FUNCTION FOR PAYROLL RUNS
CREATE OR REPLACE FUNCTION trg_notify_on_payroll_run_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_record RECORD;
    v_name TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(to_jsonb(v_record)->>'name', 'A payroll run');
    v_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Payroll Run Added', v_name || ' was created.', jsonb_build_object('payroll_run_id', v_record.id, 'type', 'payroll_run_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
             INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
             VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Payroll Run Removed', v_name || ' was removed.', jsonb_build_object('payroll_run_id', NEW.id, 'type', 'payroll_run_removed'));
        ELSE
             INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
             VALUES (NEW.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Payroll Run Updated', v_name || ' was updated.', jsonb_build_object('payroll_run_id', NEW.id, 'type', 'payroll_run_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END, v_role_id, 'Payroll Run Deleted', v_name || ' was permanently deleted.', jsonb_build_object('payroll_run_id', OLD.id, 'type', 'payroll_run_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. ATTACH TRIGGERS

-- 6.1 Departments Trigger
DROP TRIGGER IF EXISTS trg_department_change_notification ON departments;
CREATE TRIGGER trg_department_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_department_change();

-- 6.2 Positions Trigger
DROP TRIGGER IF EXISTS trg_position_change_notification ON positions;
CREATE TRIGGER trg_position_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_position_change();

-- 6.3 Attendance Trigger
DROP TRIGGER IF EXISTS trg_attendance_change_notification ON attendance;
CREATE TRIGGER trg_attendance_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_attendance_change();

-- 6.4 Leave Types Trigger
DROP TRIGGER IF EXISTS trg_leave_type_change_notification ON leave_types;
CREATE TRIGGER trg_leave_type_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON leave_types
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_leave_type_change();

-- 6.5 Payroll Runs Trigger
DROP TRIGGER IF EXISTS trg_payroll_run_change_notification ON payroll_runs;
CREATE TRIGGER trg_payroll_run_change_notification
    AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_payroll_run_change();
