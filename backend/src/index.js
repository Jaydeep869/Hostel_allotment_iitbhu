// ============================================================
// Express Entry Point — src/index.js
// ============================================================
// This is the main file that:
//   1. Loads environment variables from .env
//   2. Creates the Express app
//   3. Sets up middleware (CORS, JSON parsing, rate limiting)
//   4. Mounts all route files
//   5. Starts listening on the configured port
//
// EXECUTION FLOW:
//   .env loaded → Express created → middleware applied →
//   routes mounted → server.listen()
//
// RATE LIMITING (addon):
//   We added rate limiting on auth routes to prevent abuse.
//   Max 5 OTP requests per 15 minutes per IP address.
// ============================================================

// Step 1: Load .env BEFORE anything else
// (so process.env.* is available everywhere)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Import route handlers
const authRoutes = require("./routes/auth");
const hostelRoutes = require("./routes/hostels");
const roomRoutes = require("./routes/rooms");
const allotRoutes = require("./routes/allot");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");
const verifyRoutes = require("./routes/verify");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------

// CORS: Allow requests from the React frontend
// Without this, the browser will block requests from localhost:5173
// to localhost:5000 (different ports = different origins)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies
// Without this, req.body would be undefined for POST requests
app.use(express.json());

// Rate limiter for auth routes (prevent OTP spam)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // Max 10 requests per window per IP
  message: { error: "Too many requests. Try again in 15 minutes." },
});

// ---------- Routes ----------

// Health check — useful for deployment monitoring
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount routes at their paths
app.use("/auth", authLimiter, authRoutes);   // POST /auth/send-otp, /auth/verify-otp, /auth/admin-login
app.use("/hostels", hostelRoutes);           // GET /hostels
app.use("/rooms", roomRoutes);               // GET /rooms/:hostelId
app.use("/allot", allotRoutes);              // POST /allot, GET /allot/my, /allot/window, /allot/:id/pdf
app.use("/profile", profileRoutes);          // GET /profile
app.use("/admin", adminRoutes);              // Admin dashboard APIs
app.use("/verify", verifyRoutes);            // GET /verify/:allotmentId (QR code)

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`\n🏠 Hostel Allotment API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
