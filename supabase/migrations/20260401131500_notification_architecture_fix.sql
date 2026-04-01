-- 1. DROP OLD POLICIES & VIEW TO REBUILD
DROP VIEW IF EXISTS user_notifications_view;
DROP POLICY IF EXISTS "Users can view relevant notifications" ON notifications;


-- 2. NEW SELECT POLICY FOR NOTIFICATIONS
-- Allows users to see notifications that:
--   a) Target them personally (scope=user)
--   b) Target their specific role (scope=role)
--   c) Are company-wide (scope=company) AND they have permission for that category
--   d) Are super_admins (they see everything in their active company)
CREATE POLICY "Users can view relevant notifications"
ON notifications
FOR SELECT
USING (
    -- Must be in the right company
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        -- Super Admin Bypass
        (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'super_admin'
        -- Personal
        OR (scope = 'user' AND target_user_id = auth.uid())
        -- Role-based
        OR (scope = 'role' AND target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
        -- Category/Module based for Company scope
        OR (scope = 'company' AND (
            category = 'system'
            OR (category = 'hr' AND has_permission('hr', 'view'))
            OR (category = 'fleet' AND has_permission('fleet', 'view'))
            OR (category = 'inventory' AND has_permission('inventory', 'view'))
            OR (category = 'crm' AND has_permission('crm', 'view'))
            OR (category = 'finance' AND has_permission('finance', 'view'))
        ))
    )
);


-- 3. REBUILD CONVENIENCE VIEW
CREATE OR REPLACE VIEW user_notifications_view AS
SELECT 
    n.id,
    n.company_id,
    n.actor_id,
    p.full_name as actor_name,
    p.avatar_url as actor_avatar,
    n.category,
    n.scope,
    n.title,
    n.content,
    n.metadata,
    n.created_at,
    COALESCE(nus.read_at IS NOT NULL, FALSE) as is_read,
    nus.read_at,
    COALESCE(nus.archived_at IS NOT NULL, FALSE) as is_archived,
    nus.archived_at
FROM notifications n
LEFT JOIN notification_user_states nus ON nus.notification_id = n.id AND nus.user_id = auth.uid()
LEFT JOIN profiles p ON p.id = n.actor_id
WHERE 
    n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        -- Super Admin Bypass
        (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'super_admin'
        -- Personal
        OR (n.scope = 'user' AND n.target_user_id = auth.uid())
        -- Role-based
        OR (n.scope = 'role' AND n.target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
        -- Category/Module based for Company scope
        OR (n.scope = 'company' AND (
            n.category = 'system'
            OR (n.category = 'hr' AND has_permission('hr', 'view'))
            OR (n.category = 'fleet' AND has_permission('fleet', 'view'))
            OR (n.category = 'inventory' AND has_permission('inventory', 'view'))
            OR (n.category = 'crm' AND has_permission('crm', 'view'))
            OR (n.category = 'finance' AND has_permission('finance', 'view'))
        ))
    );


-- 4. UPDATE HR TRIGGERS TO USE MODULE SCOPE
-- This simplifies triggers significantly as they don't need to find a specific role_id anymore

-- 4.1 Update Employee Trigger
CREATE OR REPLACE FUNCTION trg_notify_on_employee_change()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(v_record.first_name, 'Unknown') || ' ' || COALESCE(v_record.last_name, 'Employee');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Employee Onboarded', v_name || ' was added to the employee directory.', jsonb_build_object('employee_id', v_record.id, 'type', 'employee_added'));
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (to_jsonb(OLD)->>'deleted_at' IS NULL AND to_jsonb(NEW)->>'deleted_at' IS NOT NULL) THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Employee Removed', v_name || ' was removed from the employee directory.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_removed'));
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Employee Status Changed', v_name || '''s status has changed to ' || NEW.status || '.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_status_changed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Employee Profile Updated', v_name || '''s profile was updated.', jsonb_build_object('employee_id', NEW.id, 'type', 'employee_updated'));
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Employee Hard Deleted', v_name || ' was permanently deleted from the database.', jsonb_build_object('employee_id', OLD.id, 'type', 'employee_deleted'));
    END IF;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.2 Update Leave Trigger
CREATE OR REPLACE FUNCTION trg_notify_on_leave_change()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT := 'An employee';
    v_employee_user_id UUID;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    
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

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Leave Request', v_employee_name || ' has submitted a new leave request.', jsonb_build_object('leave_id', v_record.id, 'employee_id', v_record.employee_id, 'type', 'leave_request'));
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            -- Private notification to the employee
            IF v_employee_user_id IS NOT NULL THEN
                INSERT INTO notifications (company_id, actor_id, category, scope, target_user_id, title, content, metadata)
                VALUES (NEW.company_id, auth.uid(), 'hr', 'user', v_employee_user_id, 'Leave Request ' || INITCAP(NEW.status), 'Your leave request starting ' || NEW.start_date || ' has been ' || NEW.status || '.', jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'type', 'leave_status_update'));
            END IF;
            
            -- Also notify HR group of status change
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Leave Status Updated', v_employee_name || '''s leave request was ' || NEW.status || '.', jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id, 'type', 'leave_status_update'));
            
        ELSIF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (to_jsonb(OLD)->>'deleted_at' IS NULL AND to_jsonb(NEW)->>'deleted_at' IS NOT NULL) THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Leave Request Cancelled', v_employee_name || '''s leave request has been cancelled.', jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id, 'type', 'leave_cancelled'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Leave Request Updated', v_employee_name || '''s leave request has been updated.', jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id, 'type', 'leave_updated'));
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Leave Request Deleted', v_employee_name || '''s leave request was permanently deleted.', jsonb_build_object('leave_id', OLD.id, 'employee_id', OLD.employee_id, 'type', 'leave_deleted'));
    END IF;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.3 Update Other HR Triggers from expansion
CREATE OR REPLACE FUNCTION trg_notify_on_department_change()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_name TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(to_jsonb(v_record)->>'name', 'Unknown Department');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Department Added', 'The department ' || v_name || ' was created.', jsonb_build_object('department_id', v_record.id, 'type', 'department_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Department Removed', 'The department ' || v_name || ' was removed.', jsonb_build_object('department_id', NEW.id, 'type', 'department_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Department Updated', 'The department ' || v_name || ' was updated.', jsonb_build_object('department_id', NEW.id, 'type', 'department_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Department Deleted', 'The department ' || v_name || ' was permanently deleted.', jsonb_build_object('department_id', OLD.id, 'type', 'department_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION trg_notify_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_title TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_title := COALESCE(to_jsonb(v_record)->>'title', to_jsonb(v_record)->>'name', 'Unknown Position');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Position Added', 'The position ' || v_title || ' was created.', jsonb_build_object('position_id', v_record.id, 'type', 'position_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD)->>'deleted_at') IS NULL AND (to_jsonb(NEW)->>'deleted_at') IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Position Removed', 'The position ' || v_title || ' was removed.', jsonb_build_object('position_id', NEW.id, 'type', 'position_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Position Updated', 'The position ' || v_title || ' was updated.', jsonb_build_object('position_id', NEW.id, 'type', 'position_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Position Deleted', 'The position ' || v_title || ' was permanently deleted.', jsonb_build_object('position_id', OLD.id, 'type', 'position_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION trg_notify_on_attendance_change()
RETURNS TRIGGER AS $$
DECLARE
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

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'Attendance Record Added', 'A new attendance record for ' || v_employee_name || ' was created.', jsonb_build_object('attendance_id', v_record.id, 'type', 'attendance_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Attendance Record Updated', 'An attendance record for ' || v_employee_name || ' was updated.', jsonb_build_object('attendance_id', NEW.id, 'type', 'attendance_updated'));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Attendance Record Deleted', 'An attendance record for ' || v_employee_name || ' was deleted.', jsonb_build_object('attendance_id', OLD.id, 'type', 'attendance_deleted'));
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
