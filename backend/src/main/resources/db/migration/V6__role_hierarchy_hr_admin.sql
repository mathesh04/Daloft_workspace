-- PostgreSQL migration: normalize legacy ADMIN to HR_ADMIN while preserving the
-- enterprise role hierarchy already present in the database.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

UPDATE employees SET role = 'HR_ADMIN' WHERE role = 'ADMIN';

ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'));
