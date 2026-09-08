-- Normalize legacy department text into the Organization Admin department registry.
-- Employee.department remains a compatibility column for existing application/reporting code.
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(100) UNIQUE,
  manager_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments(name, active) SELECT 'Administration', TRUE WHERE NOT EXISTS (SELECT 1 FROM departments WHERE lower(name)='administration');

INSERT INTO departments(name, active)
SELECT DISTINCT trim(e.department), TRUE
FROM employees e
WHERE e.department IS NOT NULL AND trim(e.department) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM departments d WHERE lower(d.name)=lower(trim(e.department))
  );

INSERT INTO departments(name, active)
SELECT 'Unassigned', TRUE
WHERE EXISTS (
  SELECT 1 FROM employees e WHERE e.department IS NULL OR trim(e.department)=''
)
AND NOT EXISTS (SELECT 1 FROM departments d WHERE lower(d.name)='unassigned');

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_name_lower ON departments (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_code_lower ON departments (lower(code)) WHERE code IS NOT NULL;

UPDATE employees
SET department='Unassigned'
WHERE department IS NULL OR trim(department)='';
