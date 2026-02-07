#!/usr/bin/env node
// ============================================================
// Seed Admin Script
// ============================================================
// Run this script to create an admin user in both Supabase Auth
// and the users table. No manual dashboard steps needed.
//
// Usage:  node scripts/seed-admin.js
// ============================================================

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ADMIN_EMAIL = "admin@itbhu.ac.in";
const ADMIN_PASSWORD = "12345678";

async function seedAdmin() {
  console.log(`\n🔧 Seeding admin user: ${ADMIN_EMAIL}\n`);

  // Step 1: Create user in Supabase Auth
  console.log("Step 1: Creating user in Supabase Auth...");
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // auto-confirm, no email verification needed
    });

  let userId;

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("   → User already exists in Auth. Finding their ID...");

      // Find existing user
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === ADMIN_EMAIL);

      if (!existing) {
        console.error("❌ User registered but couldn't find them. Aborting.");
        process.exit(1);
      }

      userId = existing.id;
      console.log(`   → Found existing user: ${userId}`);

      // Force-update password so it's always in sync
      console.log("   → Updating password to ensure it matches...");
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        userId,
        { password: ADMIN_PASSWORD, email_confirm: true }
      );
      if (updateErr) {
        console.error("❌ Password update error:", updateErr.message);
      } else {
        console.log("   → Password updated successfully");
      }
    } else {
      console.error("❌ Auth error:", authError.message);
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
    console.log(`   → Created auth user: ${userId}`);
  }

  // Step 2: Upsert into users table with role = admin
  console.log("Step 2: Upserting into users table with role=admin...");
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: userId,
      email: ADMIN_EMAIL,
      name: "Hostel Warden",
      branch: "ADMIN",
      year: 1,
      role: "admin",
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("❌ Users table upsert error:", upsertError.message);
    process.exit(1);
  }

  console.log("   → Users table updated with role=admin");

  console.log("\n✅ Admin seeded successfully!");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   UUID:     ${userId}\n`);
}

seedAdmin().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
