-- =============================================================================
-- NOTIFICATION INFRASTRUCTURE SCHEMA
-- =============================================================================

-- 1. ENUMS
DO $$ BEGIN 
    CREATE TYPE notification_category AS ENUM (
        'task', 
        'fleet', 
        'inventory', 
        'system', 
        'mention', 
        'approval',
        'hr',
        'crm',
        'finance'
    ); 
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN 
    CREATE TYPE notification_scope AS ENUM ('user', 'role', 'company'); 
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. NOTIFICATIONS TABLE
-- Stores the original notification event / message
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- User who triggered the notification
    category notification_category NOT NULL DEFAULT 'system',
    scope notification_scope NOT NULL DEFAULT 'user',
    
    -- Targets (Delivery Scopes)
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}', -- JSON for entity links (e.g., { "task_id": "...", "link": "/tasks/..." })
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints to ensure targets match scope
    CONSTRAINT valid_scope_target CHECK (
        (scope = 'user' AND target_user_id IS NOT NULL) OR
        (scope = 'role' AND target_role_id IS NOT NULL) OR
        (scope = 'company')
    )
);

-- Table Indices
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role_id) WHERE target_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- 3. NOTIFICATION USER STATES
-- Tracks per-user interaction (read, archive) for notifications
CREATE TABLE IF NOT EXISTS notification_user_states (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    PRIMARY KEY (notification_id, user_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_notification_user_states_user ON notification_user_states(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_states_read ON notification_user_states(notification_id, user_id) WHERE read_at IS NULL;

-- 4. ENABLE REALTIME
-- Add notifications to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 5. ROW LEVEL SECURITY (RLS)

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_user_states ENABLE ROW LEVEL SECURITY;

-- 5.1 Notifications SELECT Policy
-- Users can only see notifications that belong to their company AND target them, their role, or the company.
CREATE POLICY "Users can view relevant notifications"
ON notifications
FOR SELECT
USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
        scope = 'company'
        OR (scope = 'role' AND target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
        OR (scope = 'user' AND target_user_id = auth.uid())
    )
);

-- 5.2 Notifications INSERT Policy (System/App logic)
-- Usually, notifications are inserted by internal triggers or business logic.
-- However, we allow logic to insert if they are part of the company.
CREATE POLICY "Users can create notifications within their company"
ON notifications
FOR INSERT
WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- 5.3 Notification User States Policies
CREATE POLICY "Users can view their own notification states"
ON notification_user_states
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notification states"
ON notification_user_states
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. HELPER FUNCTIONS & RPCs

-- 6.1 Mark a single notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO notification_user_states (notification_id, user_id, read_at)
    VALUES (p_notification_id, auth.uid(), NOW())
    ON CONFLICT (notification_id, user_id)
    DO UPDATE SET read_at = NOW();
END;
$$;

-- 6.2 Mark all visible notifications as read
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
        -- Visible to user (replicate RLS logic for performance/correctness in RPC)
        n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (
            n.scope = 'company'
            OR (n.scope = 'role' AND n.target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
            OR (n.scope = 'user' AND n.target_user_id = auth.uid())
        )
        -- Not already read
        AND NOT EXISTS (
            SELECT 1 FROM notification_user_states nus 
            WHERE nus.notification_id = n.id AND nus.user_id = auth.uid() AND nus.read_at IS NOT NULL
        )
    ON CONFLICT (notification_id, user_id)
    DO UPDATE SET read_at = NOW();
END;
$$;

-- 6.3 Get unread count (Optimized)
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
    LEFT JOIN notification_user_states nus ON nus.notification_id = n.id AND nus.user_id = auth.uid()
    WHERE 
        n.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (
            n.scope = 'company'
            OR (n.scope = 'role' AND n.target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
            OR (n.scope = 'user' AND n.target_user_id = auth.uid())
        )
        AND (nus.read_at IS NULL);
    
    RETURN v_count;
END;
$$;

-- 7. CONVENIENCE VIEW
-- Simplifies fetching notifications with their read status for the current user
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
        n.scope = 'company'
        OR (n.scope = 'role' AND n.target_role_id IN (SELECT role_id FROM company_users WHERE user_id = auth.uid()))
        OR (n.scope = 'user' AND n.target_user_id = auth.uid())
    );


-- 8. AUDIT TRIGGER (Optional but recommended for ERP system messages)
-- Apply audit trigger if the audit_trigger function exists from core schema
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger') THEN
        CREATE TRIGGER trg_audit_notifications
            AFTER INSERT OR UPDATE OR DELETE ON notifications
            FOR EACH ROW EXECUTE FUNCTION audit_trigger();
    END IF;
END $$;


