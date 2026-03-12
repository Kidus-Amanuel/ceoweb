-- =============================================================================
-- HR MODULE NOTIFICATION INTEGRATION
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

    RETURN v_role_id;
END;
$$;

-- 2. TRIGGER FUNCTION FOR LEAVE REQUESTS (INSERT)
CREATE OR REPLACE FUNCTION trg_notify_on_leave_request()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_role_id UUID;
BEGIN
    SELECT first_name || ' ' || last_name INTO v_employee_name FROM employees WHERE id = NEW.employee_id;
    v_role_id := get_hr_manager_role_id(NEW.company_id);

    INSERT INTO notifications (
        company_id,
        actor_id,
        category,
        scope,
        target_role_id,
        title,
        content,
        metadata
    ) VALUES (
        NEW.company_id,
        auth.uid(),
        'hr',
        CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_role_id,
        'New Leave Request',
        v_employee_name || ' has submitted a new leave request for ' || (NEW.end_date - NEW.start_date + 1) || ' days.',
        jsonb_build_object(
            'leave_id', NEW.id,
            'employee_id', NEW.employee_id,
            'type', 'leave_request'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER FUNCTION FOR LEAVE STATUS UPDATES (UPDATE)
CREATE OR REPLACE FUNCTION trg_notify_on_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_user_id UUID;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Get the User ID to notify the employee personally
        SELECT user_id INTO v_employee_user_id FROM employees WHERE id = NEW.employee_id;

        IF v_employee_user_id IS NOT NULL THEN
            INSERT INTO notifications (
                company_id,
                actor_id,
                category,
                scope,
                target_user_id,
                title,
                content,
                metadata
            ) VALUES (
                NEW.company_id,
                auth.uid(),
                'hr',
                'user',
                v_employee_user_id,
                'Leave Request ' || INITCAP(NEW.status),
                'Your leave request starting ' || NEW.start_date || ' has been ' || NEW.status || '.',
                jsonb_build_object(
                    'leave_id', NEW.id,
                    'status', NEW.status,
                    'type', 'leave_update'
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER FUNCTION FOR PERFORMANCE REVIEWS
CREATE OR REPLACE FUNCTION trg_notify_on_performance_review()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_user_id UUID;
BEGIN
    SELECT user_id INTO v_employee_user_id FROM employees WHERE id = NEW.employee_id;

    IF v_employee_user_id IS NOT NULL THEN
        INSERT INTO notifications (
            company_id,
            actor_id,
            category,
            scope,
            target_user_id,
            title,
            content,
            metadata
        ) VALUES (
            NEW.company_id,
            auth.uid(),
            'hr',
            'user',
            v_employee_user_id,
            'Performance Review Published',
            'A new performance review has been published for your profile.',
            jsonb_build_object(
                'review_id', NEW.id,
                'rating', NEW.rating,
                'type', 'performance_review'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGERS

-- 5.1 Leave Request Trigger
DROP TRIGGER IF EXISTS trg_leave_request_notification ON leaves;
CREATE TRIGGER trg_leave_request_notification
    AFTER INSERT ON leaves
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_leave_request();

-- 5.2 Leave Status Update Trigger
DROP TRIGGER IF EXISTS trg_leave_status_notification ON leaves;
CREATE TRIGGER trg_leave_status_notification
    AFTER UPDATE OF status ON leaves
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_leave_status_change();

-- 5.3 Performance Review Trigger
DROP TRIGGER IF EXISTS trg_performance_review_notification ON performance_reviews;
CREATE TRIGGER trg_performance_review_notification
    AFTER INSERT ON performance_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_performance_review();
