import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------- Auth ----------
export const sendOtp = (email) => api.post("/auth/send-otp", { email });
export const verifyOtp = (email, otp) => api.post("/auth/verify-otp", { email, otp });
export const adminLogin = (email, password) => api.post("/auth/admin-login", { email, password });

// ---------- Profile ----------
export const getProfile = () => api.get("/profile");

// ---------- Hostels ----------
export const getHostels = () => api.get("/hostels");

// ---------- Rooms ----------
export const getRooms = (hostelId) => api.get(`/rooms/${hostelId}`);

// ---------- Allotment ----------
export const allotRoom = (roomId) => api.post("/allot", { room_id: roomId });
export const getMyAllotment = () => api.get("/allot/my");
export const getAllotmentWindow = () => api.get("/allot/window");
export const downloadSlipPdf = (allotmentId) =>
  api.get(`/allot/${allotmentId}/pdf`, { responseType: "blob" });

// ---------- Admin ----------
export const getAdminStats = () => api.get("/admin/stats");
export const getAdminRooms = () => api.get("/admin/rooms");
export const getAdminAllotments = () => api.get("/admin/allotments");
export const getAdminStudents = (search) =>
  api.get("/admin/students", { params: search ? { search } : {} });
export const adminAssign = (userId, roomId) =>
  api.post("/admin/assign", { user_id: userId, room_id: roomId });
export const adminUnassign = (userId) =>
  api.post("/admin/unassign", { user_id: userId });
export const adminBlockRoom = (roomId, reason) =>
  api.post("/admin/block-room", { room_id: roomId, reason });
export const adminUnblockRoom = (roomId) =>
  api.post("/admin/unblock-room", { room_id: roomId });
export const getVacancyMap = () => api.get("/admin/vacancy-map");
export const getAdminWindows = () => api.get("/admin/window");
export const createAdminWindow = (data) => api.post("/admin/window", data);

export default api;
