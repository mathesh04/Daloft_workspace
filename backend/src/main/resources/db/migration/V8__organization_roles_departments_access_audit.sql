ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;
UPDATE employees SET role='EMPLOYEE' WHERE role IS NULL OR role NOT IN ('SYSTEM_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE');
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('SYSTEM_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE'));
CREATE INDEX IF NOT EXISTS idx_employee_reporting_manager ON employees(reporting_manager_id);
CREATE TABLE IF NOT EXISTS departments (id BIGSERIAL PRIMARY KEY,name VARCHAR(255) NOT NULL UNIQUE,code VARCHAR(100) UNIQUE,manager_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admin_access (id BIGSERIAL PRIMARY KEY,employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,permission VARCHAR(100) NOT NULL,scope_type VARCHAR(50) NOT NULL DEFAULT 'ORGANIZATION',scope_value VARCHAR(255),active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_access ON admin_access(employee_id,permission,scope_type,(COALESCE(scope_value,'')));
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_employee_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_department VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_target_department ON tasks(target_department);
INSERT INTO admin_access(employee_id,permission,scope_type,scope_value,active)
SELECT e.id,'ALL','ORGANIZATION',NULL,TRUE FROM employees e WHERE e.role='HR_ADMIN'
AND NOT EXISTS (SELECT 1 FROM admin_access a WHERE a.employee_id=e.id);
