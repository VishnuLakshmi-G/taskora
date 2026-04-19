/**
 * Login and Signup page component.
 * Handles user authentication with form validation.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { handleApiError, authAPI } from "../utils/api";
import { FaLightbulb, FaClipboard, FaUsers, FaUserCog, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState("user"); // user or admin
  const [showAdminOption, setShowAdminOption] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    whatsapp_number: "",
    roles: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: "" }));
    }
  };

  // Validate input
  const validateForm = () => {
    const newErrors = {};

    // username
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // email (signup only)
    if (!isLogin) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email";
      }
    }

    // password
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // confirm password (signup only)
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // WhatsApp (signup only)
    if (!isLogin) {
      if (!formData.whatsapp_number.trim()) {
        newErrors.whatsapp_number = "WhatsApp number is required";
      } else if (!/^\+\d{10,15}$/.test(formData.whatsapp_number.trim())) {
        newErrors.whatsapp_number =
          "Enter valid WhatsApp number (e.g. +919876543210)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("[HANDLESUBMIT] isLogin:", isLogin);
    console.log("[HANDLESUBMIT] selectedRole:", selectedRole);

    if (!validateForm()) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      let result;
      if (isLogin) {
        result = await login({
          username: formData.username.trim(),
          password: formData.password,
        });
      } else {
        console.log("[SIGNUP] Sending role:", selectedRole);
        result = await signup({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          whatsapp_number: formData.whatsapp_number.trim(),
          role: selectedRole,
          roles: formData.roles
        });
        console.log("[SIGNUP] Result received:", result);
        console.log("[SIGNUP] User role from result:", result?.user?.role);
      }

      if (result?.success || result?.user) {
        // Navigate based on role from result
        const userRole = result?.user?.role || selectedRole;
        console.log("[NAVIGATION] Final role:", userRole, "(from result:", result?.user?.role, "or fallback:", selectedRole, ")");
        if (userRole === "admin") {
          navigate("/admin-dashboard", { replace: true });
        } else {
          navigate("/user-dashboard", { replace: true });
        }
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: result?.error || "Authentication failed",
        }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: handleApiError(err),
      }));
    } finally {
      setLoading(false);
    }
  };

  // Switch between modes
  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      whatsapp_number: "",
      roles: []
    });
    setErrors({});
    // DO NOT reset selectedRole - user should keep their role selection!
  };

  // Check whether admin registration should be offered (only if no admin exists)
  React.useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await authAPI.adminExists();
        if (!mounted) return;
        // If an admin already exists, do NOT show admin option
        setShowAdminOption(!res.exists);
        if (res.exists) setSelectedRole('user');
      } catch (err) {
        console.error('Failed to check admin existence:', err);
        // Fail safe: hide admin option to avoid exposing admin registration
        setShowAdminOption(false);
        setSelectedRole('user');
      }
    };
    check();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl hover:-translate-y-1 transition-all duration-300">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-8 text-white text-center">
            <FaClipboard className="text-4xl mb-3 mx-auto" />
            <h1 className="text-3xl font-bold mb-2">Task Manager</h1>
            <p className="text-gray-200">Manage tasks with collaboration</p>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {/* Tab Toggle */}
            <div className="mb-6 flex gap-2 bg-gray-100 p-1.5 rounded-lg shadow-inner">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-3 rounded font-semibold transition text-sm hover:shadow-md hover:-translate-y-0.5 ${
                  isLogin
                    ? "bg-gray-600 text-white shadow-lg"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-3 rounded font-semibold transition text-sm hover:shadow-md hover:-translate-y-0.5 ${
                  !isLogin
                    ? "bg-gray-600 text-white shadow-lg"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Role Selection (Signup only) */}
            {!isLogin && showAdminOption && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🎭 Register as:
                </label>
                <div className="flex gap-4">
                <label className="flex items-center cursor-pointer flex-1 hover:bg-gray-100 p-2 rounded transition">
                    <input
                      type="radio"
                      value="user"
                      checked={selectedRole === "user"}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 accent-gray-600"
                    />
                    <span className="ml-2 text-gray-700 font-medium">
                      <FaUsers className="inline mr-1" /> Regular User
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer flex-1 hover:bg-gray-100 p-2 rounded transition">
                    <input
                      type="radio"
                      value="admin"
                      checked={selectedRole === "admin"}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 accent-gray-600"
                    />
                    <span className="ml-2 text-gray-700 font-medium">
                      <FaUserCog className="inline mr-1" /> Admin
                    </span>
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  <FaExclamationTriangle className="inline mr-1" /> {errors.submit}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition hover:shadow-md ${
                    errors.username
                      ? "border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                  }`}
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1.5"><FaTimes className="inline mr-1" /> {errors.username}</p>
                )}
              </div>

              {/* Email (Signup only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition hover:shadow-md ${
                      errors.email
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1.5"><FaTimes className="inline mr-1" /> {errors.email}</p>
                  )}
                </div>
              )}

              {/* WhatsApp (Signup only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleInputChange}
                    placeholder="+919876543210"
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition hover:shadow-md ${
                      errors.whatsapp_number
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                    }`}
                  />
                  {errors.whatsapp_number && (
                    <p className="text-red-500 text-sm mt-1.5">
                      <FaTimes className="inline mr-1" /> {errors.whatsapp_number}
                    </p>
                  )}
                </div>
              )}

              {/* Roles Selection (Signup only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Technical Roles (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select the roles that match your skills. This helps with automatic task assignment.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "frontend", label: "Frontend Developer" },
                      { value: "backend", label: "Backend Developer" },
                      { value: "tester", label: "QA/Tester" },
                      { value: "hardware", label: "Hardware Engineer" }
                    ].map((role) => (
                      <label key={role.value} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role.value)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...formData.roles, role.value]
                              : formData.roles.filter(r => r !== role.value);
                            setFormData(prev => ({ ...prev, roles: newRoles }));
                          }}
                          className="w-4 h-4 accent-gray-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">{role.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    You can update these roles later in your profile settings.
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition hover:shadow-md ${
                    errors.password
                      ? "border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                  }`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1.5"><FaTimes className="inline mr-1" /> {errors.password}</p>
                )}
              </div>

              {/* Confirm Password (Signup only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition hover:shadow-md ${
                      errors.confirmPassword
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1.5">
                      <FaTimes className="inline mr-1" /> {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isLogin ? (
                  "🔓 Login"
                ) : (
                  "✨ Create Account"
                )}
              </button>
            </form>

            {/* Switch mode link */}
            <p className="text-center text-gray-600 text-sm mt-4">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-gray-600 font-semibold hover:text-gray-800 hover:underline"
              >
                {isLogin ? "Sign Up" : "LogIn"}
              </button>
            </p>
          </div>
        </div>
        {/* Footer Help Text */}
        <p className="text-gray-600 text-center text-xs mt-6">
          <FaLightbulb className="inline mr-2" /> WhatsApp format: +919876543210 (include country code)
        </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
