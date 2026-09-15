-- Add INTERN as a valid role alongside SYSTEM_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'));
