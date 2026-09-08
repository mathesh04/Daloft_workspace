-- Fixes for production databases where legacy constraints/data do not match the current application contract.

-- Announcements are currently organization-wide. Remove any legacy CHECK constraint
-- attached to target_type, then enforce the single supported value.
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint pc
        JOIN pg_class t ON t.oid = pc.conrelid
        WHERE t.relname = 'announcements'
          AND pc.contype = 'c'
          AND pg_get_constraintdef(pc.oid) ILIKE '%target_type%'
    LOOP
        EXECUTE format('ALTER TABLE announcements DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type VARCHAR(40);
UPDATE announcements SET target_type = 'ALL' WHERE target_type IS NULL OR trim(target_type) = '';
UPDATE announcements SET target_type = upper(trim(target_type));
ALTER TABLE announcements ALTER COLUMN target_type SET DEFAULT 'ALL';
ALTER TABLE announcements ALTER COLUMN target_type SET NOT NULL;
ALTER TABLE announcements ADD CONSTRAINT announcements_target_type_check CHECK (target_type = 'ALL');

-- Normalize delegated-access values before rebuilding the canonical unique index.
UPDATE admin_access
SET permission = upper(trim(permission)),
    scope_type = upper(trim(scope_type)),
    scope_value = NULLIF(trim(scope_value), '');

-- Clean duplicate delegated-access rows before the canonical unique index is enforced.
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY employee_id, upper(trim(permission)), upper(trim(scope_type)), COALESCE(scope_value, '')
        ORDER BY id
    ) AS rn
    FROM admin_access
)
DELETE FROM admin_access a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

DROP INDEX IF EXISTS uq_admin_access;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_access
ON admin_access(employee_id, permission, scope_type, (COALESCE(scope_value,'')));
