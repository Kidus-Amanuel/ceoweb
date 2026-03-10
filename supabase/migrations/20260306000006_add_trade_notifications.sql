-- =============================================================================
-- INTERNATIONAL TRADE MODULE NOTIFICATION INTEGRATION
-- =============================================================================

-- 1. HELPER FUNCTION TO GET TRADE MANAGERS
CREATE OR REPLACE FUNCTION get_trade_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'trade' or 'logistics' permissions
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'trade'
      AND rp.action IN ('edit', 'approve', 'manage', 'view')
    LIMIT 1;

    RETURN v_role_id;
END;
$$;

-- 2. TRIGGER FUNCTION FOR SHIPMENT STATUS CHANGES
CREATE OR REPLACE FUNCTION trg_notify_on_shipment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_role_id := get_trade_manager_role_id(NEW.company_id);

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
            'trade',
            CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_role_id,
'Shipment Status Updated',
            'Shipment ' || NEW.shipment_number || ' is now ' || REPLACE(NEW.status::TEXT, '_', ' ') || '.',
            jsonb_build_object(
                'shipment_id', NEW.id,
                'shipment_number', NEW.shipment_number,
                'status', NEW.status,
                'type', 'shipment_status_update'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER FUNCTION FOR CUSTOMS CLEARANCE UPDATES
CREATE OR REPLACE FUNCTION trg_notify_on_customs_clearance()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_shipment_number TEXT;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_role_id := get_trade_manager_role_id(NEW.company_id);
        
        SELECT shipment_number INTO v_shipment_number FROM shipments WHERE id = NEW.shipment_id;

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
            'trade',
            CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_role_id,
            'Customs Status: ' || INITCAP(NEW.status),
            'Customs clearance for shipment ' || v_shipment_number || ' is now ' || NEW.status || '.',
            jsonb_build_object(
                'shipment_id', NEW.id,
                'clearance_id', NEW.id,
                'status', NEW.status,
                'type', 'customs_update'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER FUNCTION FOR SHIPMENT EVENTS (Milestones)
CREATE OR REPLACE FUNCTION trg_notify_on_shipment_event()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_shipment_number TEXT;
    v_company_id UUID;
BEGIN
    SELECT shipment_number, company_id INTO v_shipment_number, v_company_id FROM shipments WHERE id = NEW.shipment_id;
    v_role_id := get_trade_manager_role_id(v_company_id);

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
        v_company_id,
        auth.uid(),
        'trade',
        CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_role_id,
        'Shipment Milestone: ' || NEW.event_type,
        'Milestone achieved for ' || v_shipment_number || ': ' || NEW.description || '.',
        jsonb_build_object(
            'shipment_id', NEW.shipment_id,
            'event_type', NEW.event_type,
            'location', NEW.location,
            'type', 'shipment_milestone'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGERS

-- 5.1 Shipment Status Trigger
DROP TRIGGER IF EXISTS trg_shipment_status_notification ON shipments;
CREATE TRIGGER trg_shipment_status_notification
    AFTER UPDATE OF status ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_shipment_status_change();

-- 5.2 Customs Clearance Trigger
DROP TRIGGER IF EXISTS trg_customs_clearance_notification ON customs_clearance;
CREATE TRIGGER trg_customs_clearance_notification
    AFTER UPDATE OF status ON customs_clearance
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_customs_clearance();

-- 5.3 Shipment Event Trigger
DROP TRIGGER IF EXISTS trg_shipment_event_notification ON shipment_events;
CREATE TRIGGER trg_shipment_event_notification
    AFTER INSERT ON shipment_events
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_shipment_event();
