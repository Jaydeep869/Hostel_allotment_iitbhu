// ============================================================
// Profile Routes — GET /profile (v2)
// ============================================================
// Profile is auto-generated from the IIT BHU email.
// No manual name/branch input needed (or allowed).
//
// GET  /profile — Fetch profile with allotment info
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { requireAuth } = require("../middleware/auth");

// ======================
// GET /profile
// ======================
// Returns profile + current allotment (if any)
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch user profile
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    // Fetch current allotment
    const { data: allotment } = await supabaseAdmin
      .from("allotments")
      .select("*, rooms(room_number, floor, hostel_id, hostels(name))")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch room change history
    const { data: history } = await supabaseAdmin
      .from("room_change_history")
      .select("*, rooms:new_room_id(room_number)")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(10);

    return res.json({
      ...user,
      allotment: allotment || null,
      roomHistory: history || [],
    });
  } catch (err) {
    console.error("profile error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
