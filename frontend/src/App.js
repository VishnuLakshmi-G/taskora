/**
 * Main App component with routing and authentication context.
 * Handles user authentication state and role-based route protection.
 */

import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@material-tailwind/react";
import {
  authAPI,
  getAuthToken,
  getUser,
  getRole,
  setUser as persistUser,
  setRole as persistRole,
  setAuthToken,
} from "./utils/api";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TaskForm from "./pages/TaskForm";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TesterDashboard from "./pages/TesterDashboard";

// -----------------------------
// Auth Context
// -----------------------------
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

// -----------------------------
// Auth Provider
// -----------------------------
const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = getAuthToken();
        const savedUser = getUser();

        if (token && savedUser) {
          try {
            const res = await authAPI.verifyToken();
            if (res?.valid) {
              setUserState(savedUser);
              setIsAuthenticated(true);
            } else {
              setAuthToken(null);
              persistUser(null);
              setIsAuthenticated(false);
            }
          } catch {
            setAuthToken(null);
            persistUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials) => {
    try {
      const res = await authAPI.login(credentials);
      if (res?.access_token && res?.user) {
        setUserState(res.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: "Invalid response from server" };
    } catch (error) {
      return { success: false, error: error?.response?.data?.error || "Login failed" };
    }
  };

  const signup = async (userData) => {
    try {
      const res = await authAPI.signup(userData);
      if (res?.access_token && res?.user) {
        setUserState(res.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: "Invalid response from server" };
    } catch (error) {
      return { success: false, error: error?.response?.data?.error || "Signup failed" };
    }
  };

  const logout = () => {
    setAuthToken(null);
    persistUser(null);
    setUserState(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({ user, isAuthenticated, loading, login, signup, logout }),
    [user, isAuthenticated, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// -----------------------------
// Route Guards
// -----------------------------
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="loading-spinner" />
    <span className="ml-2">Loading...</span>
  </div>
);

// Helper to check if user has a specific technical role
const hasTechnicalRole = (user, role) => {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
};

// ProtectedRoute - checks authentication
const ProtectedRoute = ({ children, requiredRole = null, requiredTechnicalRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Check role if specified
  if (requiredRole || requiredTechnicalRole) {
    const userRole = getRole();
    
    // Check for technical role (e.g., tester)
    if (requiredTechnicalRole && user) {
      if (!hasTechnicalRole(user, requiredTechnicalRole)) {
        // Redirect based on role
        if (userRole === "admin") {
          return <Navigate to="/admin-dashboard" replace />;
        } else {
          return <Navigate to="/user-dashboard" replace />;
        }
      }
    } else if (requiredRole && userRole !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      if (userRole === "admin") {
        return <Navigate to="/admin-dashboard" replace />;
      } else {
        return <Navigate to="/user-dashboard" replace />;
      }
    }
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingScreen />;
  
  if (isAuthenticated && user) {
    // Redirect based on user role - check for tester first
    if (hasTechnicalRole(user, "tester")) {
      return <Navigate to="/tester-dashboard" replace />;
    }
    // Then check main role
    const role = getRole();
    if (role === "admin") {
      return <Navigate to="/admin-dashboard" replace />;
    } else {
      return <Navigate to="/user-dashboard" replace />;
    }
  }
  
  return children;
};

// -----------------------------
// App
// -----------------------------
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* User Routes */}
            <Route
              path="/user-dashboard"
              element={
                <ProtectedRoute requiredRole="user">
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Tester Routes */}
            <Route
              path="/tester-dashboard"
              element={
                <ProtectedRoute requiredTechnicalRole="tester">
                  <TesterDashboard />
                </ProtectedRoute>
              }
            />

            {/* Legacy Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/new"
              element={
                <ProtectedRoute>
                  <TaskForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/edit/:id"
              element={
                <ProtectedRoute>
                  <TaskForm />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route
              path="/"
              element={
                <Navigate to={
                  getAuthToken()
                    ? (() => {
                        const user = getUser();
                        if (user && user.roles && user.roles.includes("tester")) {
                          return "/tester-dashboard";
                        }
                        return getRole() === "admin" ? "/admin-dashboard" : "/user-dashboard";
                      })()
                    : "/login"
                } replace />
              }
            />
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                    <p className="text-gray-600 mb-4">Page not found</p>
                    <a href="/user-dashboard" className="btn-primary">
                      Go to Dashboard
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
