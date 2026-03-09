-- =============================================================================
-- CRM MODULE NOTIFICATION INTEGRATION
-- =============================================================================

-- 1. HELPER FUNCTION TO GET CRM MANAGERS
CREATE OR REPLACE FUNCTION get_crm_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'crm' 'edit' or 'manage' permission
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'crm'
      AND rp.action IN ('edit', 'approve', 'manage', 'delete')
    LIMIT 1;

    RETURN v_role_id;
END;
$$;

-- 2. TRIGGER FUNCTION FOR CUSTOMER ASSIGNMENTS
CREATE OR REPLACE FUNCTION trg_notify_on_customer_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
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
            'crm',
            'user',
            NEW.assigned_to,
            'New Customer Assigned',
            'You have been assigned as the manager for customer: ' || NEW.name || '.',
            jsonb_build_object(
                'customer_id', NEW.id,
                'type', 'customer_assignment'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER FUNCTION FOR DEAL UPDATES
CREATE OR REPLACE FUNCTION trg_notify_on_deal_change()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name TEXT;
BEGIN
    -- Notify on new assignment
    IF (NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
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
            'crm',
            'user',
            NEW.assigned_to,
            'New Deal Assigned',
            'You have been assigned to deal: ' || NEW.title || '.',
            jsonb_build_object(
                'deal_id', NEW.id,
                'customer_id', NEW.customer_id,
                'type', 'deal_assignment'
            )
        );
    END IF;

    -- Notify on stage change
    IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
        -- If it's a "Closed Won" deal, notify the CRM manager as well
        IF (NEW.stage = 'closed_won') THEN
            DECLARE
                v_crm_role_id UUID := get_crm_manager_role_id(NEW.company_id);
            BEGIN
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
                    'crm',
                    CASE WHEN v_crm_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                    v_crm_role_id,
                    'Deal Won!',
                    'Deal "' || NEW.title || '" has been closed as WON by ' || (SELECT full_name FROM profiles WHERE id = auth.uid()) || '.',
                    jsonb_build_object(
                        'deal_id', NEW.id,
                        'value', NEW.value,
                        'type', 'deal_won'
                    )
                );
            END;
        END IF;

        -- Notify the assignee of stage update
        IF (NEW.assigned_to IS NOT NULL) THEN
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
                'crm',
                'user',
                NEW.assigned_to,
                'Deal Stage Updated',
                'Deal "' || NEW.title || '" moved to ' || NEW.stage || '.',
                jsonb_build_object(
                    'deal_id', NEW.id,
                    'new_stage', NEW.stage,
                    'type', 'deal_update'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER FUNCTION FOR SUPPORT TICKETS
CREATE OR REPLACE FUNCTION trg_notify_on_ticket_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify on new assignment
    IF (NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
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
            'crm',
            'user',
            NEW.assigned_to,
            'Support Ticket Assigned',
            'You have been assigned to ticket: ' || NEW.subject || '.',
            jsonb_build_object(
                'ticket_id', NEW.id,
                'priority', NEW.priority,
                'type', 'ticket_assignment'
            )
        );
    END IF;

    -- Notify on critical/high priority tickets (to managers)
    IF (NEW.priority IN ('high', 'critical') AND (OLD.priority IS NULL OR OLD.priority <> NEW.priority)) THEN
        DECLARE
            v_crm_role_id UUID := get_crm_manager_role_id(NEW.company_id);
        BEGIN
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
                'crm',
                CASE WHEN v_crm_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_crm_role_id,
                'Escalated Support Ticket',
                'A ' || NEW.priority || ' priority ticket "' || NEW.subject || '" needs attention.',
                jsonb_build_object(
                    'ticket_id', NEW.id,
                    'priority', NEW.priority,
                    'type', 'ticket_escalation'
                )
            );
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGERS

-- 5.1 Customer assignment Trigger
DROP TRIGGER IF EXISTS trg_customer_notification ON customers;
CREATE TRIGGER trg_customer_notification
    AFTER UPDATE OF assigned_to ON customers
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_customer_assignment();

-- 5.2 Deal Change Trigger
DROP TRIGGER IF EXISTS trg_deal_notification ON deals;
CREATE TRIGGER trg_deal_notification
    AFTER INSERT OR UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_deal_change();

-- 5.3 Ticket Change Trigger
DROP TRIGGER IF EXISTS trg_ticket_notification ON support_tickets;
CREATE TRIGGER trg_ticket_notification
    AFTER INSERT OR UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_ticket_change();
