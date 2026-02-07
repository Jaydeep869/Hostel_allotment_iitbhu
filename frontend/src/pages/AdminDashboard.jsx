import { useState, useEffect, useCallback } from "react";
import {
  getAdminStats, getAdminRooms, getAdminAllotments, getAdminStudents,
  adminAssign, adminUnassign, adminBlockRoom, adminUnblockRoom,
  getVacancyMap, getAdminWindows, createAdminWindow
} from "../services/api";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Home, Users, Clock, BarChart3,
  Search, Lock, Unlock, UserPlus, UserMinus, Plus,
  Loader2, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
    { id: "rooms", label: "Rooms", icon: <Home size={16} /> },
    { id: "allotments", label: "Allotments", icon: <Users size={16} /> },
    { id: "heatmap", label: "Vacancy Map", icon: <BarChart3 size={16} /> },
    { id: "window", label: "Window", icon: <Clock size={16} /> },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h3>Admin Panel</h3>
          <p className="text-sm text-muted">Warden Dashboard</p>
        </div>
        <nav className="admin-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`admin-nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-content">
        {tab === "overview" && <OverviewTab />}
        {tab === "rooms" && <RoomsTab />}
        {tab === "allotments" && <AllotmentsTab />}
        {tab === "heatmap" && <HeatmapTab />}
        {tab === "window" && <WindowTab />}
      </div>
    </div>
  );
}

// ============== OVERVIEW TAB ==============
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(r => setStats(r.data)).catch(() => toast.error("Failed to load stats")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <h2 className="admin-page-title">Dashboard Overview</h2>
      <div className="stats-grid">
        <StatCard label="Total Students" value={stats?.totalStudents} color="var(--primary)" icon={<Users size={24} />} />
        <StatCard label="Total Rooms" value={stats?.totalRooms} color="var(--green)" icon={<Home size={24} />} />
        <StatCard label="Allotted" value={stats?.totalAllotments} color="var(--blue)" icon={<CheckCircle2 size={24} />} />
        <StatCard label="Blocked Rooms" value={stats?.blockedRooms} color="var(--red)" icon={<Lock size={24} />} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div>
        <div className="stat-value">{value ?? "—"}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ============== ROOMS TAB ==============
function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null); // room object
  const [studentSearch, setStudentSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRooms = useCallback(() => {
    setLoading(true);
    getAdminRooms().then(r => setRooms(r.data)).catch(() => toast.error("Failed")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  async function handleBlock(roomId) {
    const reason = prompt("Block reason (optional):");
    if (reason === null) return;
    try {
      await adminBlockRoom(roomId, reason);
      toast.success("Room blocked");
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  }

  async function handleUnblock(roomId) {
    try {
      await adminUnblockRoom(roomId);
      toast.success("Room unblocked");
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  }

  async function handleAssign(userId) {
    if (!assignModal) return;
    setActionLoading(true);
    try {
      await adminAssign(userId, assignModal.id);
      toast.success("Student assigned!");
      setAssignModal(null);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setActionLoading(false); }
  }

  async function handleUnassign(userId) {
    if (!window.confirm("Remove this student's allotment?")) return;
    try {
      await adminUnassign(userId);
      toast.success("Student unassigned");
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  }

  // Search students for assign modal
  useEffect(() => {
    if (!assignModal) return;
    const timer = setTimeout(() => {
      getAdminStudents(studentSearch).then(r => setStudents(r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, assignModal]);

  const filtered = search
    ? rooms.filter(r => r.room_number.includes(search) || r.status.includes(search))
    : rooms;

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="admin-page-header">
        <h2 className="admin-page-title">Room Management</h2>
        <div className="search-bar">
          <Search size={16} />
          <input placeholder="Search rooms..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Floor</th>
              <th>Capacity</th>
              <th>Occupants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(room => (
              <tr key={room.id}>
                <td><strong>{room.room_number}</strong></td>
                <td>{room.floor}</td>
                <td>{room.occupied}/{room.capacity}</td>
                <td>
                  {room.occupants?.length > 0 ? (
                    <div className="occupant-chips">
                      {room.occupants.map((o, i) => (
                        <div key={i} className="occupant-chip">
                          <span>{o.name} ({o.branch})</span>
                          <button className="chip-remove" title="Unassign" onClick={() => handleUnassign(o.user_id)}>
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">Empty</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${room.status}`}>{room.status}</span>
                </td>
                <td>
                  <div className="action-btns">
                    {!room.is_blocked && room.available > 0 && (
                      <button className="btn-icon" title="Assign student" onClick={() => { setAssignModal(room); setStudentSearch(""); }}>
                        <UserPlus size={16} />
                      </button>
                    )}
                    {room.is_blocked ? (
                      <button className="btn-icon" title="Unblock" onClick={() => handleUnblock(room.id)}>
                        <Unlock size={16} />
                      </button>
                    ) : (
                      <button className="btn-icon danger" title="Block" onClick={() => handleBlock(room.id)}>
                        <Lock size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Student Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Student to Room {assignModal.room_number}</h3>
            <div className="search-bar" style={{ marginBottom: "1rem" }}>
              <Search size={16} />
              <input
                placeholder="Search by name, email, or branch..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="student-list">
              {students.map(s => (
                <div key={s.id} className="student-list-item">
                  <div>
                    <strong>{s.name || s.email}</strong>
                    <span className="text-sm text-muted"> — {s.branch} Year {s.year}</span>
                  </div>
                  <button className="btn-sm btn-primary" onClick={() => handleAssign(s.id)} disabled={actionLoading}>
                    {actionLoading ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
                    Assign
                  </button>
                </div>
              ))}
              {students.length === 0 && <p className="text-muted text-center">No students found</p>}
            </div>
            <button className="btn-outline" onClick={() => setAssignModal(null)} style={{ marginTop: "1rem", width: "100%" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== ALLOTMENTS TAB ==============
function AllotmentsTab() {
  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAllotments().then(r => setAllotments(r.data)).catch(() => toast.error("Failed")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <h2 className="admin-page-title">All Allotments ({allotments.length})</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Room</th>
              <th>Hostel</th>
              <th>Allotted On</th>
            </tr>
          </thead>
          <tbody>
            {allotments.map(a => (
              <tr key={a.id}>
                <td><strong>{a.users?.name || "—"}</strong></td>
                <td className="text-muted">{a.users?.email || "—"}</td>
                <td>{a.users?.branch || "—"}</td>
                <td><strong>{a.rooms?.room_number || "—"}</strong></td>
                <td>{a.rooms?.hostels?.name || "—"}</td>
                <td className="text-muted">
                  {new Date(a.allotted_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </td>
              </tr>
            ))}
            {allotments.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted">No allotments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== HEATMAP TAB ==============
function HeatmapTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVacancyMap().then(r => setData(r.data)).catch(() => toast.error("Failed")).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const floors = [...new Set(data.map(d => d.floor))].sort();

  function getHeatColor(room) {
    if (room.is_blocked) return "#94a3b8";
    if (room.vacancy_percent === 0) return "#ef4444";
    if (room.vacancy_percent <= 50) return "#f59e0b";
    return "#22c55e";
  }

  return (
    <div>
      <h2 className="admin-page-title">Vacancy Heatmap</h2>
      <div className="heatmap-legend">
        <span><span className="heatmap-dot" style={{ background: "#22c55e" }} /> Empty</span>
        <span><span className="heatmap-dot" style={{ background: "#f59e0b" }} /> Partial</span>
        <span><span className="heatmap-dot" style={{ background: "#ef4444" }} /> Full</span>
        <span><span className="heatmap-dot" style={{ background: "#94a3b8" }} /> Blocked</span>
      </div>

      {floors.map(floor => (
        <div key={floor} className="heatmap-floor">
          <h3 className="heatmap-floor-title">Floor {floor}</h3>
          <div className="heatmap-grid">
            {data.filter(d => d.floor === floor).map(room => (
              <div
                key={room.id}
                className="heatmap-cell"
                style={{ backgroundColor: getHeatColor(room) }}
                title={`Room ${room.room_number}: ${room.occupied}/${room.capacity} (${room.vacancy_percent}% vacant)`}
              >
                <span className="heatmap-room-num">{room.room_number}</span>
                <span className="heatmap-room-info">{room.occupied}/{room.capacity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============== WINDOW TAB ==============
function WindowTab() {
  const [windows, setWindows] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchWindows = useCallback(() => {
    setLoading(true);
    getAdminWindows()
      .then(r => { setWindows(r.data.windows || []); setActive(r.data.active); })
      .catch(() => toast.error("Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchWindows(); }, [fetchWindows]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title || !openAt || !closeAt) { toast.error("Fill all fields"); return; }
    setCreating(true);
    try {
      await createAdminWindow({
        title,
        open_at: new Date(openAt).toISOString(),
        close_at: new Date(closeAt).toISOString(),
      });
      toast.success("Window created!");
      setTitle(""); setOpenAt(""); setCloseAt("");
      fetchWindows();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setCreating(false); }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <h2 className="admin-page-title">Allotment Windows</h2>

      {/* Current status */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {active ? <CheckCircle2 size={18} color="var(--green)" /> : <AlertCircle size={18} color="var(--red)" />}
          {active ? "Window is OPEN" : "Window is CLOSED"}
        </h3>
        {active && (
          <p className="text-muted">
            {active.title} — Open from{" "}
            {new Date(active.open_at).toLocaleString("en-IN")} to{" "}
            {new Date(active.close_at).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {/* Create new window */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}><Plus size={16} /> Create New Window</h3>
        <form onSubmit={handleCreate} className="window-form">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Semester 2 Allotment" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Opens At</label>
              <input type="datetime-local" value={openAt} onChange={e => setOpenAt(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Closes At</label>
              <input type="datetime-local" value={closeAt} onChange={e => setCloseAt(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? <><Loader2 size={16} className="spin" /> Creating...</> : "Create Window"}
          </button>
        </form>
      </div>

      {/* History */}
      {windows.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: "0.75rem" }}>Recent Windows</h3>
          {windows.map(w => {
            const now = new Date();
            const isActive = new Date(w.open_at) <= now && new Date(w.close_at) >= now;
            const isPast = new Date(w.close_at) < now;
            return (
              <div key={w.id} className={`window-item ${isActive ? "active" : isPast ? "past" : "upcoming"}`}>
                <div>
                  <strong>{w.title}</strong>
                  <p className="text-sm text-muted">
                    {new Date(w.open_at).toLocaleString("en-IN")} → {new Date(w.close_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className={`status-badge ${isActive ? "available" : isPast ? "full" : "blocked"}`}>
                  {isActive ? "Active" : isPast ? "Ended" : "Upcoming"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============== SHARED ==============
function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}
