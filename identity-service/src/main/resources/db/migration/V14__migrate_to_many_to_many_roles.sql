-- V14__migrate_to_many_to_many_roles.sql
-- Creates the user_roles join table and migrates data from the users.role_id column

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Migrate existing data
INSERT INTO user_roles (user_id, role_id)
SELECT user_id, role_id 
FROM users 
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Note: We don't drop the users.role_id column yet to allow for rollback if needed.
