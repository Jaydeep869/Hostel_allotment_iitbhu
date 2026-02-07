// ============================================================
// Auth Middleware — JWT Verification + Role Checks
// ============================================================
// THREE middleware functions:
//
//   1. requireAuth  — Verifies JWT, attaches req.user
//                     Also fetches user's role from our users table
//
//   2. requireAdmin — Must be called AFTER requireAuth
//                     Checks req.userProfile.role === 'admin'
//                     Returns 403 if not admin
//
//   3. requireStudent — Must be called AFTER requireAuth
//                       Checks role === 'student'
//
// WHY fetch role from DB (not JWT)?
//   Supabase JWTs contain basic auth info but NOT our custom
//   role field. We need to query our `users` table for that.
// ============================================================

const { supabaseAdmin } = require("../config/supabase");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify JWT with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach Supabase auth user
    req.user = data.user;

    // Also fetch our custom user profile (for role, name, etc.)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      // User exists in auth but not in our users table yet
      // This happens on first login before profile is created
      req.userProfile = null;
    } else {
      req.userProfile = profile;
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Requires the user to be an admin.
 * MUST be used AFTER requireAuth in the middleware chain.
 * Example: router.get("/admin/rooms", requireAuth, requireAdmin, handler)
 */
function requireAdmin(req, res, next) {
  if (!req.userProfile || req.userProfile.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

/**
 * Requires the user to be a student.
 * MUST be used AFTER requireAuth.
 */
function requireStudent(req, res, next) {
  if (!req.userProfile || req.userProfile.role !== "student") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireStudent };
