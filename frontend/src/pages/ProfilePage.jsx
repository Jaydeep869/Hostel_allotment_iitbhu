import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfile, getMyAllotment, getAllotmentWindow, downloadSlipPdf } from "../services/api";
import toast from "react-hot-toast";
import { User, Mail, BookOpen, Calendar, Home, Clock, ArrowRight, Download, History } from "lucide-react";
import { saveAs } from "file-saver";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [allotment, setAllotment] = useState(null);
  const [windowStatus, setWindowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, allotRes, windowRes] = await Promise.all([
          getProfile(),
          getMyAllotment(),
          getAllotmentWindow(),
        ]);
        setProfile(profileRes.data);
        setAllotment(allotRes.data.allotment);
        setWindowStatus(windowRes.data);
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  async function handleDownloadSlip() {
    if (!allotment?.id) return;
    setDownloading(true);
    try {
      const res = await downloadSlipPdf(allotment.id);
      saveAs(res.data, `allotment-slip-${allotment.rooms?.room_number || "room"}.pdf`);
      toast.success("Slip downloaded!");
    } catch {
      toast.error("Failed to download slip");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  const windowOpen = windowStatus?.open;

  return (
    <div className="page-container">
      <div className="profile-layout">
        {/* Profile Card */}
        <div className="card profile-card">
          <div className="card-header">
            <div className="avatar">
              {(profile?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{profile?.name || "Student"}</h2>
              <p className="text-muted">{profile?.email}</p>
            </div>
          </div>

          <div className="info-grid">
            <InfoItem icon={<BookOpen size={16} />} label="Branch" value={profile?.branch || "—"} />
            <InfoItem icon={<Calendar size={16} />} label="Year" value={profile?.year ? `Year ${profile.year}` : "—"} />
            <InfoItem icon={<Mail size={16} />} label="Email" value={profile?.email || "—"} />
            <InfoItem icon={<User size={16} />} label="Role" value={profile?.role === "admin" ? "Administrator" : "Student"} />
          </div>
        </div>

        {/* Current Room Card */}
        <div className="card room-status-card">
          <h3>
            <Home size={18} />
            Current Room
          </h3>

          {allotment ? (
            <div className="current-room-info">
              <div className="room-big-number">{allotment.rooms?.room_number}</div>
              <div className="room-meta">
                <span>{allotment.rooms?.hostels?.name}</span>
                <span>Floor {allotment.rooms?.floor}</span>
                <span>
                  Allotted {new Date(allotment.allotted_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </span>
              </div>

              <div className="room-actions">
                <button className="btn-primary btn-sm" onClick={handleDownloadSlip} disabled={downloading}>
                  <Download size={16} />
                  {downloading ? "Downloading..." : "Download Slip"}
                </button>
                {windowOpen && (
                  <button className="btn-outline btn-sm" onClick={() => navigate("/rooms")}>
                    <ArrowRight size={16} />
                    Change Room
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-room">
              <p>No room allotted yet</p>
              {windowOpen ? (
                <button className="btn-primary" onClick={() => navigate("/rooms")}>
                  <ArrowRight size={16} />
                  Select a Room
                </button>
              ) : (
                <p className="text-muted text-sm">Allotment window is currently closed</p>
              )}
            </div>
          )}
        </div>

        {/* Allotment Window Status */}
        <div className="card window-card">
          <h3>
            <Clock size={18} />
            Allotment Window
          </h3>
          {windowOpen ? (
            <div className="window-status open">
              <span className="status-dot open" />
              <div>
                <strong>Window is OPEN</strong>
                <p className="text-sm text-muted">
                  {windowStatus.window?.title} — Closes{" "}
                  {new Date(windowStatus.window?.close_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ) : (
            <div className="window-status closed">
              <span className="status-dot closed" />
              <div>
                <strong>Window is CLOSED</strong>
                <p className="text-sm text-muted">Room selection is not available right now</p>
              </div>
            </div>
          )}
        </div>

        {/* Room Change History */}
        {profile?.roomHistory && profile.roomHistory.length > 0 && (
          <div className="card history-card">
            <h3>
              <History size={18} />
              Room Change History
            </h3>
            <div className="history-list">
              {profile.roomHistory.map((h, i) => (
                <div key={i} className="history-item">
                  <span className="history-dot" />
                  <div>
                    <span>Moved to Room <strong>{h.rooms?.room_number || "?"}</strong></span>
                    <span className="text-sm text-muted">
                      {new Date(h.changed_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="info-item">
      <span className="info-icon">{icon}</span>
      <div>
        <span className="info-label">{label}</span>
        <span className="info-value">{value}</span>
      </div>
    </div>
  );
}
