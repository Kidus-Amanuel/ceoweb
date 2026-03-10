-- =============================================================================
-- INVENTORY MODULE NOTIFICATION INTEGRATION
-- =============================================================================

-- 1. HELPER FUNCTION TO GET INVENTORY MANAGERS
CREATE OR REPLACE FUNCTION get_inventory_manager_role_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Look for a role that has 'inventory' 'edit' or 'manage' permission
    SELECT rp.role_id INTO v_role_id
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.company_id = p_company_id
      AND rp.module = 'inventory'
      AND rp.action IN ('edit', 'approve', 'manage', 'create')
    LIMIT 1;

    RETURN v_role_id;
END;
$$;

-- 2. TRIGGER FUNCTION FOR LOW STOCK ALERTS
CREATE OR REPLACE FUNCTION trg_notify_on_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name TEXT;
    v_reorder_level INTEGER;
    v_total_stock BIGINT;
    v_role_id UUID;
BEGIN
    -- 1. Get product details
    SELECT name, reorder_level INTO v_product_name, v_reorder_level
    FROM products
    WHERE id = NEW.product_id;

    -- 2. Calculate TOTAL stock across all warehouses for this company
    SELECT SUM(quantity) INTO v_total_stock
    FROM stock_levels
    WHERE product_id = NEW.product_id;

    -- 3. Check if total stock is below reorder level
    IF v_total_stock <= v_reorder_level THEN
        v_role_id := get_inventory_manager_role_id(NEW.company_id);
        
        -- Avoid spamming: Check if a notification for this product was sent recently (e.g., last 24h)
        IF NOT EXISTS (
            SELECT 1 FROM notifications 
            WHERE company_id = NEW.company_id 
              AND category = 'inventory'
              AND title = 'Low Stock Alert'
              AND (metadata->>'product_id')::UUID = NEW.product_id
              AND created_at > (NOW() - INTERVAL '24 hours')
        ) THEN
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
                NULL, -- System generated
                'inventory',
                CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
                v_role_id,
                'Low Stock Alert',
                'Product ' || v_product_name || ' is below reorder level. Current stock: ' || v_total_stock || '.',
                jsonb_build_object(
                    'product_id', NEW.product_id,
                    'current_stock', v_total_stock,
                    'reorder_level', v_reorder_level,
                    'type', 'low_stock'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER FUNCTION FOR PURCHASE ORDER UPDATES
CREATE OR REPLACE FUNCTION trg_notify_on_po_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_role_id := get_inventory_manager_role_id(NEW.company_id);

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
            'inventory',
            CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_role_id,
            'Purchase Order Updated',
            'Purchase Order ' || NEW.order_number || ' status changed to ' || NEW.status || '.',
            jsonb_build_object(
                'po_id', NEW.id,
                'order_number', NEW.order_number,
                'status', NEW.status,
                'type', 'po_status_change'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER FUNCTION FOR GOODS RECEIPTS
CREATE OR REPLACE FUNCTION trg_notify_on_goods_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
    v_po_number TEXT;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
        v_role_id := get_inventory_manager_role_id(NEW.company_id);
        
        SELECT order_number INTO v_po_number FROM purchase_orders WHERE id = NEW.purchase_order_id;

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
            'inventory',
            CASE WHEN v_role_id IS NOT NULL THEN 'role'::notification_scope ELSE 'company'::notification_scope END,
            v_role_id,
            'Goods Received',
            'Shipment for PO ' || COALESCE(v_po_number, 'N/A') || ' has been received and added to stock.',
            jsonb_build_object(
                'receipt_id', NEW.id,
                'receipt_number', NEW.receipt_number,
                'po_id', NEW.purchase_order_id,
                'type', 'goods_receipt'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGERS

-- 5.1 Low Stock Trigger
DROP TRIGGER IF EXISTS trg_inventory_low_stock_notification ON stock_levels;
CREATE TRIGGER trg_inventory_low_stock_notification
    AFTER INSERT OR UPDATE ON stock_levels
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_low_stock();

-- 5.2 Purchase Order Status Trigger
DROP TRIGGER IF EXISTS trg_po_status_notification ON purchase_orders;
CREATE TRIGGER trg_po_status_notification
    AFTER UPDATE OF status ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_po_status_change();

-- 5.3 Goods Receipt Trigger
DROP TRIGGER IF EXISTS trg_goods_receipt_notification ON goods_receipts;
CREATE TRIGGER trg_goods_receipt_notification
    AFTER UPDATE OF status ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION trg_notify_on_goods_receipt();
