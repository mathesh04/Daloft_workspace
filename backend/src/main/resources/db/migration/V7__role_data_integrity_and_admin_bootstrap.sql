-- Final role integrity migration. Preserve MANAGER as a first-class role.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

UPDATE employees SET role = 'HR_ADMIN' WHERE role = 'ADMIN';
UPDATE employees SET role = 'EMPLOYEE'
WHERE role IS NULL
   OR role NOT IN ('SYSTEM_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE');

ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('SYSTEM_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE'));
