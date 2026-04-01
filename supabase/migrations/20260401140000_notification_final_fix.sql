-- =============================================================================
-- FINAL NOTIFICATION ARCHITECTURE FIX (FLEET-REFERENCE)
-- Matches the successful Fleet module's pattern for HR Employees & Positions
-- =============================================================================

-- 1. HR MANAGER ROLE HELPER (Matching get_fleet_manager_role_id)
CREATE OR REPLACE FUNCTION get_hr_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'hr' 'manage' or 'edit' permission
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'hr'
      AND rp.action IN ('edit', 'approve', 'manage', 'view')
    LIMIT 1;

    RETURN v_role_id;
END;
$$;

-- 2. IMPROVED EMPLOYEE TRIGGER (Fleet Style)
CREATE OR REPLACE FUNCTION trg_notify_on_employee_change()
RETURNS TRIGGER AS $$
DECLARE
    v_hr_role_id UUID;
    v_name TEXT;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name := COALESCE(v_record.first_name, 'Unknown') || ' ' || COALESCE(v_record.last_name, 'Employee');
    v_hr_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (
            v_record.company_id, auth.uid(), 'hr', 
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'New Employee Onboarded',
            v_name || ' was added to the employee directory.',
            jsonb_build_object('employee_id', v_record.id, 'type', 'employee_added')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr',
                CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_hr_role_id, 'Employee Removed',
                v_name || ' was removed from the directory.',
                jsonb_build_object('employee_id', NEW.id, 'type', 'employee_removed')
            );
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr',
                CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_hr_role_id, 'Employee Profile Updated',
                v_name || '''s details were updated.',
                jsonb_build_object('employee_id', NEW.id, 'type', 'employee_updated')
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (
            OLD.company_id, auth.uid(), 'hr',
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'Employee Permanently Deleted',
            v_name || ' record was erased from the system.',
            jsonb_build_object('type', 'employee_deleted')
        );
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. IMPROVED POSITION/ROLE TRIGGER (Fleet Style)
CREATE OR REPLACE FUNCTION trg_notify_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
    v_hr_role_id UUID;
    v_record RECORD;
    v_title TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_title := COALESCE(to_jsonb(v_record)->>'title', to_jsonb(v_record)->>'name', 'Unknown Title');
    v_hr_role_id := get_hr_manager_role_id(v_record.company_id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (
            v_record.company_id, auth.uid(), 'hr',
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'Structure Change: New Position',
            'New position "' || v_title || '" was created.',
            jsonb_build_object('position_id', v_record.id, 'type', 'position_creation')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (
            NEW.company_id, auth.uid(), 'hr',
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'Position Updated',
            'Details for "' || v_title || '" were modified.',
            jsonb_build_object('position_id', NEW.id, 'type', 'position_update')
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (
            OLD.company_id, auth.uid(), 'hr',
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'Position Deleted',
            'Position "' || v_title || '" was permanently removed.',
            jsonb_build_object('type', 'position_deletion')
        );
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. NEW TRIGGER FOR ROLE PERMISSIONS (The "Sync Privileges" Action)
CREATE OR REPLACE FUNCTION trg_notify_on_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    v_hr_role_id UUID;
    v_role_name TEXT;
    v_company_id UUID;
BEGIN
    -- Get company_id from the role being modified
    SELECT company_id, name INTO v_company_id, v_role_name FROM roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
    v_hr_role_id := get_hr_manager_role_id(v_company_id);

    INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
    VALUES (
        v_company_id, auth.uid(), 'hr',
        CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_hr_role_id, 'Security Matrix Updated',
        'Privileges for role "' || COALESCE(v_role_name, 'Unknown') || '" were updated.',
        jsonb_build_object('role_id', COALESCE(NEW.role_id, OLD.role_id), 'type', 'permission_update')
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Role Permissions Trigger
DROP TRIGGER IF EXISTS trg_permission_notification ON role_permissions;
CREATE TRIGGER trg_permission_notification
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_permission_change();

-- 5. ENSURE OTHER HR TRIGGERS ALSO FOLLOW THIS PATTERN
-- (Leave Request, Attendance, Departments, etc.)

-- Leave Trigger
CREATE OR REPLACE FUNCTION trg_notify_on_leave_change()
RETURNS TRIGGER AS $$
DECLARE
    v_hr_role_id UUID;
    v_employee_name TEXT := 'An employee';
    v_employee_user_id UUID;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_hr_role_id := get_hr_manager_role_id(v_record.company_id);

    SELECT COALESCE(first_name, 'Unknown') || ' ' || COALESCE(last_name, 'Employee'), user_id
    INTO v_employee_name, v_employee_user_id
    FROM employees WHERE id = (to_jsonb(v_record)->>'employee_id')::UUID;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 
            CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_hr_role_id, 'New Leave Request',
            v_employee_name || ' has submitted a new leave request.',
            jsonb_build_object('leave_id', v_record.id, 'type', 'leave_request'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            -- Personal notification to employee
            IF v_employee_user_id IS NOT NULL THEN
                INSERT INTO notifications (company_id, actor_id, category, scope, target_user_id, title, content, metadata)
                VALUES (NEW.company_id, auth.uid(), 'hr', 'user', v_employee_user_id,
                    'Leave Request Updated', 'Your leave request status is now: ' || NEW.status,
                    jsonb_build_object('leave_id', NEW.id, 'type', 'leave_update'));
            END IF;
            -- Manager notification
            INSERT INTO notifications (company_id, actor_id, category, scope, target_role_id, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr',
                CASE WHEN v_hr_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_hr_role_id, 'Leave Decision',
                'Leave request for ' || v_employee_name || ' was ' || NEW.status || '.',
                jsonb_build_object('leave_id', NEW.id, 'type', 'leave_decision'));
        END IF;
    END IF;
    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FINAL NOTIFICATION VIEW CLEANUP
-- Ensure the view and RLS policies are robust and match the user's privilege matrix.
-- This ensures anyone with 'view' permission for a module (e.g. General Manager, HR Manager) 
-- sees company-scoped notifications for that category.

CREATE OR REPLACE VIEW user_notifications_view AS
SELECT 
    n.id, n.company_id, n.actor_id, p.full_name as actor_name, p.avatar_url as actor_avatar,
    n.category, n.scope, n.title, n.content, n.metadata, n.created_at,
    COALESCE(nus.read_at IS NOT NULL, FALSE) as is_read, nus.read_at,
    COALESCE(nus.archived_at IS NOT NULL, FALSE) as is_archived, nus.archived_at
FROM notifications n
LEFT JOIN notification_user_states nus ON nus.notification_id = n.id AND nus.user_id = auth.uid()
LEFT JOIN profiles p ON p.id = n.actor_id
WHERE n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
AND (
    (n.scope = 'company' AND has_permission(n.category::TEXT, 'view'))
    OR (n.scope = 'role' AND n.target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
    OR (n.scope = 'user' AND n.target_user_id = auth.uid())
    OR (n.scope = 'company' AND get_current_user_type() = 'super_admin')
);

-- Sync RLS Policy with the same logic
DROP POLICY IF EXISTS "Users can view relevant notifications" ON notifications;
CREATE POLICY "Users can view relevant notifications"
ON notifications
FOR SELECT
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        (scope = 'company' AND has_permission(category::TEXT, 'view'))
        OR (scope = 'role' AND target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
        OR (scope = 'user' AND target_user_id = auth.uid())
        OR (scope = 'company' AND get_current_user_type() = 'super_admin')
    )
);
