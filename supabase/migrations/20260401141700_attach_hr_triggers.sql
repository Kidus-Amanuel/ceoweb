-- =============================================================================
-- ATTACH HR NOTIFICATION TRIGGERS
-- Connects the existing trigger functions to their corresponding tables
-- =============================================================================

-- 1. Attach Employee Trigger
-- Handles: Create, Update, Soft-Delete, Hard-Delete for Staff
DROP TRIGGER IF EXISTS trg_employee_notification ON employees;
CREATE TRIGGER trg_employee_notification
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_employee_change();

-- 2. Attach Role / Position Trigger
-- Handles: Title changes, new job descriptions, role removals
DROP TRIGGER IF EXISTS trg_role_notification ON roles;
CREATE TRIGGER trg_role_notification
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_position_change();

-- 3. Attach Leave Request Trigger
-- Handles: Status updates (Approved/Rejected) and new requests
DROP TRIGGER IF EXISTS trg_hr_leave_notification ON leaves;
CREATE TRIGGER trg_hr_leave_notification
    AFTER INSERT OR UPDATE ON leaves
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_leave_change();

-- 4. Attach Sync Privileges Trigger (Safety Redundancy)
-- Note: This was in the previous migration but we re-attach for total insurance
DROP TRIGGER IF EXISTS trg_permission_notification ON role_permissions;
CREATE TRIGGER trg_permission_notification
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_permission_change();

-- 5. Attach Position Table Trigger (if separate from roles)
-- In some schemas positions and roles are managed separately
DROP TRIGGER IF EXISTS trg_hr_position_direct_notification ON positions;
CREATE TRIGGER trg_hr_position_direct_notification
    AFTER INSERT OR UPDATE OR DELETE ON positions
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_position_change();
