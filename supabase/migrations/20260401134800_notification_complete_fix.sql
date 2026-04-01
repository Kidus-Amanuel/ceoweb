-- =============================================================================
-- NOTIFICATION SYSTEM COMPLETE FIX
-- Fixes:
-- 1. Restores broken user_notifications_view (was using non-existent has_permission())
-- 2. Restores broken RLS policy (removes dependency on has_permission())
-- 3. Fixes all HR triggers to use 'company' scope (no role lookup needed)
-- 4. Adds missing roles table notification trigger
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: REMOVE BROKEN RLS POLICY & VIEW FROM PREVIOUS MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS user_notifications_view;
DROP POLICY IF EXISTS "Users can view relevant notifications" ON notifications;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: RESTORE CORRECT SELECT POLICY (no external functions needed)
-- All company-scoped notifications are visible to anyone in the company.
-- The trigger already inserts with scope='company' for HR events.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view relevant notifications"
ON notifications
FOR SELECT
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        scope = 'company'
        OR (scope = 'role' AND target_role_id IN (
            SELECT role_id FROM company_users WHERE user_id = auth.uid()
        ))
        OR (scope = 'user' AND target_user_id = auth.uid())
    )
);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: RESTORE CORRECT VIEW (no external functions needed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW user_notifications_view AS
SELECT
    n.id,
    n.company_id,
    n.actor_id,
    p.full_name   AS actor_name,
    p.avatar_url  AS actor_avatar,
    n.category,
    n.scope,
    n.title,
    n.content,
    n.metadata,
    n.created_at,
    COALESCE(nus.read_at IS NOT NULL, FALSE)    AS is_read,
    nus.read_at,
    COALESCE(nus.archived_at IS NOT NULL, FALSE) AS is_archived,
    nus.archived_at
FROM notifications n
LEFT JOIN notification_user_states nus
    ON nus.notification_id = n.id AND nus.user_id = auth.uid()
LEFT JOIN profiles p ON p.id = n.actor_id
WHERE
    n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        n.scope = 'company'
        OR (n.scope = 'role' AND n.target_role_id IN (
            SELECT role_id FROM company_users WHERE user_id = auth.uid()
        ))
        OR (n.scope = 'user' AND n.target_user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: FIX EMPLOYEE TRIGGER — use 'company' scope directly
-- (no role lookup; any user in the company with HR access will see it)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_on_employee_change()
RETURNS TRIGGER AS $$
DECLARE
    v_name   TEXT;
    v_record RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name   := COALESCE(v_record.first_name, 'Unknown') || ' ' ||
                COALESCE(v_record.last_name,  'Employee');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications
            (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (
            v_record.company_id, auth.uid(), 'hr', 'company',
            'New Employee Onboarded',
            v_name || ' was added to the employee directory.',
            jsonb_build_object('employee_id', v_record.id, 'type', 'employee_added')
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Soft delete check
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Employee Removed',
                v_name || ' was removed from the employee directory.',
                jsonb_build_object('employee_id', NEW.id, 'type', 'employee_removed')
            );
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Employee Status Changed',
                v_name || '''s status has changed to ' || COALESCE(NEW.status, 'unknown') || '.',
                jsonb_build_object('employee_id', NEW.id, 'type', 'employee_status_changed', 'status', NEW.status)
            );
        ELSE
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Employee Profile Updated',
                v_name || '''s profile was updated.',
                jsonb_build_object('employee_id', NEW.id, 'type', 'employee_updated')
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications
            (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (
            OLD.company_id, auth.uid(), 'hr', 'company',
            'Employee Deleted',
            v_name || ' was permanently deleted.',
            jsonb_build_object('employee_id', OLD.id, 'type', 'employee_deleted')
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: FIX LEAVE TRIGGER — use 'company' scope for HR managers,
--         keep 'user' scope for personal status updates to the employee
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_on_leave_change()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name    TEXT := 'An employee';
    v_employee_user_id UUID;
    v_record           RECORD;
BEGIN
    v_record := COALESCE(NEW, OLD);

    BEGIN
        SELECT
            COALESCE(first_name, 'Unknown') || ' ' || COALESCE(last_name, 'Employee'),
            user_id
        INTO v_employee_name, v_employee_user_id
        FROM employees
        WHERE id = (to_jsonb(v_record)->>'employee_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_employee_name := 'Unknown Employee';
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications
            (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (
            v_record.company_id, auth.uid(), 'hr', 'company',
            'New Leave Request',
            v_employee_name || ' has submitted a new leave request.',
            jsonb_build_object('leave_id', v_record.id, 'employee_id', to_jsonb(v_record)->>'employee_id', 'type', 'leave_request')
        );

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            -- Notify the employee personally
            IF v_employee_user_id IS NOT NULL THEN
                INSERT INTO notifications
                    (company_id, actor_id, category, scope, target_user_id, title, content, metadata)
                VALUES (
                    NEW.company_id, auth.uid(), 'hr', 'user', v_employee_user_id,
                    'Leave Request ' || INITCAP(NEW.status),
                    'Your leave request starting ' || NEW.start_date || ' has been ' || NEW.status || '.',
                    jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'type', 'leave_status_update')
                );
            END IF;
            -- Also notify HR company-wide
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Leave Status Updated',
                v_employee_name || '''s leave request was ' || NEW.status || '.',
                jsonb_build_object('leave_id', NEW.id, 'type', 'leave_status_update')
            );
        ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Leave Request Cancelled',
                v_employee_name || '''s leave request has been cancelled.',
                jsonb_build_object('leave_id', NEW.id, 'type', 'leave_cancelled')
            );
        ELSE
            INSERT INTO notifications
                (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (
                NEW.company_id, auth.uid(), 'hr', 'company',
                'Leave Request Updated',
                v_employee_name || '''s leave request has been updated.',
                jsonb_build_object('leave_id', NEW.id, 'type', 'leave_updated')
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications
            (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (
            OLD.company_id, auth.uid(), 'hr', 'company',
            'Leave Request Deleted',
            v_employee_name || '''s leave request was permanently deleted.',
            jsonb_build_object('leave_id', OLD.id, 'type', 'leave_deleted')
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: FIX DEPARTMENT TRIGGER — use 'company' scope
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_on_department_change()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_name   TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name   := COALESCE(to_jsonb(v_record)->>'name', 'Unknown Department');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Department Added',
            'The department ' || v_name || ' was created.',
            jsonb_build_object('department_id', v_record.id, 'type', 'department_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Department Removed',
                'The department ' || v_name || ' was removed.',
                jsonb_build_object('department_id', NEW.id, 'type', 'department_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Department Updated',
                'The department ' || v_name || ' was updated.',
                jsonb_build_object('department_id', NEW.id, 'type', 'department_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Department Deleted',
            'The department ' || v_name || ' was permanently deleted.',
            jsonb_build_object('department_id', OLD.id, 'type', 'department_deleted'));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: FIX POSITION TRIGGER — use 'company' scope
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_title  TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_title  := COALESCE(to_jsonb(v_record)->>'title', to_jsonb(v_record)->>'name', 'Unknown Position');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Position Added',
            'The position ' || v_title || ' was created.',
            jsonb_build_object('position_id', v_record.id, 'type', 'position_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Position Removed',
                'The position ' || v_title || ' was removed.',
                jsonb_build_object('position_id', NEW.id, 'type', 'position_removed'));
        ELSE
            INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
            VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Position Updated',
                'The position ' || v_title || ' was updated.',
                jsonb_build_object('position_id', NEW.id, 'type', 'position_updated'));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Position Deleted',
            'The position ' || v_title || ' was permanently deleted.',
            jsonb_build_object('position_id', OLD.id, 'type', 'position_deleted'));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: ADD MISSING ROLES TABLE TRIGGER
-- (The Positions/Roles page manages the 'roles' table — no trigger existed before)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_on_role_change()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_name   TEXT;
BEGIN
    v_record := COALESCE(NEW, OLD);
    v_name   := COALESCE(to_jsonb(v_record)->>'name', 'Unknown Role');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (v_record.company_id, auth.uid(), 'hr', 'company', 'New Role Created',
            'The role "' || v_name || '" was created.',
            jsonb_build_object('role_id', v_record.id, 'type', 'role_added'));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (NEW.company_id, auth.uid(), 'hr', 'company', 'Role Updated',
            'The role "' || v_name || '" was updated.',
            jsonb_build_object('role_id', NEW.id, 'type', 'role_updated'));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications (company_id, actor_id, category, scope, title, content, metadata)
        VALUES (OLD.company_id, auth.uid(), 'hr', 'company', 'Role Deleted',
            'The role "' || v_name || '" was permanently deleted.',
            jsonb_build_object('role_id', OLD.id, 'type', 'role_deleted'));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the roles trigger (only if not already exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_role_change_notification'
    ) THEN
        CREATE TRIGGER trg_role_change_notification
            AFTER INSERT OR UPDATE OR DELETE ON roles
            FOR EACH ROW EXECUTE FUNCTION trg_notify_on_role_change();
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: ALSO FIX get_unread_notification_count RPC TO MATCH NEW POLICY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM notifications n
    LEFT JOIN notification_user_states nus
        ON nus.notification_id = n.id AND nus.user_id = auth.uid()
    WHERE
        n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (
            n.scope = 'company'
            OR (n.scope = 'role' AND n.target_role_id IN (
                SELECT role_id FROM company_users WHERE user_id = auth.uid()
            ))
            OR (n.scope = 'user' AND n.target_user_id = auth.uid())
        )
        AND (nus.read_at IS NULL);

    RETURN COALESCE(v_count, 0);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 10: ALSO FIX mark_all_notifications_as_read RPC TO MATCH NEW POLICY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO notification_user_states (notification_id, user_id, read_at)
    SELECT n.id, auth.uid(), NOW()
    FROM notifications n
    WHERE
        n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (
            n.scope = 'company'
            OR (n.scope = 'role' AND n.target_role_id IN (
                SELECT role_id FROM company_users WHERE user_id = auth.uid()
            ))
            OR (n.scope = 'user' AND n.target_user_id = auth.uid())
        )
        AND NOT EXISTS (
            SELECT 1 FROM notification_user_states nus
            WHERE nus.notification_id = n.id
              AND nus.user_id = auth.uid()
              AND nus.read_at IS NOT NULL
        )
    ON CONFLICT (notification_id, user_id)
    DO UPDATE SET read_at = NOW();
END;
$$;
