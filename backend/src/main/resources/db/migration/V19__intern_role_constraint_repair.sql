ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'));
