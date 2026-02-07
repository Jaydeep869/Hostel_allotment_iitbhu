import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyAllotment, getProfile, downloadSlipPdf } from "../services/api";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { CheckCircle2, Download, ArrowLeft, Home, User, BookOpen, Calendar, Loader2 } from "lucide-react";

export default function ConfirmationPage() {
  const [allotment, setAllotment] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [allotRes, profileRes] = await Promise.all([
          getMyAllotment(),
          getProfile(),
        ]);
        if (!allotRes.data.allotment) { navigate("/rooms"); return; }
        setAllotment(allotRes.data.allotment);
        setProfile(profileRes.data);
      } catch {
        navigate("/rooms");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  async function handleDownload() {
    if (!allotment?.id) return;
    setDownloading(true);
    try {
      const res = await downloadSlipPdf(allotment.id);
      saveAs(res.data, `allotment-slip-${allotment.rooms?.room_number}.pdf`);
      toast.success("Slip downloaded!");
    } catch {
      toast.error("Failed to download");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="confirmation-layout">
        <div className="confirmation-hero">
          <div className="success-checkmark">
            <CheckCircle2 size={56} />
          </div>
          <h1>Room Allotted Successfully!</h1>
          <p className="text-muted">Your room has been confirmed. Download your allotment slip below.</p>
        </div>

        <div className="card confirmation-details-card">
          <div className="conf-section">
            <h3><User size={16} /> Student Details</h3>
            <div className="conf-grid">
              <ConfRow label="Name" value={profile?.name} />
              <ConfRow label="Email" value={profile?.email} />
              <ConfRow label="Branch" value={profile?.branch} />
              <ConfRow label="Year" value={profile?.year ? `Year ${profile.year}` : "—"} />
            </div>
          </div>

          <div className="conf-divider" />

          <div className="conf-section">
            <h3><Home size={16} /> Room Details</h3>
            <div className="conf-grid">
              <ConfRow label="Hostel" value={allotment?.rooms?.hostels?.name} />
              <ConfRow label="Room Number" value={allotment?.rooms?.room_number} highlight />
              <ConfRow label="Floor" value={`Floor ${allotment?.rooms?.floor || "—"}`} />
              <ConfRow
                label="Allotted On"
                value={allotment?.allotted_at
                  ? new Date(allotment.allotted_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric"
                    })
                  : "—"
                }
              />
            </div>
          </div>
        </div>

        <div className="confirmation-actions">
          <button className="btn-primary btn-lg" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <><Loader2 size={18} className="spin" /> Generating PDF...</>
            ) : (
              <><Download size={18} /> Download Allotment Slip</>
            )}
          </button>
          <button className="btn-outline" onClick={() => navigate("/profile")}>
            <ArrowLeft size={16} /> Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfRow({ label, value, highlight }) {
  return (
    <div className={`conf-row ${highlight ? "highlight" : ""}`}>
      <span className="conf-label">{label}</span>
      <span className="conf-value">{value || "—"}</span>
    </div>
  );
}
