// ============================================================
// Allot Route — Room Selection & Switching (v2)
// ============================================================
// MAJOR CHANGES from v1:
//   - Supports ROOM SWITCHING (not just first-time allotment)
//   - Validates allotment window (open/closed)
//   - Logs room changes in room_change_history
//   - Atomic: delete old + insert new in sequence
//   - PDF slip download endpoint
//
// ENDPOINTS:
//   POST /allot          — Allot or switch room
//   GET  /allot/my       — Get current allotment
//   GET  /allot/window   — Check allotment window status
//   GET  /allot/:id/pdf  — Download allotment slip PDF
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { requireAuth } = require("../middleware/auth");
const { checkAllotmentWindow } = require("../middleware/allotmentWindow");
const { validateAllotment } = require("../services/allotment");
const { generateAllotmentSlip } = require("../services/pdfGenerator");

// ======================
// POST /allot
// ======================
// Body: { "room_id": "uuid" }
// Supports both fresh allotment AND room switching.
router.post("/", requireAuth, checkAllotmentWindow, async (req, res) => {
  const userId = req.user.id;
  const { room_id } = req.body;

  if (!room_id) {
    return res.status(400).json({ error: "room_id is required" });
  }

  try {
    // Step 1: Fetch the target room
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", room_id)
      .single();

    if (roomError && roomError.code !== "PGRST116") {
      console.error("Room fetch error:", roomError.message);
      return res.status(500).json({ error: "Failed to fetch room" });
    }

    // Step 2: Count current occupants of target room
    const { count, error: countError } = await supabaseAdmin
      .from("allotments")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room_id);

    if (countError) {
      console.error("Count error:", countError.message);
      return res.status(500).json({ error: "Failed to check occupancy" });
    }

    // Step 3: Check if user already has an allotment
    const { data: existing, error: existError } = await supabaseAdmin
      .from("allotments")
      .select("*, rooms(room_number)")
      .eq("user_id", userId)
      .maybeSingle();

    if (existError) {
      console.error("Existing check error:", existError.message);
      return res.status(500).json({ error: "Failed to check existing allotment" });
    }

    // If they're selecting the same room they already have, no-op
    if (existing && existing.room_id === room_id) {
      return res.status(409).json({ error: "You are already in this room." });
    }

    // For capacity check: if user is switching FROM another room,
    // they're not adding to the count (they're moving)
    const occupancyForCheck = count || 0;

    // Step 4: Validate with business logic
    const decision = validateAllotment({
      room,
      currentOccupancy: occupancyForCheck,
      isBlocked: room?.is_blocked || false,
      windowOpen: req.windowOpen,
    });

    if (!decision.allowed) {
      return res.status(409).json({ error: decision.reason });
    }

    // Step 5: ATOMIC SWITCH — delete old allotment, insert new one
    const oldRoomId = existing?.room_id || null;

    // Delete existing allotment (if any)
    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("allotments")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Delete old allotment error:", deleteError.message);
        return res.status(500).json({ error: "Failed to switch room. Try again." });
      }
    }

    // Insert new allotment
    const { data: newAllotment, error: insertError } = await supabaseAdmin
      .from("allotments")
      .insert({ user_id: userId, room_id })
      .select()
      .single();

    if (insertError) {
      console.error("Insert allotment error:", insertError.message);
      // If insert fails after delete, try to restore old allotment
      if (oldRoomId) {
        await supabaseAdmin
          .from("allotments")
          .insert({ user_id: userId, room_id: oldRoomId });
      }
      return res.status(500).json({ error: "Failed to allot room. Try again." });
    }

    // Step 6: Log room change in history
    await supabaseAdmin.from("room_change_history").insert({
      user_id: userId,
      old_room_id: oldRoomId,
      new_room_id: room_id,
    });

    const action = oldRoomId ? "switched" : "allotted";
    return res.status(201).json({
      message: `Room ${action} successfully!`,
      allotment: newAllotment,
    });
  } catch (err) {
    console.error("allot error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /allot/my
// ======================
router.get("/my", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabaseAdmin
      .from("allotments")
      .select("*, rooms(room_number, hostel_id, capacity, floor, hostels(name))")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Fetch my allotment error:", error.message);
      return res.status(500).json({ error: "Failed to fetch allotment" });
    }

    return res.json({ allotment: data });
  } catch (err) {
    console.error("my allotment error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// GET /allot/window
// ======================
// Returns current allotment window status
router.get("/window", requireAuth, checkAllotmentWindow, async (req, res) => {
  return res.json({
    open: req.windowOpen,
    window: req.activeWindow || null,
  });
});

// ======================
// GET /allot/:id/pdf
// ======================
// Downloads the allotment slip as PDF
router.get("/:id/pdf", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Fetch allotment with all related data
    const { data: allotment, error } = await supabaseAdmin
      .from("allotments")
      .select("*, rooms(room_number, hostels(name)), users(name, email, branch, year)")
      .eq("id", id)
      .single();

    if (error || !allotment) {
      return res.status(404).json({ error: "Allotment not found" });
    }

    // Students can only download their own slip
    if (allotment.user_id !== userId && req.userProfile?.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const verifyBaseUrl = process.env.VERIFY_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verifyUrl = `${verifyBaseUrl}/verify/${allotment.id}`;

    const pdfBuffer = await generateAllotmentSlip({
      studentName: allotment.users?.name || "Unknown",
      email: allotment.users?.email || "",
      branch: allotment.users?.branch || "",
      year: allotment.users?.year || 0,
      hostelName: allotment.rooms?.hostels?.name || "Unknown Hostel",
      roomNumber: allotment.rooms?.room_number || "",
      allotmentId: allotment.id,
      allottedAt: allotment.allotted_at,
      verifyUrl,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=allotment-slip-${allotment.rooms?.room_number || "room"}.pdf`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err.message);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
});

module.exports = router;
