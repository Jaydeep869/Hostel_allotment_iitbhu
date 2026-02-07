// ============================================================
// Rooms Routes (v2)
// ============================================================
// GET /rooms/:hostelId — Returns rooms with occupant details
// Now includes: occupant names/branches, blocked status, floor
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { requireAuth } = require("../middleware/auth");

// ======================
// GET /rooms/:hostelId
// ======================
router.get("/:hostelId", requireAuth, async (req, res) => {
  const { hostelId } = req.params;

  try {
    // Fetch rooms with hostel info
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("hostel_id", hostelId)
      .order("floor")
      .order("room_number");

    if (roomsError) {
      console.error("Fetch rooms error:", roomsError.message);
      return res.status(500).json({ error: "Failed to fetch rooms" });
    }

    // Fetch ALL allotments with user details for this hostel's rooms
    const roomIds = rooms.map((r) => r.id);
    const { data: allotments, error: allotError } = await supabaseAdmin
      .from("allotments")
      .select("room_id, user_id, users(name, branch, year)")
      .in("room_id", roomIds);

    if (allotError) {
      console.error("Fetch allotments error:", allotError.message);
      return res.status(500).json({ error: "Failed to fetch allotment data" });
    }

    // Group occupants by room_id
    const occupantsByRoom = {};
    for (const a of allotments || []) {
      if (!occupantsByRoom[a.room_id]) occupantsByRoom[a.room_id] = [];
      occupantsByRoom[a.room_id].push({
        user_id: a.user_id,
        name: a.users?.name || "Unknown",
        branch: a.users?.branch || "",
        year: a.users?.year || 0,
      });
    }

    const result = rooms.map((room) => {
      const occupants = occupantsByRoom[room.id] || [];
      return {
        ...room,
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
    console.error("rooms error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
