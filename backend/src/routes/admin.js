// ============================================================
// Admin Routes — Warden Control Panel APIs
// ============================================================
// All routes require: requireAuth + requireAdmin middleware
//
// ENDPOINTS:
//   GET    /admin/rooms          — All rooms with occupancy
//   GET    /admin/allotments     — All user-room mappings
//   POST   /admin/assign        — Manually assign student to room
//   POST   /admin/unassign      — Remove student's allotment
//   POST   /admin/block-room    — Block a room
//   POST   /admin/unblock-room  — Unblock a room
//   GET    /admin/vacancy-map   — Vacancy heatmap data
//   GET    /admin/students      — Search/list all students
//   GET    /admin/window        — Get allotment window
//   POST   /admin/window        — Set allotment window
//   GET    /admin/stats         — Dashboard statistics
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Apply auth + admin check to ALL admin routes
router.use(requireAuth, requireAdmin);

// ======================
// GET /admin/stats
// ======================
// Dashboard overview numbers
router.get("/stats", async (req, res) => {
  try {
    const [
      { count: totalStudents },
      { count: totalRooms },
      { count: totalAllotments },
      { count: blockedRooms },
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabaseAdmin.from("rooms").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("allotments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("rooms").select("*", { count: "exact", head: true }).eq("is_blocked", true),
    ]);

    return res.json({
      totalStudents: totalStudents || 0,
      totalRooms: totalRooms || 0,
      totalAllotments: totalAllotments || 0,
      blockedRooms: blockedRooms || 0,
      availableRooms: (totalRooms || 0) - (blockedRooms || 0),
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ======================
// GET /admin/rooms
// ======================
// All rooms with capacity, occupancy, occupant details, status
router.get("/rooms", async (req, res) => {
  try {
    // Fetch rooms
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from("rooms")
      .select("*, hostels(name)")
      .order("room_number");

    if (roomsError) {
      return res.status(500).json({ error: "Failed to fetch rooms" });
    }

    // Fetch all allotments with user info
    const { data: allotments, error: allotError } = await supabaseAdmin
      .from("allotments")
      .select("room_id, user_id, allotted_at, users(name, email, branch, year)");

    if (allotError) {
      return res.status(500).json({ error: "Failed to fetch allotments" });
    }

    // Group allotments by room_id
    const allotmentsByRoom = {};
    for (const a of allotments || []) {
      if (!allotmentsByRoom[a.room_id]) allotmentsByRoom[a.room_id] = [];
      allotmentsByRoom[a.room_id].push({
        user_id: a.user_id,
        name: a.users?.name || "Unknown",
        email: a.users?.email || "",
        branch: a.users?.branch || "",
        year: a.users?.year || 0,
        allotted_at: a.allotted_at,
      });
    }

    const result = rooms.map((room) => {
      const occupants = allotmentsByRoom[room.id] || [];
      return {
        ...room,
        hostel_name: room.hostels?.name || "",
        occupants,
        occupied: occupants.length,
        available: room.capacity - occupants.length,
        status: room.is_blocked
          ? "blocked"
          : occupants.length >= room.capacity
          ? "full"
          : "available",
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("Admin rooms error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /admin/allotments
// ======================
router.get("/allotments", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("allotments")
      .select("*, users(name, email, branch, year), rooms(room_number, floor, hostels(name))")
      .order("allotted_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch allotments" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Admin allotments error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /admin/students
// ======================
// Search/list students. Optional query param: ?search=rahul
router.get("/students", async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabaseAdmin
      .from("users")
      .select("*")
      .eq("role", "student")
      .order("name");

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,branch.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: "Failed to fetch students" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Admin students error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /admin/assign
// ======================
// Body: { "user_id": "uuid", "room_id": "uuid" }
// Admin manually assigns a student to a room (bypasses window check)
router.post("/assign", async (req, res) => {
  const { user_id, room_id } = req.body;

  if (!user_id || !room_id) {
    return res.status(400).json({ error: "user_id and room_id are required" });
  }

  try {
    // Check room capacity
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", room_id)
      .single();

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.is_blocked) return res.status(409).json({ error: "Room is blocked" });

    const { count } = await supabaseAdmin
      .from("allotments")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room_id);

    if ((count || 0) >= room.capacity) {
      return res.status(409).json({ error: "Room is full" });
    }

    // Remove existing allotment if any
    const { data: existing } = await supabaseAdmin
      .from("allotments")
      .select("room_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("allotments").delete().eq("user_id", user_id);
    }

    // Assign
    const { data, error } = await supabaseAdmin
      .from("allotments")
      .insert({ user_id, room_id })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to assign room" });
    }

    // Log
    await supabaseAdmin.from("room_change_history").insert({
      user_id,
      old_room_id: existing?.room_id || null,
      new_room_id: room_id,
    });

    return res.status(201).json({ message: "Room assigned", allotment: data });
  } catch (err) {
    console.error("Admin assign error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /admin/unassign
// ======================
// Body: { "user_id": "uuid" }
router.post("/unassign", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("allotments")
      .delete()
      .eq("user_id", user_id);

    if (error) {
      return res.status(500).json({ error: "Failed to unassign" });
    }

    return res.json({ message: "Student unassigned from room" });
  } catch (err) {
    console.error("Admin unassign error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /admin/block-room
// ======================
// Body: { "room_id": "uuid", "reason": "Maintenance" }
router.post("/block-room", async (req, res) => {
  const { room_id, reason } = req.body;

  if (!room_id) {
    return res.status(400).json({ error: "room_id is required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .update({ is_blocked: true, block_reason: reason || "Blocked by admin" })
      .eq("id", room_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to block room" });
    }

    return res.json({ message: "Room blocked", room: data });
  } catch (err) {
    console.error("Block room error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /admin/unblock-room
// ======================
router.post("/unblock-room", async (req, res) => {
  const { room_id } = req.body;

  if (!room_id) {
    return res.status(400).json({ error: "room_id is required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .update({ is_blocked: false, block_reason: null })
      .eq("id", room_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to unblock room" });
    }

    return res.json({ message: "Room unblocked", room: data });
  } catch (err) {
    console.error("Unblock room error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /admin/vacancy-map
// ======================
// Returns room-level vacancy data for heatmap
router.get("/vacancy-map", async (req, res) => {
  try {
    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .order("floor")
      .order("room_number");

    const { data: allotments } = await supabaseAdmin
      .from("allotments")
      .select("room_id");

    // Count occupants per room
    const occupancyMap = {};
    for (const a of allotments || []) {
      occupancyMap[a.room_id] = (occupancyMap[a.room_id] || 0) + 1;
    }

    const vacancyData = (rooms || []).map((room) => {
      const occupied = occupancyMap[room.id] || 0;
      const vacancyPercent =
        room.capacity > 0
          ? Math.round(((room.capacity - occupied) / room.capacity) * 100)
          : 0;

      return {
        id: room.id,
        room_number: room.room_number,
        floor: room.floor,
        capacity: room.capacity,
        occupied,
        available: room.capacity - occupied,
        vacancy_percent: vacancyPercent,
        is_blocked: room.is_blocked,
        status: room.is_blocked
          ? "blocked"
          : occupied >= room.capacity
          ? "full"
          : occupied > 0
          ? "partial"
          : "empty",
      };
    });

    return res.json(vacancyData);
  } catch (err) {
    console.error("Vacancy map error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /admin/window
// ======================
router.get("/window", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("allotment_windows")
      .select("*")
      .order("open_at", { ascending: false })
      .limit(5);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch windows" });
    }

    // Determine which one is currently active
    const now = new Date().toISOString();
    const active = (data || []).find(
      (w) => w.open_at <= now && w.close_at >= now
    );

    return res.json({ windows: data, active: active || null });
  } catch (err) {
    console.error("Admin window error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /admin/window
// ======================
// Body: { "title": "...", "open_at": "ISO", "close_at": "ISO" }
router.post("/window", async (req, res) => {
  const { title, open_at, close_at } = req.body;

  if (!title || !open_at || !close_at) {
    return res.status(400).json({ error: "title, open_at, close_at are required" });
  }

  if (new Date(close_at) <= new Date(open_at)) {
    return res.status(400).json({ error: "close_at must be after open_at" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("allotment_windows")
      .insert({
        title,
        open_at,
        close_at,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to create window" });
    }

    return res.status(201).json({ message: "Allotment window created", window: data });
  } catch (err) {
    console.error("Create window error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
