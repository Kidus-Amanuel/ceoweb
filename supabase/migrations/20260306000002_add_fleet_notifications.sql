-- =============================================================================
-- FLEET MODULE NOTIFICATION INTEGRATION
-- =============================================================================

-- 1. HELPER FUNCTION TO GET FLEET MANAGERS
-- Tries to find a role with fleet permissions to target role-based notifications
CREATE OR REPLACE FUNCTION get_fleet_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'fleet' 'edit' or 'view' permission
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'fleet'
      AND rp.action IN ('edit', 'approve', 'manage', 'view')
    LIMIT 1;

    RETURN v_role_id;
END;
$$;

-- 2. TRIGGER FUNCTION FOR VEHICLE ASSIGNMENTS
CREATE OR REPLACE FUNCTION trg_notify_on_driver_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_user_id UUID;
    v_vehicle_number TEXT;
    v_actor_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Get the User ID of the driver from the employees table
    SELECT user_id INTO v_driver_user_id
    FROM employees
    WHERE id = NEW.driver_id;

    -- 2. Get the vehicle number
    SELECT vehicle_number INTO v_vehicle_number
    FROM vehicles
    WHERE id = NEW.vehicle_id;

    v_actor_id := auth.uid();

    -- 3. Create notification for the driver
    IF v_driver_user_id IS NOT NULL THEN
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
            v_actor_id,
            'fleet',
            'user',
            v_driver_user_id,
            CASE WHEN TG_OP = 'INSERT' THEN 'New Vehicle Assigned' ELSE 'Vehicle Assignment Updated' END,
            CASE WHEN TG_OP = 'INSERT' THEN 'You have been assigned to ' || v_vehicle_number || '.' ELSE 'Your assignment for ' || v_vehicle_number || ' has been updated.' END,
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'assignment_id', NEW.id,
                'type', CASE WHEN TG_OP = 'INSERT' THEN 'assignment' ELSE 'assignment_update' END
            )
        );
    END IF;

    -- 4. Notify Fleet Managers as well (Role-based)
        v_role_id := get_fleet_manager_role_id(NEW.company_id);

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
        v_actor_id,
        'fleet',
        CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_role_id,
        CASE WHEN TG_OP = 'INSERT' THEN 'Driver Assigned to Vehicle' ELSE 'Driver Assignment Updated' END,
        'Vehicle ' || v_vehicle_number || ' assignment for driver ' || NEW.driver_id || ' has been updated.',
        jsonb_build_object(
            'vehicle_id', NEW.vehicle_id,
            'driver_id', NEW.driver_id,
            'assignment_id', NEW.id,
            'type', 'assignment_alert'
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER FUNCTION FOR VEHICLE OPERATIONS (Create, Edit, Assigned, Delete)
CREATE OR REPLACE FUNCTION trg_notify_on_vehicle_operations()
RETURNS TRIGGER AS $$
DECLARE
    v_fleet_role_id UUID;
    v_driver_user_id UUID;
BEGIN
    -- Get context
    v_fleet_role_id := get_fleet_manager_role_id(COALESCE(NEW.company_id, OLD.company_id));

    -- 1. INSERT (Creation)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO notifications (
            company_id, actor_id, category, scope, target_role_id, title, content, metadata
        ) VALUES (
            NEW.company_id, auth.uid(), 'fleet', 
            CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_fleet_role_id, 'New Vehicle Added',
            'Vehicle ' || NEW.vehicle_number || ' (' || COALESCE(NEW.make, '') || ') added to fleet.',
            jsonb_build_object('vehicle_id', NEW.id, 'type', 'vehicle_creation')
        );
        RETURN NEW;
    END IF;

    -- 2. UPDATE (Edit / Assignment / Soft Delete)
    IF (TG_OP = 'UPDATE') THEN
        -- A. Soft Delete
        IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
            INSERT INTO notifications (
                company_id, actor_id, category, scope, target_role_id, title, content, metadata
            ) VALUES (
                NEW.company_id, auth.uid(), 'fleet',
                CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_fleet_role_id, 'Vehicle Removed',
                'Vehicle ' || NEW.vehicle_number || ' has been removed from active fleet.',
                jsonb_build_object('vehicle_id', NEW.id, 'type', 'vehicle_deletion')
            );
            RETURN NEW;
        END IF;

        -- B. Driver Assignment Change (Direct field on vehicle table)
        IF (OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id) THEN
            IF (NEW.assigned_driver_id IS NOT NULL) THEN
                SELECT user_id INTO v_driver_user_id FROM employees WHERE id = NEW.assigned_driver_id;
                IF v_driver_user_id IS NOT NULL THEN
                    INSERT INTO notifications (
                        company_id, actor_id, category, scope, target_user_id, title, content, metadata
                    ) VALUES (
                        NEW.company_id, auth.uid(), 'fleet', 'user', v_driver_user_id,
                        'New Vehicle Assigned', 'You have been assigned to vehicle ' || NEW.vehicle_number || '.',
                        jsonb_build_object('vehicle_id', NEW.id, 'type', 'assignment')
                    );
                END IF;
            END IF;

            -- Notify managers of assignment change
            INSERT INTO notifications (
                company_id, actor_id, category, scope, target_role_id, title, content, metadata
            ) VALUES (
                NEW.company_id, auth.uid(), 'fleet',
                CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_fleet_role_id, 'Assignment Updated',
                'Assignment for vehicle ' || NEW.vehicle_number || ' has changed.',
                jsonb_build_object('vehicle_id', NEW.id, 'type', 'assignment_alert')
            );
        END IF;

        -- C. General Info Edit (Status, License Plate, Make/Model)
        IF (OLD.status IS DISTINCT FROM NEW.status OR 
            OLD.license_plate IS DISTINCT FROM NEW.license_plate OR
            OLD.vehicle_number IS DISTINCT FROM NEW.vehicle_number) THEN
            
            INSERT INTO notifications (
                company_id, actor_id, category, scope, target_role_id, title, content, metadata
            ) VALUES (
                NEW.company_id, auth.uid(), 'fleet',
                CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_fleet_role_id, 'Vehicle Updated',
                'Details for vehicle ' || NEW.vehicle_number || ' have been modified.',
                jsonb_build_object('vehicle_id', NEW.id, 'type', 'vehicle_update')
            );
        END IF;
    END IF;

    -- 3. HARD DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO notifications (
            company_id, actor_id, category, scope, target_role_id, title, content, metadata
        ) VALUES (
            OLD.company_id, auth.uid(), 'fleet',
            CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_fleet_role_id, 'Vehicle Hard Deleted',
            'Vehicle ' || OLD.vehicle_number || ' was permanently deleted from the database.',
            jsonb_build_object('type', 'vehicle_hard_delete')
        );
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER FUNCTION FOR MAINTENANCE LOGS
CREATE OR REPLACE FUNCTION trg_notify_on_vehicle_maintenance()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle_number TEXT;
    v_fleet_role_id UUID;
BEGIN
    SELECT vehicle_number INTO v_vehicle_number FROM vehicles WHERE id = NEW.vehicle_id;
    v_fleet_role_id := get_fleet_manager_role_id(NEW.company_id);

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
        'fleet',
        CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_fleet_role_id,
        'Maintenance Log Created',
        'New ' || NEW.type || ' maintenance logged for vehicle ' || v_vehicle_number || '.',
        jsonb_build_object(
            'vehicle_id', NEW.id,
            'maintenance_id', NEW.id,
            'type', 'maintenance'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER FUNCTION FOR INSURANCE POLICIES
CREATE OR REPLACE FUNCTION trg_notify_on_insurance_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle_number TEXT;
    v_fleet_role_id UUID;
BEGIN
    IF NEW.vehicle_id IS NOT NULL THEN
        SELECT vehicle_number INTO v_vehicle_number FROM vehicles WHERE id = NEW.vehicle_id;
    END IF;
    
    v_fleet_role_id := get_fleet_manager_role_id(NEW.company_id);

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
        'fleet',
        CASE WHEN v_fleet_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
        v_fleet_role_id,
        'New Insurance Policy',
        'A new ' || COALESCE(NEW.type, 'general') || ' insurance policy ' || NEW.policy_number || ' has been created' || COALESCE(' for vehicle ' || v_vehicle_number, '') || '.',
        jsonb_build_object(
            'vehicle_id', NEW.vehicle_id,
            'policy_id', NEW.id,
            'type', 'insurance'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ATTACH TRIGGERS

-- 6.1 Driver Assignment Trigger (INSERT & UPDATE)
DROP TRIGGER IF EXISTS trg_fleet_assignment_notification ON driver_assignments;
CREATE TRIGGER trg_fleet_assignment_notification
    AFTER INSERT OR UPDATE ON driver_assignments
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_driver_assignment();

-- 6.2 Vehicle Operations Trigger (Covers Insert, Update, Delete)
DROP TRIGGER IF EXISTS trg_vehicle_operations_notification ON vehicles;
CREATE TRIGGER trg_vehicle_operations_notification
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_vehicle_operations();

-- 6.3 Maintenance Notification Trigger
DROP TRIGGER IF EXISTS trg_vehicle_maintenance_notification ON vehicle_maintenance;
CREATE TRIGGER trg_vehicle_maintenance_notification
    AFTER INSERT ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_vehicle_maintenance();

-- 6.4 Insurance Notification Trigger
DROP TRIGGER IF EXISTS trg_insurance_creation_notification ON insurance_policies;
CREATE TRIGGER trg_insurance_creation_notification
    AFTER INSERT ON insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_insurance_creation();

-- 7. ADD SHIPMENT ALERTS (TRACCAR INTEG)
-- If we have Traccar movements, we could add triggers there too, 
-- but we'll focus on the core fleet actions for now as requested.
