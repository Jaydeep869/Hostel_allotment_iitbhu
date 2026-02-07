// ============================================================
// Supabase Client Configuration
// ============================================================
// We create TWO Supabase clients:
//   1. supabaseAuth  — uses the ANON key, for auth operations
//                      (sending OTP, verifying tokens)
//   2. supabaseAdmin — uses the SERVICE_ROLE key, for DB
//                      operations that bypass Row Level Security
//
// WHY two clients?
//   - The anon key respects RLS policies (safe for auth flows)
//   - The service_role key has full DB access (needed for
//     inserting/reading data on behalf of users from backend)
//
// COMMON MISTAKE: Using service_role key on the frontend.
//   Never do this — it gives full DB access to anyone.
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for authentication operations (respects RLS)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Client for database operations (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabaseAuth, supabaseAdmin };
