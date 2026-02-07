-- ============================================================
-- Seed Data — Satish Dhawan Hostel + Rooms
-- ============================================================
-- Run this AFTER the schema migration (001_initial_schema.sql)
-- in Supabase Dashboard → SQL Editor
--
-- Creates:
--   - 1 hostel: "Satish Dhawan Hostel"
--   - 20 rooms: numbered 101-110 (Ground Floor) and 201-210 (First Floor)
--   - Each room has capacity of 2 (double occupancy)
-- ============================================================

-- Insert the hostel
INSERT INTO hostels (name, total_rooms)
VALUES ('Satish Dhawan Hostel', 20)
ON CONFLICT (name) DO NOTHING;

-- Insert rooms (Ground Floor: 101-110, First Floor: 201-210)
-- We use a DO block to loop and create rooms programmatically.
DO $$
DECLARE
  hostel_uuid UUID;
  floor_num   INTEGER;
  room_num    INTEGER;
  room_label  TEXT;
BEGIN
  -- Get the hostel ID we just inserted
  SELECT id INTO hostel_uuid FROM hostels WHERE name = 'Satish Dhawan Hostel';

  -- Ground floor rooms: 101 to 110 (floor = 1)
  FOR room_num IN 1..10 LOOP
    room_label := '1' || LPAD(room_num::TEXT, 2, '0');  -- "101", "102", ...
    INSERT INTO rooms (hostel_id, room_number, capacity, floor)
    VALUES (hostel_uuid, room_label, 2, 1)
    ON CONFLICT (hostel_id, room_number) DO NOTHING;
  END LOOP;

  -- First floor rooms: 201 to 210 (floor = 2)
  FOR room_num IN 1..10 LOOP
    room_label := '2' || LPAD(room_num::TEXT, 2, '0');  -- "201", "202", ...
    INSERT INTO rooms (hostel_id, room_number, capacity, floor)
    VALUES (hostel_uuid, room_label, 2, 2)
    ON CONFLICT (hostel_id, room_number) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- Update floor for existing rooms (if migration ran after seed)
-- ============================================================
UPDATE rooms SET floor = 1 WHERE room_number LIKE '1%' AND floor = 0;
UPDATE rooms SET floor = 2 WHERE room_number LIKE '2%' AND floor = 0;
