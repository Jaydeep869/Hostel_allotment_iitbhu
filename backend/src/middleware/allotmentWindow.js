// ============================================================
// Allotment Window Middleware
// ============================================================
// Checks if there is an ACTIVE allotment window right now.
//
// HOW IT WORKS:
//   Queries `allotment_windows` table for a window where:
//     open_at <= NOW() <= close_at
//
//   If found → req.windowOpen = true, req.activeWindow = {...}
//   If not found → req.windowOpen = false
//
// Routes can then use req.windowOpen to allow/deny actions.
// Admin routes bypass this check (they can always act).
// ============================================================

const { supabaseAdmin } = require("../config/supabase");

async function checkAllotmentWindow(req, res, next) {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("allotment_windows")
      .select("*")
      .lte("open_at", now)   // open_at <= now
      .gte("close_at", now)  // close_at >= now
      .order("open_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Allotment window check error:", error.message);
      // Default to closed if we can't check
      req.windowOpen = false;
      req.activeWindow = null;
    } else if (data) {
      req.windowOpen = true;
      req.activeWindow = data;
    } else {
      req.windowOpen = false;
      req.activeWindow = null;
    }

    next();
  } catch (err) {
    console.error("Window middleware error:", err.message);
    req.windowOpen = false;
    req.activeWindow = null;
    next();
  }
}

module.exports = { checkAllotmentWindow };
