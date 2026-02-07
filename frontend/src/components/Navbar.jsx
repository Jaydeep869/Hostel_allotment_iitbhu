import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, LayoutDashboard, Home, Building2 } from "lucide-react";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/");
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => navigate(isAdmin ? "/admin" : "/")}>
          <Building2 size={22} />
          <span>IIT BHU Hostel</span>
        </div>

        {user && !isAdmin && (
          <div className="nav-links">
            <button
              className={`nav-link ${isActive("/profile") ? "active" : ""}`}
              onClick={() => navigate("/profile")}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
            <button
              className={`nav-link ${isActive("/rooms") ? "active" : ""}`}
              onClick={() => navigate("/rooms")}
            >
              <Home size={16} />
              <span>Rooms</span>
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="nav-links">
            <button
              className={`nav-link ${isActive("/admin") ? "active" : ""}`}
              onClick={() => navigate("/admin")}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {user && (
        <div className="navbar-right">
          <div className="navbar-user-info">
            {isAdmin && <span className="role-badge admin">Admin</span>}
            <span className="navbar-name">{user.name || user.email}</span>
          </div>
          <button className="btn-nav-logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}
