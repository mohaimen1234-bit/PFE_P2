-- V13__normalize_roles.sql
-- Ensure only the 4 required roles exist and are correctly named

-- 1. Update any users with the old finance role name
UPDATE roles SET role_name = 'FINANCE_MANAGER' WHERE role_name = 'DIRECTION_FINANCE';

-- 2. Ensure the 4 roles exist
INSERT INTO roles (role_name)
SELECT 'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'ADMIN');

INSERT INTO roles (role_name)
SELECT 'MAINTENANCE_MANAGER' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'MAINTENANCE_MANAGER');

INSERT INTO roles (role_name)
SELECT 'TECHNICIAN' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'TECHNICIAN');

INSERT INTO roles (role_name)
SELECT 'FINANCE_MANAGER' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'FINANCE_MANAGER');

-- 3. (Optional) Cleanup any roles that are NOT in the approved list
-- We won't delete them to avoid breaking user associations, 
-- but they should be manually reviewed.
