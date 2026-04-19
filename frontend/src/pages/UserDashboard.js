/**
 * User Dashboard
 * Displays assigned tasks with status management
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { taskAPI, logout, messageAPI, handleApiError, authAPI } from "../utils/api";
import MessagesModal from "../components/MessagesModal";
import { LeadershipCard } from "../components/LeadershipCard";
import Statistics from "./Statistics";
import { MdRadioButtonChecked } from 'react-icons/md';
import { FaUser, FaUserCircle, FaBell, FaInbox, FaChevronDown, FaEdit, FaCheck, FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaClipboard, FaChartLine, FaComments, FaStar, FaNewspaper, FaCalendar, FaEnvelope, FaUserCog, FaRobot, FaUsers, FaExclamationTriangle, FaChartBar, FaTimes, FaMagic } from 'react-icons/fa';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState("view"); // "view" or "edit"
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" or "about"
  const [notifications, setNotifications] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [adminId, setAdminId] = useState(null);
  const [adminName, setAdminName] = useState("Admin");
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
    whatsapp_number: "",
    bio: "",
    roles: []
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [openNav, setOpenNav] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchUnreadMessages();
    // Poll for unread messages every 5 seconds
    const interval = setInterval(fetchUnreadMessages, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false),
    );

    // Load the admin contact for messaging
    loadAdminContact();

    // Listen for task status changes from admin
    const handleTaskStatusChanged = (event) => {
      console.log('[UserDashboard] Task status changed by admin:', event.detail);
      fetchTasks(); // Refresh the task list
      fetchStats(); // Refresh stats as well
    };

    window.addEventListener('taskStatusChanged', handleTaskStatusChanged);

    return () => {
      window.removeEventListener('taskStatusChanged', handleTaskStatusChanged);
    };
  }, []);

  const fetchUnreadMessages = async () => {
    try {
      const data = await messageAPI.getUnreadCount();
      setNotifications(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch unread messages:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const filters = filter !== "all" ? { status: filter } : {};
      const res = await taskAPI.getTasks(filters);
      setTasks(res.tasks || []);
      setError(null);
    } catch (err) {
      setError("Failed to load tasks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await taskAPI.getStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const loadAdminContact = async () => {
    try {
      const data = await messageAPI.getContacts();
      const adminContact = (data.contacts || []).find((contact) => contact.user_id && contact.username);
      if (adminContact) {
        setAdminId(adminContact.user_id);
        setAdminName(adminContact.username || "Admin");
      }
    } catch (err) {
      console.error("Failed to load admin contact:", err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTask(taskId, { status: newStatus });
      await fetchTasks();
      await fetchStats();
    } catch (err) {
      alert("Failed to update task status: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (newStatus) => async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => String(t.id) === String(taskId) || String(t._id) === String(taskId));
    if (!task) return;
    if (task.status === newStatus) return;

    await updateTaskStatus(task.id || task._id, newStatus);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      "in_progress": "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      urgent: <MdRadioButtonChecked className="text-red-500 inline" />,
      high: <MdRadioButtonChecked className="text-orange-500 inline" />,
      medium: <MdRadioButtonChecked className="text-yellow-500 inline" />,
      low: <MdRadioButtonChecked className="text-green-500 inline" />,
    };
    return icons[priority] || <MdRadioButtonChecked className="text-gray-400 inline" />;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openProfileModal = () => {
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
      whatsapp_number: user?.whatsapp_number || "",
      bio: user?.bio || "",
      roles: user?.roles || []
    });
    setProfileMode("view");
    setShowProfileModal(true);
  };

  const toggleProfileEdit = () => {
    setProfileMode(profileMode === "view" ? "edit" : "view");
  };

  const saveProfileChanges = async () => {
    if (!profileForm.username.trim()) {
      alert("Username is required");
      return;
    }
    try {
      // Call API to update profile
      const data = await authAPI.updateProfile({
        username: profileForm.username,
        email: profileForm.email,
        whatsapp_number: profileForm.whatsapp_number,
        bio: profileForm.bio,
        roles: profileForm.roles
      });
      console.log('Profile updated:', data);

      if (profileForm.profile_photo_data_url && user?.id) {
        const key = `profile_photo_${user.id}`;
        localStorage.setItem(key, profileForm.profile_photo_data_url);
        setProfilePhoto(profileForm.profile_photo_data_url);
      }
      alert("Profile updated successfully!");
      setProfileMode("view");
    } catch (e) {
      console.warn('Failed to save profile', e);
      alert("Failed to update profile: " + e.message);
    }
  };


  useEffect(() => {
    try {
      const key = user?.id ? `profile_photo_${user.id}` : null;
      if (key) {
        const saved = localStorage.getItem(key);
        if (saved) setProfilePhoto(saved);
      }
    } catch (e) {
      console.warn('Failed to load profile photo', e);
    }
  }, [user]);

  const handleAvatarClick = () => setShowAvatarDropdown(v => !v);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          {/* Logo/Brand */}
          <div className="cursor-pointer flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-600"><FaClipboard className="inline mr-2" /> Task Generator</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`font-medium transition ${
                activeTab === "dashboard"
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`font-medium transition relative ${
                activeTab === "messages"
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Messages
              {notifications > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`font-medium transition ${
                activeTab === "about"
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => setActiveTab("statistics")}
              className={`font-medium transition ${
                activeTab === "statistics"
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Statistics
            </button>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-4 relative">
            {/* Profile Menu Desktop */}
            <div className="relative">
              <button
                onClick={handleAvatarClick}
                className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 hover:bg-gray-100 transition focus:outline-none group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white border-2 border-gray-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z" />
                  </svg>
                </div>
                <svg
                  className={`h-3 w-3 text-gray-600 transition-transform ${
                    showAvatarDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {showAvatarDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-lg shadow-xl z-50 border border-gray-100 overflow-hidden">
                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      openProfileModal();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">My Profile</p>
                      <p className="text-xs text-gray-500">View your profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      setActiveTab("messages");
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Messages</p>
                      <p className="text-xs text-gray-500">View inbox</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                  >
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <div>
                      <p className="font-medium">Sign Out</p>
                      <p className="text-xs">Exit application</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle & Avatar */}
          <div className="flex items-center gap-4 lg:hidden">
            {/* Avatar Dropdown for Mobile */}
            <div className="relative">
              <button onClick={handleAvatarClick} className="flex items-center gap-2 focus:outline-none">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white border-2 border-gray-200">
                  <FaUser className="w-5 h-5" />
                </div>
                <FaChevronDown
                  className={`h-3 w-3 text-gray-600 transition-transform ${
                    showAvatarDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showAvatarDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-lg shadow-xl z-50 border border-gray-100">
                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      openProfileModal();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">My Profile</p>
                      <p className="text-xs text-gray-500">View your profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      setActiveTab("messages");
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Messages</p>
                      <p className="text-xs text-gray-500">View inbox</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                  >
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <div>
                      <p className="font-medium">Sign Out</p>
                      <p className="text-xs">Exit application</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setOpenNav(!openNav)}
              className="h-6 w-6 text-gray-700 hover:text-blue-600"
            >
              {openNav ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {openNav && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <nav className="max-w-7xl mx-auto px-6 py-4 space-y-2">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setOpenNav(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === "dashboard"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveTab("messages");
                  setOpenNav(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition relative ${
                  activeTab === "messages"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Messages
                {notifications > 0 && (
                  <span className="absolute -top-2 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("about");
                  setOpenNav(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === "about"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                About Us
              </button>
              <button
                onClick={() => {
                  setActiveTab("statistics");
                  setOpenNav(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === "statistics"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Statistics
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section with Full Width Image */}
      {activeTab === "dashboard" && (
        <div className="relative w-full min-h-screen bg-cover bg-center overflow-hidden"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1603201667141-5a2d4c673378?q=80&w=1196&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            backgroundAttachment: "fixed"
          }}
        >
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
          
          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-4xl lg:text-6xl font-bold text-white mb-4">
                    Welcome, {user?.username}!
                  </h2>
                  <p className="text-lg lg:text-xl text-gray-100">
                    Manage your tasks efficiently and stay on top of your productivity with our Task Generator platform.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("statistics")}
                    className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition shadow-lg hover:shadow-xl"
                  >
                    <FaChartLine className="inline mr-2" /> View Statistics
                  </button>
                  <button
                    onClick={() => setActiveTab("messages")}
                    className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-700 transition border border-white border-opacity-50"
                  >
                    <FaComments className="inline mr-2" /> Contact Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Testimonials Section */}
            <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center"><FaComments className="inline mr-2" /> What Our Users Say</h2>
              <p className="text-gray-600 text-center mb-8">Trusted by professionals who rely on fast, clear communication.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                  <div className="flex items-center gap-4 mb-4">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces" alt="User" className="w-14 h-14 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-800">Sarah Johnson</h4>
                      <p className="text-sm text-gray-600">Project Manager</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">{Array.from({length:5}, (_,i) => <FaStar key={i} className="text-yellow-400" />)}</div>
                  <p className="text-gray-700 italic">"Clear task ownership and instant updates cut our delivery time in half — highly recommended."</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                  <div className="flex items-center gap-4 mb-4">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces" alt="User" className="w-14 h-14 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-800">Michael Chen</h4>
                      <p className="text-sm text-gray-600">Team Lead</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">{Array.from({length:5}, (_,i) => <FaStar key={i} className="text-yellow-400" />)}</div>
                  <p className="text-gray-700 italic">"AI suggestions and quick overviews help our team focus on execution instead of coordination."</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                  <div className="flex items-center gap-4 mb-4">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces" alt="User" className="w-14 h-14 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-800">Emily Rodriguez</h4>
                      <p className="text-sm text-gray-600">Operations Director</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">{Array.from({length:5}, (_,i) => <FaStar key={i} className="text-yellow-400" />)}</div>
                  <p className="text-gray-700 italic">"Reliable, fast, and simple — the fallback for when timelines matter."</p>
                </div>
              </div>
            </div>



            {/* Blog Posts Section */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center"><FaNewspaper className="inline mr-2" /> Latest Articles</h2>
              <p className="text-gray-600 text-center mb-8">Tips and insights to help your team perform better.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition hover:scale-105 transform">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop" alt="Blog" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <div className="flex gap-2 mb-3"><span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">Productivity</span></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">10 Ways to Boost Your Team's Productivity</h3>
                    <p className="text-gray-600 text-sm mb-4">Proven strategies to maximize team efficiency and deliver projects on time.</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4"><span><FaCalendar className="inline mr-1" /> Dec 15, 2024</span><span>5 min read</span></div>
                    <a href="#" className="text-blue-600 font-semibold hover:text-blue-700">Read More →</a>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition hover:scale-105 transform">
                  <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format&fit=crop" alt="Blog" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <div className="flex gap-2 mb-3"><span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Management</span></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Mastering Task Prioritization in 2026</h3>
                    <p className="text-gray-600 text-sm mb-4">A guide to prioritizing your workload and achieving goals effectively.</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4"><span><FaCalendar className="inline mr-1" /> Jan 10, 2026</span><span>7 min read</span></div>
                    <a href="#" className="text-blue-600 font-semibold hover:text-blue-700">Read More →</a>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition hover:scale-105 transform">
                  <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80&auto=format&fit=crop" alt="Blog" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <div className="flex gap-2 mb-3"><span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">Technology</span></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">How AI is Transforming Workplace Automation</h3>
                    <p className="text-gray-600 text-sm mb-4">Explore the latest AI innovations that are revolutionizing how teams work together.</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4"><span><FaCalendar className="inline mr-1" /> Feb 1, 2026</span><span>6 min read</span></div>
                    <a href="#" className="text-blue-600 font-semibold hover:text-blue-700">Read More →</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">View all your tasks and statistics on the</p>
              <button
                onClick={() => setActiveTab("statistics")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                <FaChartLine className="inline mr-2" /> Statistics Page
              </button>
            </div>
          </>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Messages Header */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6">
                  <h2 className="text-2xl font-bold"><FaComments className="inline mr-2" /> Chat with Admin</h2>
                  <p className="text-green-100 mt-2">Send and receive messages in real-time</p>
                </div>

                {/* Messages Action */}
                <div className="p-6">
                  <button
                    onClick={async () => {
                      if (!adminId) {
                        await loadAdminContact();
                      }
                      if (!adminId) {
                        alert("No admin user available for chat yet.");
                        return;
                      }
                      setShowContactModal(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <FaEnvelope className="inline mr-2" /> Open Chat
                    {notifications > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                        {notifications} new
                      </span>
                    )}
                  </button>
                </div>

                {/* Notifications Panel */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800 mb-4"><FaBell className="inline mr-2" /> Message Notifications</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="font-semibold text-blue-900"><FaEnvelope className="inline mr-2" /> Real-time Messages</p>
                      <p className="text-sm text-blue-700 mt-1">You have {notifications > 0 ? notifications + " " : "no "} unread message{notifications !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <p className="font-semibold text-green-900"><FaCheck className="inline mr-2" /> Instant Delivery</p>
                      <p className="text-sm text-green-700 mt-1">Messages are delivered instantly to your admin</p>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="font-semibold text-yellow-900"><FaBell className="inline mr-2" /> Live Updates</p>
                      <p className="text-sm text-yellow-700 mt-1">View live responses from your admin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <>
            {/* Company Header with Image */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-8 border-l-4 border-blue-600">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">🚀 About Task Generator</h2>
                <p className="text-gray-600 text-lg mb-4">Empowering Organizations Through Intelligent Task Management</p>
                <p className="text-gray-700 leading-relaxed">Task Generator is a sophisticated enterprise-grade software platform designed to revolutionize how organizations manage, track, and optimize their project workflows. Built with cutting-edge technology, we provide intelligent task automation, real-time analytics, and seamless collaboration tools that transform team productivity. Our platform has been trusted by leading companies to deliver excellence, efficiency, and measurable growth in their operations.</p>
                <div className="mt-6 flex gap-3">
                  <a href="#" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Learn More</a>
                  <a href="#" className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg">Contact Sales</a>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg">
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop" alt="Software team working in modern office" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-t-4 border-blue-500">
                <div className="text-4xl font-bold text-blue-600 mb-2">1K+</div>
                <p className="text-gray-600 font-semibold">Active Users</p>
                <p className="text-sm text-gray-500 mt-1">Growing community</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-t-4 border-green-500">
                <div className="text-4xl font-bold text-green-600 mb-2">50K+</div>
                <p className="text-gray-600 font-semibold">Tasks Managed</p>
                <p className="text-sm text-gray-500 mt-1">Successfully completed</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-t-4 border-purple-500">
                <div className="text-4xl font-bold text-purple-600 mb-2">98%</div>
                <p className="text-gray-600 font-semibold">Success Rate</p>
                <p className="text-sm text-gray-500 mt-1">On-time delivery</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-t-4 border-orange-500">
                <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
                <p className="text-gray-600 font-semibold">Platform Uptime</p>
                <p className="text-sm text-gray-500 mt-1">Reliable service</p>
              </div>
            </div>

            {/* Growth Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* User Growth Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4"><FaChartLine className="inline mr-2" /> Platform Growth</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">2024 Q1</span>
                      <span className="text-sm font-bold text-blue-600">150 Users</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-600 h-3 rounded-full" style={{width: "25%"}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">2024 Q2</span>
                      <span className="text-sm font-bold text-green-600">350 Users</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-green-600 h-3 rounded-full" style={{width: "58%"}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">2024 Q3</span>
                      <span className="text-sm font-bold text-purple-600">650 Users</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-purple-600 h-3 rounded-full" style={{width: "82%"}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">2024 Q4</span>
                      <span className="text-sm font-bold text-orange-600">1K+ Users</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-orange-600 h-3 rounded-full" style={{width: "100%"}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Distribution Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4"><FaChartBar className="inline mr-2" /> Task Distribution</h3>
                <div className="flex items-center justify-center h-64">
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">Completed</span>
                        <span className="text-sm font-bold text-green-600">58%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden flex">
                      <div className="bg-green-500" style={{width: "58%"}}></div>
                      <div className="bg-blue-500" style={{width: "32%"}}></div>
                      <div className="bg-yellow-500" style={{width: "10%"}}></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">In Progress</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">32%</span>
                      </div>
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Pending</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-600">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Completion Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Efficiency Metrics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">⚡ Efficiency Metrics</h3>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Average Task Duration</span>
                      <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">3.2 days</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: "65%"}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Task On-Time Completion</span>
                      <span className="text-sm font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">94%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: "94%"}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Team Productivity Index</span>
                      <span className="text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{width: "87%"}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Showcase */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4"><FaMagic className="inline mr-2" /> Core Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <FaRobot className="text-2xl mb-1 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-800">AI-Powered Tasks</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <FaChartBar className="text-2xl mb-1 text-green-600" />
                    <p className="text-sm font-semibold text-gray-800">Real-time Analytics</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <FaUsers className="text-2xl mb-1 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-800">Team Collaboration</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <FaBell className="text-2xl mb-1 text-orange-600" />
                    <p className="text-sm font-semibold text-gray-800">Smart Notifications</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                    <p className="text-2xl mb-1">🔐</p>
                    <p className="text-sm font-semibold text-gray-800">Enterprise Security</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                    <p className="text-2xl mb-1">🌐</p>
                    <p className="text-sm font-semibold text-gray-800">Multi-Platform</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Achievements */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">🏆 Achievements & Milestones</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition border-l-4 border-gold-400">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=280&fit=crop&q=80" alt="Industry Recognition" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h4 className="font-bold text-gray-800 mb-2">🥇 Industry Recognition</h4>
                    <p className="text-sm text-gray-600">
                      Recognized as a leader in enterprise task management and automation solutions across industries.
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition border-l-4 border-blue-500">
                  <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=280&fit=crop&q=80" alt="Corporate Partnerships" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h4 className="font-bold text-gray-800 mb-2">💼 Corporate Partnerships</h4>
                    <p className="text-sm text-gray-600">
                      Trusted partnerships with 50+ Fortune 500 companies and leading organizations worldwide.
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition border-l-4 border-green-500">
                  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=280&fit=crop&q=80" alt="Innovation Awards" className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h4 className="font-bold text-gray-800 mb-2">🚀 Innovation Awards</h4>
                    <p className="text-sm text-gray-600">
                      Multiple innovation awards for pioneering AI-driven task automation and intelligent workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vision & Mission */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border-t-4 border-blue-600 hover:shadow-xl transition">
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop&q=80" alt="Our Mission" className="w-full h-48 object-cover" />
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">🎯 Our Mission</h3>
                  <p className="text-gray-700 leading-relaxed">
                    To empower organizations of all sizes with intelligent, intuitive task management solutions that streamline workflows, enhance team collaboration, and drive measurable business results. We are committed to continuous innovation and delivering exceptional value through cutting-edge technology and customer-centric excellence.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg overflow-hidden shadow-lg border-t-4 border-purple-600 hover:shadow-xl transition">
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop&q=80" alt="Our Vision" className="w-full h-48 object-cover" />
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">🚀 Our Vision</h3>
                  <p className="text-gray-700 leading-relaxed">
                    To become the global leader in enterprise task management and automation, transforming how organizations work by leveraging artificial intelligence, data analytics, and human-centered design. We envision a future where intelligent automation empowers teams to focus on strategic initiatives while driving organizational growth and innovation.
                  </p>
                </div>
              </div>
            </div>

            {/* Leadership Team Section */}
            <div className="mb-12">
              <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">👔 Leadership Team</h3>
              <div className="flex flex-wrap justify-center gap-8">
                <LeadershipCard
                  name="Founder & Visionary"
                  position="Chief Founder Officer"
                  image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&q=80"
                  socials={[
                    { label: "Like", href: "#facebook", color: "blue", icon: "fab fa-facebook" },
                    { label: "Follow", href: "#twitter", color: "light-blue", icon: "fab fa-twitter" },
                    { label: "Follow", href: "#linkedin", color: "blue", icon: "fab fa-linkedin" },
                  ]}
                />
                <LeadershipCard
                  name="Executive Officer"
                  position="Chief Executive Officer"
                  image="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&q=80"
                  socials={[
                    { label: "Like", href: "#facebook", color: "blue", icon: "fab fa-facebook" },
                    { label: "Follow", href: "#twitter", color: "light-blue", icon: "fab fa-twitter" },
                    { label: "Connect", href: "#linkedin", color: "blue", icon: "fab fa-linkedin" },
                  ]}
                />
                <LeadershipCard
                  name="Client Relations"
                  position="Client Success Manager"
                  image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&q=80"
                  socials={[
                    { label: "Like", href: "#facebook", color: "blue", icon: "fab fa-facebook" },
                    { label: "Follow", href: "#twitter", color: "light-blue", icon: "fab fa-twitter" },
                    { label: "Contact", href: "#instagram", color: "purple", icon: "fab fa-instagram" },
                  ]}
                />
              </div>
            </div>

            {/* Team & Workplace Gallery */}
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center"><FaUsers className="inline mr-2" /> Our Team & Culture</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition group">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80" alt="Team collaboration" className="w-full h-64 object-cover group-hover:scale-105 transition" />
                  <div className="p-4 bg-white">
                    <p className="font-semibold text-gray-800">Team Collaboration</p>
                    <p className="text-xs text-gray-600">Working together towards success</p>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition group">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80" alt="Innovative workspace" className="w-full h-64 object-cover group-hover:scale-105 transition" />
                  <div className="p-4 bg-white">
                    <p className="font-semibold text-gray-800">Modern Workspace</p>
                    <p className="text-xs text-gray-600">Designed for innovation</p>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition group">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80" alt="Professional development" className="w-full h-64 object-cover group-hover:scale-105 transition" />
                  <div className="p-4 bg-white">
                    <p className="font-semibold text-gray-800">Growth & Learning</p>
                    <p className="text-xs text-gray-600">Continuous professional development</p>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition group">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80" alt="Company culture" className="w-full h-64 object-cover group-hover:scale-105 transition" />
                  <div className="p-4 bg-white">
                    <p className="font-semibold text-gray-800">Company Culture</p>
                    <p className="text-xs text-gray-600">Values and team spirit</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <Statistics />
        )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800"><FaUser className="inline mr-2" /> Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {profileMode === "view" ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Username</p>
                    <p className="text-lg text-gray-800">{profileForm.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Email</p>
                    <p className="text-lg text-gray-800">{profileForm.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">WhatsApp Number</p>
                    <p className="text-lg text-gray-800">{profileForm.whatsapp_number || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Bio</p>
                    <p className="text-lg text-gray-800">{profileForm.bio || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Roles</p>
                    <p className="text-lg text-gray-800">
                      {profileForm.roles && profileForm.roles.length > 0
                        ? profileForm.roles.join(", ")
                        : "Not specified (click Edit Profile to set)"}
                    </p>
                  </div>
                  <button
                    onClick={toggleProfileEdit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    <FaEdit className="inline mr-2" /> Edit Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); saveProfileChanges(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={profileForm.whatsapp_number}
                      onChange={(e) => setProfileForm({ ...profileForm, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Roles (comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.roles ? profileForm.roles.join(", ") : ""}
                      onChange={(e) => setProfileForm({ ...profileForm, roles: e.target.value.split(",").map(r => r.trim()).filter(r => r) })}
                      placeholder="e.g., frontend, backend, tester, hardware"
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {profileForm.profile_photo_data_url || profilePhoto ? (
                          <img src={profileForm.profile_photo_data_url || profilePhoto} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🐷</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setProfileForm((p) => ({ ...p, profile_photo_data_url: reader.result }));
                          };
                          reader.readAsDataURL(f);
                        }}
                        className="text-sm text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                    >
                      <FaCheck className="inline mr-2" /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={toggleProfileEdit}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      <MessagesModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          fetchUnreadMessages(); // Refresh unread count when modal closes
        }}
        recipientId={adminId}
        recipientName={adminName}
        currentUserId={user?.id}
        currentUserRole="user"
      />
    </div>
  );
};

export default UserDashboard;
