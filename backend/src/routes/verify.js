// ============================================================
// Verify Route — QR Code Allotment Verification
// ============================================================
// When someone scans the QR code on the allotment slip,
// it hits this endpoint. Returns allotment details if valid.
//
// PUBLIC endpoint — no auth required (warden scans with phone)
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

// ======================
// GET /verify/:allotmentId
// ======================
// Returns allotment details for QR code verification
router.get("/:allotmentId", async (req, res) => {
  const { allotmentId } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from("allotments")
      .select("*, users(name, email, branch, year), rooms(room_number, floor, hostels(name))")
      .eq("id", allotmentId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        valid: false,
        message: "Allotment not found. This may be an invalid or expired QR code.",
      });
    }

    return res.json({
      valid: true,
      message: "Allotment verified successfully",
      allotment: {
        id: data.id,
        student_name: data.users?.name || "Unknown",
        email: data.users?.email || "",
        branch: data.users?.branch || "",
        year: data.users?.year || 0,
        hostel: data.rooms?.hostels?.name || "Unknown",
        room_number: data.rooms?.room_number || "",
        floor: data.rooms?.floor || 0,
        allotted_at: data.allotted_at,
      },
    });
  } catch (err) {
    console.error("Verify error:", err.message);
    return res.status(500).json({ valid: false, message: "Verification failed" });
  }
});

module.exports = router;
