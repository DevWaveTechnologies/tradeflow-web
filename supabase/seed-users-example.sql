-- Replace UUIDs with Authentication → Users → UID for each account.
-- Run AFTER fix-users-profile-rls.sql

-- Example (update with your real UIDs from the dashboard):
-- INSERT INTO public.users (id, name, role) VALUES
--   ('ADMIN_AUTH_UID', 'Admin', 'admin'),
--   ('WORKER_AUTH_UID', 'Worker', 'worker')
-- ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
