// ============================================================
// Hostels Routes
// ============================================================
// GET /hostels — Returns list of all hostels
//
// Currently only "Satish Dhawan Hostel" exists.
// This route is protected — user must be logged in.
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { requireAuth } = require("../middleware/auth");

// ======================
// GET /hostels
// ======================
// Response: [{ id, name, total_rooms }]
router.get("/", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("hostels")
      .select("*")
      .order("name");

    if (error) {
      console.error("Fetch hostels error:", error.message);
      return res.status(500).json({ error: "Failed to fetch hostels" });
    }

    return res.json(data);
  } catch (err) {
    console.error("hostels error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
