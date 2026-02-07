// ============================================================
// Auth Routes — OTP Send & Verify + Admin Password Login
// ============================================================
// THREE endpoints:
//   1. POST /auth/send-otp   → Student email OTP flow
//   2. POST /auth/verify-otp → Verify OTP, auto-parse profile
//   3. POST /auth/admin-login → Admin password login (testing)
//
// NEW in v2:
//   - Auto-parses name/branch/year from email on first login
//   - Admin can log in with email + password (no OTP needed)
//   - Returns user role in response
// ============================================================

const express = require("express");
const router = express.Router();
const { supabaseAuth, supabaseAdmin } = require("../config/supabase");
const { parseEmail } = require("../services/emailParser");

const ALLOWED_DOMAIN = "@itbhu.ac.in";

// ======================
// POST /auth/send-otp
// ======================
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return res.status(403).json({
      error: `Only ${ALLOWED_DOMAIN} emails are allowed`,
    });
  }

  try {
    const { error } = await supabaseAuth.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      console.error("Supabase OTP error:", error.message, "| code:", error.code);

      // Supabase free tier: ~3-4 emails/hour limit
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        return res.status(429).json({
          error: "Email rate limit reached. Wait a few minutes and try again.",
        });
      }

      return res.status(500).json({ error: "Failed to send OTP. Try again." });
    }

    return res.json({ message: "OTP sent to your email. Check your inbox." });
  } catch (err) {
    console.error("send-otp error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /auth/verify-otp
// ======================
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    let data, error;

    // Try "email" type first (returning user), then "signup" (new user)
    ({ data, error } = await supabaseAuth.auth.verifyOtp({
      email: email.toLowerCase(),
      token: otp,
      type: "email",
    }));

    if (error) {
      ({ data, error } = await supabaseAuth.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otp,
        type: "signup",
      }));
    }

    if (error) {
      console.error("OTP verify error:", error.message);
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    // Auto-parse profile from email (name, branch, year)
    const parsed = parseEmail(data.user.email);

    // Upsert user with parsed profile data
    const upsertData = {
      id: data.user.id,
      email: data.user.email,
    };

    // Only set parsed fields if we successfully parsed
    if (parsed) {
      upsertData.name = parsed.name;
      upsertData.branch = parsed.branch;
      upsertData.year = parsed.year;
    }

    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(upsertData, { onConflict: "id" });

    if (upsertError) {
      console.error("User upsert error:", upsertError.message);
    }

    // Fetch the full profile (includes role)
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return res.json({
      message: "Verified successfully",
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || "student",
        name: profile?.name || parsed?.name || null,
        branch: profile?.branch || parsed?.branch || null,
        year: profile?.year || parsed?.year || null,
      },
    });
  } catch (err) {
    console.error("verify-otp error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /auth/admin-login
// ======================
// Admin logs in with email + password (no OTP).
// Body: { "email": "admin@itbhu.ac.in", "password": "12345678" }
router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Use Supabase Auth's password sign-in
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.error("Admin login error:", error.message);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify this user is actually an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({ error: "This account is not an admin" });
    }

    return res.json({
      message: "Admin login successful",
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        role: "admin",
        name: profile.name,
      },
    });
  } catch (err) {
    console.error("admin-login error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================
// POST /auth/seed-admin
// ======================
// One-time endpoint to create the admin user in both Supabase Auth
// AND the users table. Uses the Supabase Admin API so no dashboard
// steps are needed.
//
// HOW IT WORKS:
//   1. supabaseAdmin.auth.admin.createUser() — creates a user in
//      Supabase Auth with email + password, auto-confirmed.
//   2. Inserts a row into our `users` table with role = 'admin'.
//
// WHY admin API?
//   Normal signUp() sends a confirmation email. The admin API
//   bypasses that and marks the user as confirmed immediately.
//
// SAFETY: Only works once — if the admin already exists it returns
// a helpful message instead of crashing.
router.post("/seed-admin", async (req, res) => {
  const email = "admin@itbhu.ac.in";
  const password = "12345678";

  try {
    // Step 1: Create user in Supabase Auth using the Admin API
    // email_confirm: true means the user is auto-confirmed (no email needed)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      // If user already exists in Auth, try to find their ID
      if (authError.message.includes("already been registered")) {
        // Fetch the existing user by email
        const { data: listData } =
          await supabaseAdmin.auth.admin.listUsers();

        const existingUser = listData?.users?.find(
          (u) => u.email === email
        );

        if (existingUser) {
          // Make sure they exist in our users table as admin
          await supabaseAdmin.from("users").upsert(
            {
              id: existingUser.id,
              email,
              name: "Hostel Warden",
              branch: "ADMIN",
              year: 1,
              role: "admin",
            },
            { onConflict: "id" }
          );

          return res.json({
            message:
              "Admin auth user already existed. Ensured users table row has role=admin.",
            email,
            password,
          });
        }

        return res
          .status(409)
          .json({ error: "Admin already registered but could not find user ID" });
      }

      console.error("seed-admin auth error:", authError.message);
      return res.status(500).json({ error: authError.message });
    }

    // Step 2: Insert into our users table with role = 'admin'
    const { error: insertError } = await supabaseAdmin.from("users").upsert(
      {
        id: authData.user.id,
        email,
        name: "Hostel Warden",
        branch: "ADMIN",
        year: 1,
        role: "admin",
      },
      { onConflict: "id" }
    );

    if (insertError) {
      console.error("seed-admin users insert error:", insertError.message);
      return res
        .status(500)
        .json({ error: "Auth user created but failed to insert into users table" });
    }

    console.log("✅ Admin seeded:", email);

    return res.json({
      message: "Admin created successfully!",
      email,
      password,
      id: authData.user.id,
    });
  } catch (err) {
    console.error("seed-admin error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
