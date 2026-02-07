import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RoomsPage from "./pages/RoomsPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

function ProtectedRoute({ children, role }) {
  const { user, isAdmin, isStudent } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role === "admin" && !isAdmin) return <Navigate to="/profile" replace />;
  if (role === "student" && !isStudent) return <Navigate to="/admin" replace />;
  return children;
}

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to={isAdmin ? "/admin" : "/profile"} replace /> : <LoginPage />}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute role="student"><ProfilePage /></ProtectedRoute>}
          />
          <Route
            path="/rooms"
            element={<ProtectedRoute role="student"><RoomsPage /></ProtectedRoute>}
          />
          <Route
            path="/confirmation"
            element={<ProtectedRoute role="student"><ConfirmationPage /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.875rem",
              borderRadius: "8px",
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
