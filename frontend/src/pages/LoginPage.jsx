import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendOtp, verifyOtp, adminLogin } from "../services/api";
import toast from "react-hot-toast";
import { Mail, Shield, KeyRound, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState("student"); // "student" or "admin"
  const [step, setStep] = useState("email");   // "email" or "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ---------- Student: Send OTP ----------
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email.endsWith("@itbhu.ac.in")) {
      toast.error("Only @itbhu.ac.in emails are allowed");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(email);
      toast.success("OTP sent! Check your inbox.");
      setStep("otp");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Student: Verify OTP ----------
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("OTP must be 6 digits"); return; }
    setLoading(true);
    try {
      const res = await verifyOtp(email, otp);
      login(res.data);
      toast.success("Welcome!");
      navigate("/profile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Admin: Password Login ----------
  async function handleAdminLogin(e) {
    e.preventDefault();
    if (!adminEmail || !adminPassword) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const res = await adminLogin(adminEmail, adminPassword);
      login(res.data);
      toast.success("Admin login successful!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel - branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-logo">
            <Building2Icon />
          </div>
          <h1>Hostel Allotment System</h1>
          <p>Indian Institute of Technology (BHU) Varanasi</p>
          <div className="branding-features">
            <div className="feature-item">
              <span className="feature-dot" />
              <span>Secure OTP-based authentication</span>
            </div>
            <div className="feature-item">
              <span className="feature-dot" />
              <span>Real-time room availability</span>
            </div>
            <div className="feature-item">
              <span className="feature-dot" />
              <span>Instant allotment confirmation</span>
            </div>
          </div>
        </div>
        <div className="branding-footer">
          <span>© 2026 IIT (BHU) Varanasi — Hostel Administration</span>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Mode tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === "student" ? "active" : ""}`}
              onClick={() => { setMode("student"); setStep("email"); }}
            >
              <Mail size={16} />
              Student
            </button>
            <button
              className={`login-tab ${mode === "admin" ? "active" : ""}`}
              onClick={() => setMode("admin")}
            >
              <Shield size={16} />
              Admin
            </button>
          </div>

          {/* Student login */}
          {mode === "student" && step === "email" && (
            <form onSubmit={handleSendOtp} className="login-form">
              <h2>Student Login</h2>
              <p className="form-subtitle">Enter your institute email to receive a verification code</p>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="yourname@itbhu.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Sending...</> : "Send OTP"}
              </button>
            </form>
          )}

          {mode === "student" && step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <h2>Verify OTP</h2>
              <div className="otp-sent-info">
                <Mail size={16} />
                <span>Code sent to <strong>{email}</strong></span>
              </div>
              <div className="input-group">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={loading}
                  className="otp-input"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Verifying...</> : "Verify & Login"}
              </button>
              <button type="button" className="btn-text" onClick={() => { setStep("email"); setOtp(""); }}>
                <ArrowLeft size={14} /> Use a different email
              </button>
            </form>
          )}

          {/* Admin login */}
          {mode === "admin" && (
            <form onSubmit={handleAdminLogin} className="login-form">
              <h2>Admin Login</h2>
              <p className="form-subtitle">Warden / Staff access only</p>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="admin@itbhu.ac.in"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value.toLowerCase())}
                  required
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Logging in...</> : "Login as Admin"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple building icon for the branding panel
function Building2Icon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>
  );
}
