-- ============================================================
-- Migration 002: Enhancements
-- ============================================================
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
--
-- Changes:
--   1. Add 'role' column to users (student/admin)
--   2. Add 'is_blocked' column to rooms (maintenance/VIP)
--   3. Create 'allotment_windows' table (open/close times)
--   4. Create 'room_change_history' table (audit trail)
--   5. Add password_hash to users for admin password login
--   6. Update allotments to support atomic switching
-- ============================================================

-- =====================
-- 1. ADD role TO users
-- =====================
-- 'student' = default, 'admin' = warden/staff
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  CHECK (role IN ('student', 'admin'));

-- =====================
-- 2. ADD password_hash TO users (for admin password login)
-- =====================
-- Only admins use password login. Students use OTP.
-- We store a simple hash for now (testing phase).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- =====================
-- 3. ADD is_blocked TO rooms
-- =====================
-- When true, room is unavailable (maintenance, VIP, etc.)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Add a block reason for admin reference
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- =====================
-- 4. ALLOTMENT WINDOWS TABLE
-- =====================
-- Controls when students can select/change rooms.
-- Only ONE active window at a time.
-- When current time is between open_at and close_at → allotment is open.
CREATE TABLE IF NOT EXISTS allotment_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  open_at     TIMESTAMPTZ NOT NULL,
  close_at    TIMESTAMPTZ NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- close must be after open
  CHECK (close_at > open_at)
);

-- =====================
-- 5. ROOM CHANGE HISTORY TABLE
-- =====================
-- Every time a student changes rooms, we log it here.
-- Useful for audit trails and analytics.
CREATE TABLE IF NOT EXISTS room_change_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_room_id   UUID REFERENCES rooms(id),
  new_room_id   UUID NOT NULL REFERENCES rooms(id),
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying a student's room change history
CREATE INDEX IF NOT EXISTS idx_room_history_user ON room_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_room_history_time ON room_change_history(changed_at);

-- =====================
-- 6. ADD floor COLUMN TO rooms (for heatmap floor-wise view)
-- =====================
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS floor INTEGER NOT NULL DEFAULT 1;
