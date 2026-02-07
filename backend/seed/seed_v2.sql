-- ============================================================
-- Seed Update: Admin user + update rooms with floor info
-- ============================================================
-- Run AFTER 002_enhancements.sql
--
-- Creates a demo admin user for testing.
-- Admin login: admin@itbhu.ac.in / 12345678
-- ============================================================

-- Update existing rooms with correct floor numbers
-- Room 1XX → floor 1, Room 2XX → floor 2
UPDATE rooms SET floor = 1 WHERE room_number LIKE '1%';
UPDATE rooms SET floor = 2 WHERE room_number LIKE '2%';

-- ============================================================
-- Create admin auth user in Supabase
-- ============================================================
-- IMPORTANT: You must create the admin via Supabase Dashboard:
--   1. Go to Authentication → Users → Add User
--   2. Email: admin@itbhu.ac.in
--   3. Password: 12345678
--   4. Click "Auto Confirm User" checkbox
--   5. Click Create User
--   6. Copy the UUID of the created user
--   7. Replace 'PASTE_ADMIN_UUID_HERE' below with that UUID
--   8. Then run this SQL
-- ============================================================

-- After you create the admin user in Supabase Auth and get the UUID,
-- uncomment and run this:
-- INSERT INTO users (id, email, name, branch, year, role)
-- VALUES (
--   'PASTE_ADMIN_UUID_HERE',
--   '@itbhu.ac.in',
--   'Hostel Warden',
--   'ADMIN',
--   0,
--   'admin'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Hostel Warden';

-- ============================================================
-- Create a default allotment window (open for 30 days from now)
-- ============================================================
INSERT INTO allotment_windows (title, open_at, close_at)
VALUES (
  'Hostel Allotment 2026 — Semester 1',
  NOW(),
  NOW() + INTERVAL '30 days'
)
ON CONFLICT DO NOTHING;
