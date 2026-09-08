-- Production integrity fixes. Safe for existing PostgreSQL deployments.
-- Announcements are organization-wide in the current application.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type VARCHAR(40);
UPDATE announcements SET target_type = 'ALL' WHERE target_type IS NULL OR trim(target_type) = '';
ALTER TABLE announcements ALTER COLUMN target_type SET DEFAULT 'ALL';
ALTER TABLE announcements ALTER COLUMN target_type SET NOT NULL;

-- Prevent duplicate pending return approvals for the same issued request.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_usage_pending_return
ON inventory_usage_updates(request_id)
WHERE usage_status = 'RETURN_REQUESTED';

-- Optimistic locking protects component stock from lost concurrent updates.
ALTER TABLE components ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
