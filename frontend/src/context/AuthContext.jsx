import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try { setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem("user"); }
    }
    setIsLoading(false);
  }, []);

  function login(sessionData) {
    const { access_token, refresh_token } = sessionData.session;
    const userData = sessionData.user;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }

  function updateUser(updates) {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  }

  const isAdmin = user?.role === "admin";
  const isStudent = !isAdmin && !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading, isAdmin, isStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
