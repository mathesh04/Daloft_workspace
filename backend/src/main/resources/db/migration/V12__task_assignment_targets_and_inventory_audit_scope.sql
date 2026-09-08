ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_role VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_tasks_target_role ON tasks(target_role);
