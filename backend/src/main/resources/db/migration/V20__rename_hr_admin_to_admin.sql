UPDATE employees SET role = 'ADMIN' WHERE role = 'HR_ADMIN';

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('SYSTEM_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'));
