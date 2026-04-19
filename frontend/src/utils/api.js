/**
 * API utility functions for communicating with the Flask backend.
 * Handles authentication, requests, and error handling.
 */

import axios from "axios";

/* ---------------------------------------------
   Base URL normalization
   Put ONLY the origin in REACT_APP_API_BASE / REACT_APP_API_URL.
   We will append "/api" exactly once.
---------------------------------------------- */
const RAW_ENV =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

// 1) trim trailing slashes
// 2) strip a trailing "/api" if someone included it in the env by mistake
const BASE = RAW_ENV.replace(/\/+$/, "").replace(/\/api\/?$/i, "");

// Axios instance (server mounts all endpoints under /api)
const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // we use Bearer tokens, not cookies
});

/* ---------------------------------------------
   Token & User helpers (localStorage)
---------------------------------------------- */
const TOKEN_KEY = "token";
const USER_KEY = "user";
const ROLE_KEY = "user_role";

export const setAuthToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY) || null;

export const setUser = (user) =>
  user ? localStorage.setItem(USER_KEY, JSON.stringify(user)) : localStorage.removeItem(USER_KEY);

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const setRole = (role) =>
  role ? localStorage.setItem(ROLE_KEY, role) : localStorage.removeItem(ROLE_KEY);

export const getRole = () => localStorage.getItem(ROLE_KEY) || "user";

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  if (window.location.pathname !== "/login") window.location.href = "/login";
};

/* ---------------------------------------------
   Interceptors
---------------------------------------------- */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) logout();
    return Promise.reject(error);
  }
);

/* ---------------------------------------------
   Error normalization
---------------------------------------------- */
export const handleApiError = (error) => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return "An unexpected error occurred";
};

/* ---------------------------------------------
   AUTH
---------------------------------------------- */
export const authAPI = {
  login: async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    if (data?.access_token) setAuthToken(data.access_token);
    if (data?.user) {
      setUser(data.user);
      setRole(data.user.role || "user");
    }
    return data;
  },

  signup: async (userData) => {
    console.log("[API] Signup request with data:", userData);
    const { data } = await api.post("/auth/signup", userData);
    console.log("[API] Signup response:", data);
    console.log("[API] User role from response:", data?.user?.role);
    if (data?.access_token) setAuthToken(data.access_token);
    if (data?.user) {
      setUser(data.user);
      const roleToSet = data.user.role || "user";
      console.log("[API] Setting role to:", roleToSet);
      setRole(roleToSet);
    }
    return data;
  },

  verifyToken: async () => {
    const { data } = await api.get("/auth/verify");
    if (data?.user) setRole(data.user.role || "user");
    return data;
  },

  adminExists: async () => {
    const { data } = await api.get('/auth/admin-exists');
    return data;
  },

  getProfile: async () => {
    const { data } = await api.get("/auth/profile");
    if (data?.user) setRole(data.user.role || "user");
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put("/auth/profile", profileData);
    return data;
  },
};

/* ---------------------------------------------
   TASKS
---------------------------------------------- */
export const taskAPI = {
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const qs = params.toString();
    const url = qs ? `/tasks?${qs}` : "/tasks";
    const { data } = await api.get(url);
    return data;
  },

  getTask: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data;
  },

  createTask: async (taskData) => {
    const { data } = await api.post("/tasks", taskData);
    return data;
  },

  updateTask: async (taskId, taskData) => {
    const { data } = await api.put(`/tasks/${taskId}`, taskData);
    return data;
  },

  deleteTask: async (taskId) => {
    const { data } = await api.delete(`/tasks/${taskId}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get("/tasks/stats");
    return data;
  },
};

/* ---------------------------------------------
   AI
---------------------------------------------- */
export const aiAPI = {
  parseTask: async (input) => {
    const { data } = await api.post("/ai/parse-task", { input });
    return data;
  },

  createFromText: async (input) => {
    const { data } = await api.post("/ai/create-from-text", { input });
    return data;
  },

  prioritizeTasks: async (taskIds = null) => {
    const payload = taskIds ? { task_ids: taskIds } : {};
    const { data } = await api.post("/ai/prioritize-tasks", payload);
    return data;
  },

  generateSummary: async (period = "daily") => {
    const { data } = await api.get("/ai/generate-summary", { params: { period } });
    return data;
  },

  suggestSubtasks: async (title, description = "") => {
    const { data } = await api.post("/ai/suggest-subtasks", { title, description });
    return data;
  },

  generateDescription: async (title, keywords = []) => {
    const { data } = await api.post("/ai/generate-description", { title, keywords });
    return data;
  },

  healthCheck: async () => {
    const { data } = await api.get("/ai/health");
    return data;
  },
};

/* ---------------------------------------------
   ADMIN
---------------------------------------------- */
export const adminAPI = {
  // User Management
  getAllUsers: async () => {
    const { data } = await api.get("/admin/users");
    return data;
  },

  updateUserRole: async (userId, role) => {
    const { data } = await api.put(`/admin/users/${userId}/role`, { role });
    return data;
  },

  // Task Management
  getAllTasks: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const qs = params.toString();
    const url = qs ? `/admin/tasks?${qs}` : "/admin/tasks";
    const { data } = await api.get(url);
    return data;
  },

  createTaskForUser: async (userId, taskData) => {
    const { data } = await api.post(`/admin/tasks/create-for-user/${userId}`, taskData);
    return data;
  },

  // Create task with automatic keyword-based allocation
  createTaskWithKeywords: async (taskData) => {
    const { data } = await api.post("/admin/tasks/create-with-keywords", taskData);
    return data;
  },

  // Task Confirmation
  confirmTaskStatus: async (taskId, confirmationData) => {
    const { data } = await api.put(`/admin/tasks/${taskId}/confirm`, confirmationData);
    return data;
  },

  // Analytics
  getAnalyticsOverview: async () => {
    const { data } = await api.get("/admin/analytics/overview");
    return data;
  },

  getUserAnalytics: async (userId) => {
    const { data } = await api.get(`/admin/analytics/user/${userId}`);
    return data;
  },

  getPendingConfirmations: async () => {
    const { data } = await api.get("/admin/analytics/pending-confirmations");
    return data;
  },
};

/* ---------------------------------------------
   MESSAGES
---------------------------------------------- */
export const messageAPI = {
  // Send a message
  sendMessage: async (recipientId, text) => {
    const { data } = await api.post("/messages/send", {
      recipient_id: recipientId,
      text: text,
    });
    return data;
  },

  // Get conversation with another user
  getConversation: async (userId, limit = 50, skip = 0) => {
    const { data } = await api.get(`/messages/conversation/${userId}`, {
      params: { limit, skip },
    });
    return data;
  },

  // Get unread message count
  getUnreadCount: async () => {
    const { data } = await api.get("/messages/unread");
    return data;
  },

  // Get all message contacts
  getContacts: async () => {
    const { data } = await api.get("/messages/contacts");
    return data;
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data;
  },
};

/* ---------------------------------------------
   TESTER
--------------------------------------------- */
export const testerAPI = {
  // Create tasks for all tester users from description
  createTasksFromDescription: async (description) => {
    const { data } = await api.post("/tester/tasks/from-description", { description });
    return data;
  },

  // Preview how description will be parsed
  previewTask: async (description) => {
    const { data } = await api.post("/tester/tasks/preview", { description });
    return data;
  },

  // Get all tester users
  getTesters: async () => {
    const { data } = await api.get("/tester/testers");
    return data;
  },
};

