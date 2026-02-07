-- ============================================================
-- Migration 001: Initial Schema
-- ============================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor
--
-- Tables created:
--   1. users      — Student profiles (linked to Supabase Auth)
--   2. hostels    — Hostel buildings
--   3. rooms      — Rooms within hostels
--   4. allotments — Which student is in which room
--
-- Key design decisions:
--   - users.id references auth.users(id) — ties our table to Supabase Auth
--   - allotments has a UNIQUE on user_id — one room per student
--   - rooms have a composite unique on (hostel_id, room_number)
-- ============================================================

-- =====================
-- 1. USERS TABLE
-- =====================
-- Stores student profile info.
-- The `id` is the same UUID from Supabase Auth (auth.users.id).
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  branch     TEXT,
  year       INTEGER CHECK (year >= 1 AND year <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. HOSTELS TABLE
-- =====================
-- Each hostel has a name and total room count.
CREATE TABLE IF NOT EXISTS hostels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 3. ROOMS TABLE
-- =====================
-- Each room belongs to a hostel.
-- room_number is unique within a hostel (e.g., "101", "102").
-- capacity = how many students can stay (typically 1, 2, or 3).
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id   UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- A room number can't repeat within the same hostel
  UNIQUE (hostel_id, room_number)
);

-- =====================
-- 4. ALLOTMENTS TABLE
-- =====================
-- Maps a student to a room.
-- UNIQUE on user_id ensures one student → one room only.
CREATE TABLE IF NOT EXISTS allotments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  allotted_at TIMESTAMPTZ DEFAULT NOW(),

  -- One student can only be allotted to one room
  UNIQUE (user_id)
);

-- =====================
-- INDEXES for performance
-- =====================
-- Speed up "how many people are in this room?" queries
CREATE INDEX IF NOT EXISTS idx_allotments_room_id ON allotments(room_id);

-- Speed up "which hostel does this room belong to?" queries
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id ON rooms(hostel_id);
