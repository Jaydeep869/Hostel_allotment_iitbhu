import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHostels, getRooms, allotRoom, getMyAllotment, getAllotmentWindow } from "../services/api";
import toast from "react-hot-toast";
import { Users, Lock, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [myAllotment, setMyAllotment] = useState(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allotting, setAllotting] = useState(false);
  const [activeFloor, setActiveFloor] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        const [hostelRes, allotRes, windowRes] = await Promise.all([
          getHostels(),
          getMyAllotment(),
          getAllotmentWindow(),
        ]);
        setHostels(hostelRes.data);
        setMyAllotment(allotRes.data.allotment);
        setWindowOpen(windowRes.data.open);
        if (hostelRes.data.length > 0) setSelectedHostel(hostelRes.data[0]);
      } catch {
        toast.error("Failed to load data");
      }
    }
    init();
  }, []);

  // Fetch rooms when hostel selected
  useEffect(() => {
    if (!selectedHostel) return;
    async function fetchRooms() {
      setLoading(true);
      try {
        const res = await getRooms(selectedHostel.id);
        setRooms(res.data);
        // Find unique floors
        const floors = [...new Set(res.data.map(r => r.floor))].sort();
        if (floors.length > 0 && activeFloor === null) setActiveFloor(floors[0]);
      } catch {
        toast.error("Failed to load rooms");
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, [selectedHostel]);

  const floors = [...new Set(rooms.map(r => r.floor))].sort();
  const filteredRooms = activeFloor !== null
    ? rooms.filter(r => r.floor === activeFloor)
    : rooms;

  // Is this room the user's current room?
  const isMyRoom = (roomId) => myAllotment?.room_id === roomId;

  async function handleAllot() {
    if (!selectedRoom) return;
    if (!windowOpen) { toast.error("Allotment window is closed"); return; }

    const action = myAllotment ? "switch to" : "select";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} Room ${selectedRoom.room_number}?`
    );
    if (!confirmed) return;

    setAllotting(true);
    try {
      await allotRoom(selectedRoom.id);
      toast.success(`Room ${selectedRoom.room_number} allotted!`);
      // Refresh data
      const [roomsRes, allotRes] = await Promise.all([
        getRooms(selectedHostel.id),
        getMyAllotment(),
      ]);
      setRooms(roomsRes.data);
      setMyAllotment(allotRes.data.allotment);
      setSelectedRoom(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to allot room");
    } finally {
      setAllotting(false);
    }
  }

  function getRoomStatus(room) {
    if (room.is_blocked) return "blocked";
    if (isMyRoom(room.id)) return "yours";
    if (room.occupied >= room.capacity) return "full";
    return "available";
  }

  function getStatusColor(status) {
    switch (status) {
      case "available": return "var(--green)";
      case "full": return "var(--red)";
      case "yours": return "var(--primary)";
      case "blocked": return "var(--gray-400)";
      default: return "var(--gray-400)";
    }
  }

  return (
    <div className="page-container">
      <div className="rooms-layout">
        {/* Header */}
        <div className="rooms-header">
          <div>
            <button className="btn-text" onClick={() => navigate("/profile")}>
              <ArrowLeft size={16} /> Back to Profile
            </button>
            <h1>{selectedHostel?.name || "Hostel Rooms"}</h1>
            <p className="text-muted">
              {windowOpen
                ? "Select a room to allot or switch"
                : "View only — allotment window is closed"}
            </p>
          </div>

          {/* Window status badge */}
          <div className={`window-badge ${windowOpen ? "open" : "closed"}`}>
            <span className="status-dot-sm" />
            {windowOpen ? "Window Open" : "Window Closed"}
          </div>
        </div>

        {/* Legend */}
        <div className="rooms-legend">
          <span className="legend-chip available"><span className="legend-dot" style={{background:"var(--green)"}} /> Available</span>
          <span className="legend-chip full"><span className="legend-dot" style={{background:"var(--red)"}} /> Full</span>
          <span className="legend-chip yours"><span className="legend-dot" style={{background:"var(--primary)"}} /> Your Room</span>
          <span className="legend-chip blocked"><span className="legend-dot" style={{background:"var(--gray-400)"}} /> Blocked</span>
        </div>

        {/* Floor tabs */}
        {floors.length > 1 && (
          <div className="floor-tabs">
            {floors.map(f => (
              <button
                key={f}
                className={`floor-tab ${activeFloor === f ? "active" : ""}`}
                onClick={() => setActiveFloor(f)}
              >
                Floor {f}
              </button>
            ))}
          </div>
        )}

        {/* My current room banner */}
        {myAllotment && (
          <div className="my-room-banner">
            <CheckCircle2 size={18} />
            <span>
              You are currently in <strong>Room {myAllotment.rooms?.room_number}</strong>
              {windowOpen && " — click another room to switch"}
            </span>
          </div>
        )}

        {/* Room Grid */}
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading rooms...</p></div>
        ) : (
          <div className="rooms-grid-v2">
            {filteredRooms.map((room) => {
              const status = getRoomStatus(room);
              const isSelected = selectedRoom?.id === room.id;
              const isExpanded = expandedRoom === room.id;
              const canSelect = windowOpen && status === "available" && !allotting;

              return (
                <div
                  key={room.id}
                  className={`room-card ${status} ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    if (canSelect) setSelectedRoom(room);
                    setExpandedRoom(isExpanded ? null : room.id);
                  }}
                >
                  <div className="room-card-header">
                    <span className="room-number-lg">{room.room_number}</span>
                    <span
                      className="room-status-dot"
                      style={{ background: getStatusColor(status) }}
                      title={status}
                    />
                  </div>

                  <div className="room-card-capacity">
                    <Users size={14} />
                    <span>{room.occupied}/{room.capacity}</span>
                  </div>

                  {status === "yours" && (
                    <div className="room-yours-badge">Your Room</div>
                  )}
                  {status === "blocked" && (
                    <div className="room-blocked-badge">
                      <Lock size={12} /> Blocked
                    </div>
                  )}

                  {/* Expanded: show occupants */}
                  {isExpanded && room.occupants && room.occupants.length > 0 && (
                    <div className="room-occupants">
                      <div className="occupants-title">Occupants</div>
                      {room.occupants.map((occ, i) => (
                        <div key={i} className="occupant-row">
                          <span className="occupant-name">{occ.name}</span>
                          <span className="occupant-branch">{occ.branch}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && (!room.occupants || room.occupants.length === 0) && (
                    <div className="room-occupants">
                      <div className="occupants-empty">No occupants</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom action bar */}
        {selectedRoom && windowOpen && (
          <div className="allot-bar">
            <div className="allot-bar-info">
              <span>Selected: <strong>Room {selectedRoom.room_number}</strong></span>
              <span className="text-muted">
                {selectedRoom.occupied}/{selectedRoom.capacity} occupied
              </span>
            </div>
            <button className="btn-primary" onClick={handleAllot} disabled={allotting}>
              {allotting ? (
                <><Loader2 size={18} className="spin" /> Processing...</>
              ) : myAllotment ? (
                "Switch to This Room"
              ) : (
                "Confirm Allotment"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
