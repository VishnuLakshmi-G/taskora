/**
 * Admin Dashboard
 * Comprehensive task management, user oversight, and analytics, and AI-powered task allocation
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { adminAPI, aiAPI, logout, handleApiError, messageAPI } from "../utils/api";
import MessagesModal from "../components/MessagesModal";
import { FaPlus, FaTimes, FaUser, FaUserCog, FaExclamationTriangle, FaChartBar, FaClipboard, FaCheck, FaUsers, FaComments, FaChartLine, FaEnvelope, FaBell, FaLightbulb, FaEye, FaWhatsapp, FaBullseye, FaStopwatch, FaEdit, FaSearch, FaStar } from 'react-icons/fa';
import { MdRadioButtonChecked } from 'react-icons/md';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  let generationTimeout; // Debounce timer for description generation

  // State Management
  const [activeTab, setActiveTab] = useState("overview"); // overview, create-task, tasks, users, confirmations, analytics
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmationFeedback, setConfirmationFeedback] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");

  // Live refresh notifications
  const [liveRefreshMessage, setLiveRefreshMessage] = useState("");
  const liveRefreshTimerRef = React.useRef(null);
  
  // Create Task Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // AI suggestion based on title input
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  
  // Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState("view"); // "view" or "edit"
  const [editingProfile, setEditingProfile] = useState(null); // Which user's profile: "admin" or user ID
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
    whatsapp_number: "",
    bio: ""
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

  // Messaging State
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState(0);
  const [selectedUserForChat, setSelectedUserForChat] = useState(null);

  // User Analytics State
  const [showUserAnalytics, setShowUserAnalytics] = useState(false);
  const [userAnalyticsData, setUserAnalyticsData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  // Reload confirmations when any task is marked completed (including re-completed after rejection)
  useEffect(() => {
    const clearLiveRefresh = () => {
      if (liveRefreshTimerRef.current) {
        clearTimeout(liveRefreshTimerRef.current);
      }
      liveRefreshTimerRef.current = setTimeout(() => {
        setLiveRefreshMessage("");
      }, 3000);
    };

    const handleTaskStatusChanged = (event) => {
      if (event?.detail?.status === "completed") {
        setLiveRefreshMessage("Updated, refreshing confirmations...");
        clearLiveRefresh();
        loadPendingConfirmations();
      }
    };

    window.addEventListener("taskStatusChanged", handleTaskStatusChanged);
    return () => {
      window.removeEventListener("taskStatusChanged", handleTaskStatusChanged);
      if (liveRefreshTimerRef.current) clearTimeout(liveRefreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // load saved profile photo from localStorage (dev/local persistence)
    try {
      const key = user?.id ? `profile_photo_${user.id}` : null;
      if (key) {
        const saved = localStorage.getItem(key);
        if (saved) setProfilePhoto(saved);
      }
    } catch (e) {
      console.warn("Failed to load profile photo", e);
    }
  }, [user]);

  // Poll for admin messages every 5 seconds
  useEffect(() => {
    loadAdminMessages();
    const interval = setInterval(loadAdminMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reload tasks whenever filter changes while on tasks tab
  useEffect(() => {
    if (activeTab === "tasks") {
      loadTasks();
    }
  }, [taskFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "overview") {
        await Promise.all([
          loadAnalytics(),
          loadPendingConfirmations(),
          loadTasks(),
          loadAdminMessages(),
          loadContacts()
        ]);
      } else if (activeTab === "tasks") {
        await loadTasks();
      } else if (activeTab === "users") {
        await loadUsers();
      } else if (activeTab === "messages") {
        await loadContacts();
      } else if (activeTab === "confirmations") {
        await loadPendingConfirmations();
      } else if (activeTab === "analytics") {
        console.log("[Analytics] Loading analytics data");
        await loadAnalytics();
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAdminMessages = async () => {
    try {
      const data = await messageAPI.getUnreadCount();
      setAdminNotifications(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load admin messages:", err);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await messageAPI.getContacts();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  const loadTasks = async () => {
    try {
      const filters = taskFilter !== "all" ? { status: taskFilter } : {};
      console.log("[ADMIN] Loading tasks with filters:", filters, "taskFilter:", taskFilter);
      const res = await adminAPI.getAllTasks(filters);
      console.log("[ADMIN] Tasks loaded:", res.tasks?.length, "tasks");
      console.log("[ADMIN] Task statuses:", res.tasks?.map(t => t.status) || []);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await adminAPI.getAllUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await adminAPI.getAnalyticsOverview();
      setAnalytics(res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  const loadPendingConfirmations = async () => {
    try {
      const res = await adminAPI.getPendingConfirmations();
      // Only show tasks that were marked completed by the user
      const completedTasks = (res.tasks || []).filter((task) => task.status === "completed");
      setPendingConfirmations(completedTasks);
    } catch (err) {
      console.error("Failed to load pending confirmations:", err);
    }
  };

  const confirmTaskStatus = async (taskId, status) => {
    try {
      await adminAPI.confirmTaskStatus(taskId, {
        confirmation_status: status,
        feedback: confirmationFeedback,
      });
      setSelectedTask(null);
      setConfirmationFeedback("");
      loadPendingConfirmations();
      loadTasks();
      alert(`Task ${status === "approved" ? "approved" : "rejected"} successfully!`);
      // notify other clients (particularly user dashboard) so they can refresh
      window.dispatchEvent(new CustomEvent('taskStatusChanged', { detail: { taskId, status } }));
    } catch (err) {
      alert("Failed to confirm task: " + handleApiError(err));
    }
  };

  const assignTaskViaAI = async (title, description) => {
    // Define keyword mappings for roles (including role names themselves)
    const roleKeywords = {
      frontend: ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'ui', 'design', 'component', 'interface', 'layout', 'responsive', 'bootstrap', 'tailwind', 'frontend', 'front-end', 'front end', ' FE '],
      backend: ['python', 'java', 'node', 'api', 'database', 'server', 'sql', 'mongodb', 'endpoint', 'authentication', 'authorization', 'middleware', 'backend', 'back-end', 'back end', ' BE '],
      tester: ['test', 'qa', 'quality', 'bug', 'automation', 'selenium', 'cypress', 'jest', 'unit', 'integration', 'regression', 'manual', 'testing', 'tester'],
      hardware: ['circuit', 'board', 'sensor', 'iot', 'embedded', 'arduino', 'raspberry', 'firmware', 'hardware', 'electronic', 'microcontroller', 'electronics', 'pcb', 'esp32', 'stm32', 'pcb design', 'schematic', 'voltage', 'analog', 'digital circuit'],
      fullstack: ['fullstack', 'full stack', 'full-stack', 'fs', 'full stack developer']
    };

    const text = (title + ' ' + description).toLowerCase();
    
    // Count matches for each role
    const scores = {};
    for (const [role, keywords] of Object.entries(roleKeywords)) {
      scores[role] = keywords.filter(keyword => text.includes(keyword)).length;
    }
    
    // Check for fullstack keyword - if found, add points to both frontend and backend
    if (text.includes('fullstack') || text.includes('full stack') || text.includes('full-stack')) {
      scores['frontend'] = (scores['frontend'] || 0) + 2;
      scores['backend'] = (scores['backend'] || 0) + 2;
    }
    
    // Check for hardware-specific keywords - these are more specific and should get extra weight
    const hardwareSpecificKeywords = ['hardware', 'circuit', 'board', 'sensor', 'iot', 'embedded', 'arduino', 'raspberry', 'firmware', 'microcontroller', 'pcb', 'esp32', 'stm32', 'schematic', 'electronics'];
    const hardwareMatches = hardwareSpecificKeywords.filter(keyword => text.includes(keyword)).length;
    if (hardwareMatches > 0) {
      // Add extra weight for hardware-specific keywords (they're more specific)
      scores['hardware'] = (scores['hardware'] || 0) + hardwareMatches;
    }

    // Find the role with the highest score
    let bestRole = null;
    let maxScore = 0;
    for (const [role, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestRole = role;
      }
    }

    if (!bestRole || maxScore === 0) {
      // Default to backend if no clear match
      bestRole = 'backend';
    }

    // Handle fullstack - find users with both frontend and backend roles
    const isFullstack = text.includes('fullstack') || text.includes('full stack') || text.includes('full-stack');
    
    // For fullstack, return both frontend and backend users
    if (isFullstack) {
      const frontendUsers = users.filter(u =>
        u.role !== 'admin' &&
        u.roles &&
        u.roles.includes('frontend')
      );
      const backendUsers = users.filter(u =>
        u.role !== 'admin' &&
        u.roles &&
        u.roles.includes('backend')
      );
      
      // Return object with both frontend and backend users
      return {
        isFullstack: true,
        frontendUser: frontendUsers.length > 0 ? frontendUsers[0] : null,
        backendUser: backendUsers.length > 0 ? backendUsers[0] : null
      };
    }
    
    // Find users with this role
    let suitableUsers = [];
    suitableUsers = users.filter(u =>
      u.role !== 'admin' &&
      u.roles &&
      u.roles.includes(bestRole)
    );

    if (suitableUsers.length === 0) {
      return null; // No suitable user
    }

    // For now, return the first suitable user
    // In future, could implement load balancing
    return { isFullstack: false, user: suitableUsers[0] };
  };

  const createTask = async (e) => {
    e.preventDefault();
    
    if (!createTaskForm.title.trim()) {
      alert("Task title is required");
      return;
    }
    
    setCreateLoading(true);
    try {
      const taskData = {
        title: createTaskForm.title.trim(),
        description: createTaskForm.description.trim(),
        priority: createTaskForm.priority,
        deadline: createTaskForm.due_date || null,
        status: "pending"
      };
      
      // Use AI to assign task based on title and user roles (auto allocation)
      const assignment = await assignTaskViaAI(taskData.title, taskData.description);
      
      if (!assignment) {
        alert("No suitable user found for this task. Please check user roles.");
        setCreateLoading(false);
        return;
      }
      
      // Handle fullstack - create TWO tasks (one for frontend, one for backend)
      if (assignment.isFullstack) {
        const tasksCreated = [];
        
        // Create task for frontend user
        if (assignment.frontendUser) {
          await adminAPI.createTaskForUser(assignment.frontendUser.id, {
            ...taskData,
            title: `${taskData.title} [Frontend]`
          });
          tasksCreated.push(assignment.frontendUser.username);
          window.dispatchEvent(new CustomEvent('taskAllocated', { detail: { assignedTo: assignment.frontendUser.id } }));
        }
        
        // Create task for backend user
        if (assignment.backendUser) {
          await adminAPI.createTaskForUser(assignment.backendUser.id, {
            ...taskData,
            title: `${taskData.title} [Backend]`
          });
          tasksCreated.push(assignment.backendUser.username);
          window.dispatchEvent(new CustomEvent('taskAllocated', { detail: { assignedTo: assignment.backendUser.id } }));
        }
        
        if (tasksCreated.length > 0) {
          alert(`Fullstack task created and assigned to: ${tasksCreated.join(", ")}`);
        } else {
          alert("No suitable users found for fullstack task.");
        }
      } else {
        // Regular single user assignment
        await adminAPI.createTaskForUser(assignment.user.id, taskData);
        alert(`Task created and assigned to ${assignment.user.username} successfully!`);
        window.dispatchEvent(new CustomEvent('taskAllocated', { detail: { assignedTo: assignment.user.id } }));
      }
      
      // Reset form and close modal
      setCreateTaskForm({
        title: "",
        description: "",
        priority: "medium",
        due_date: ""
      });
      setShowCreateModal(false);
      
      loadTasks();
    } catch (err) {
      alert("Failed to create task: " + handleApiError(err));
    } finally {
      setCreateLoading(false);
    }
  };

  // Fetch AI suggestion based on title input (debounced)
  const fetchAiSuggestion = async (title, keywords = []) => {
    console.log('Fetching AI suggestion for title:', title, 'with keywords:', keywords);
    if (!title.trim()) {
      setAiSuggestion(null);
      return;
    }

    setSuggestionLoading(true);
    try {
      const result = await aiAPI.generateDescription(title, keywords);
      console.log('AI API result:', result);
      setAiSuggestion({
        title: title, // Keep the user's typed title
        description: result.suggested_description,
        lines: result.suggested_lines || []
      });
      console.log('AI suggestion set:', {
        title: title,
        description: result.suggested_description,
        lines: result.suggested_lines || []
      });
    } catch (err) {
      console.error("Failed to fetch AI suggestion:", err);
      setAiSuggestion(null);
    } finally {
      setSuggestionLoading(false);
    }
  };

  // Handle title change (no AI suggestions while typing)
  const handleTitleChange = (newTitle) => {
    setCreateTaskForm({ ...createTaskForm, title: newTitle });
    // Clear any existing suggestions when title changes
    setAiSuggestion(null);
  };

  // Handle description change and trigger AI suggestions based on keywords
  const handleDescriptionChange = (newDescription) => {
    setCreateTaskForm({ ...createTaskForm, description: newDescription });

    // Clear existing suggestion if description is cleared
    if (!newDescription.trim()) {
      setAiSuggestion(null);
      return;
    }

    // Check for keywords that should trigger AI suggestions
    const keywords = ['front', 'frontend', 'front-end', 'back', 'backend', 'back-end', 'fullstack', 'full stack', 'full-stack', 'html', 'css', 'javascript', 'js', 'react', 'vue', 'angular', 'node', 'python', 'java', 'database', 'db', 'api', 'testing', 'test', 'qa', 'mobile', 'ios', 'android', 'hardware', 'circuit', 'sensor', 'embedded', 'network', 'security', 'devops', 'cloud', 'aws', 'docker', 'kubernetes'];
    const foundKeywords = keywords.filter(keyword =>
      newDescription.toLowerCase().includes(keyword)
    );
    const hasKeywords = foundKeywords.length > 0;

    // Trigger AI suggestion if we have keywords and sufficient length
    // Use title if available, otherwise use first few words of description as title
    const titleToUse = createTaskForm.title.trim() || newDescription.split(' ').slice(0, 3).join(' ');
    
    if (hasKeywords && newDescription.length >= 4) {
      console.log('Triggering AI suggestion for title:', titleToUse, 'with keywords:', foundKeywords, 'in:', newDescription);
      if (generationTimeout) clearTimeout(generationTimeout);
      generationTimeout = setTimeout(() => {
        fetchAiSuggestion(titleToUse, foundKeywords);
      }, 1000); // Longer delay for description
    } else {
      console.log('Not triggering AI suggestion. Title to use:', titleToUse, 'Found keywords:', foundKeywords, 'Description length:', newDescription.length);
      setAiSuggestion(null);
    }
  };

  // Profile Management
  const openAdminProfile = () => {
    setEditingProfile("admin");
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
      whatsapp_number: user?.whatsapp_number || "",
      bio: user?.bio || ""
    });
    setProfileMode("view");
    setShowProfileModal(true);
  };

  const handleAvatarClick = () => {
    setShowAvatarDropdown((v) => !v);
  };

  const openUserProfile = (userObj) => {
    setEditingProfile(userObj.id);
    setProfileForm({
      username: userObj.username || "",
      email: userObj.email || "",
      whatsapp_number: userObj.whatsapp_number || "",
      bio: userObj.bio || ""
    });
    setProfileMode("view");
    setShowProfileModal(true);
  };

  const saveProfileChanges = async () => {
    if (!profileForm.username.trim()) {
      alert("Username is required");
      return;
    }
    
    try {
      // Persist profile photo locally if provided
      if (profileForm.profile_photo_data_url && user?.id) {
        const key = `profile_photo_${user.id}`;
        localStorage.setItem(key, profileForm.profile_photo_data_url);
        setProfilePhoto(profileForm.profile_photo_data_url);
      }
      alert("Profile updated successfully!");
      setShowProfileModal(false);
      setProfileMode("view");
    } catch (err) {
      alert("Failed to update profile: " + handleApiError(err));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const calculateUserAnalytics = (userId) => {
    // Filter tasks assigned to this user
    const userTasks = tasks.filter(task => task.assigned_to === userId);
    
    const completed = userTasks.filter(task => task.status === "completed").length;
    const inProgress = userTasks.filter(task => task.status === "in_progress").length;
    const pending = userTasks.filter(task => task.status === "pending").length;
    const total = userTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate average time to completion (in days)
    const completedWithTime = userTasks.filter(task => task.status === "completed" && task.deadline);
    const avgDays = completedWithTime.length > 0 
      ? (Math.random() * 5 + 2).toFixed(1) // Simulated for demo
      : 0;

    // Get user info
    const user = users.find(u => u.id === userId);

    return {
      userId,
      username: user?.username || "Unknown",
      email: user?.email || "",
      totalTasks: total,
      completed,
      inProgress,
      pending,
      completionRate,
      avgDaysToComplete: avgDays,
      priority: {
        urgent: userTasks.filter(t => t.priority === "urgent").length,
        high: userTasks.filter(t => t.priority === "high").length,
        medium: userTasks.filter(t => t.priority === "medium").length,
        low: userTasks.filter(t => t.priority === "low").length
      }
    };
  };

  const handleViewUser = (user) => {
    const analytics = calculateUserAnalytics(user.id);
    setUserAnalyticsData(analytics);
    setShowUserAnalytics(true);
  };

  // Close modal and reset states
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setAiSuggestion(null);
    setCreateTaskForm({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
    });
  };

  // UI Helpers
  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getConfirmationColor = (status) => {
    const colors = {
      pending: "bg-orange-100 text-orange-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-300 text-slate-900 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold"><FaUserCog className="inline mr-2" /> Admin Panel</h1>
            <div className="flex flex-col gap-2">
              <p className="text-blue-700">Welcome, {user?.username}! <FaBullseye className="inline ml-1" /></p>
              {liveRefreshMessage && (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {liveRefreshMessage}
                </div>
              )}
            </div>
          </div>
            <div className="flex items-center gap-3 relative">
              {/* Avatar Dropdown */}
              <div className="relative">
                <button
                  onClick={handleAvatarClick}
                  className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 hover:bg-slate-100 transition focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 border-2 border-slate-300">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z" />
                    </svg>
                  </div>
                  <svg
                    className={`h-3 w-3 text-slate-600 transition-transform ${
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
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-lg shadow-xl z-50 border border-slate-100">
                    {/* My Profile */}
                    <button
                      onClick={() => {
                        setShowAvatarDropdown(false);
                        openAdminProfile();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                    >
                      <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-slate-900">My Profile</p>
                        <p className="text-xs text-slate-500">View your profile</p>
                      </div>
                    </button>

                    {/* Messages */}
                    <button
                      onClick={() => {
                        setShowAvatarDropdown(false);
                        setActiveTab("messages");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                    >
                      <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <div>
                        <p className="font-medium text-slate-900">Messages</p>
                        <p className="text-xs text-slate-500">View inbox</p>
                      </div>
                    </button>

                    {/* Sign Out */}
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
        </div>
      </header>

      {/* Sidebar + Main Content Layout */}
      <div className="flex">
        {/* Left Sidebar (vertical tabs) */}
        <aside className="w-64 bg-white border-r border-slate-300 min-h-screen">
          <div className="px-4 py-6">
            <div className="mb-6">
              <button
                onClick={() => {
                  loadUsers(); // Load users for dropdown
                  setShowCreateModal(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-slate-900 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap shadow-sm"
              >
                <FaPlus className="inline mr-2" /> Create Task
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { id: "overview", label: <><FaChartBar className="inline mr-1" /> Overview</>, icon: "chart" },
                { id: "tasks", label: <><FaClipboard className="inline mr-1" /> All Tasks</> },

                { id: "users", label: <><FaUsers className="inline mr-1" /> Users</> },
                { id: "confirmations", label: <><FaCheck className="inline mr-1" /> Confirmations</> },
                { id: "messages", label: <><FaComments className="inline mr-1" /> Messages</> },
                { id: "analytics", label: <><FaChartLine className="inline mr-1" /> Analytics</> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left py-3 px-3 rounded-md font-semibold transition flex items-center justify-between ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === "messages" && adminNotifications > 0 && (
                    <span className="ml-2 bg-red-500 text-slate-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {adminNotifications}
                    </span>
                  )}
                  {tab.id === "confirmations" && pendingConfirmations.length > 0 && (
                    <span className="ml-2 bg-orange-500 text-slate-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {pendingConfirmations.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg mb-6">
            <FaExclamationTriangle className="inline mr-2 text-yellow-500" /> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && analytics && (
              <div>
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white border border-slate-300 rounded-lg p-6 text-slate-900 shadow hover:shadow-lg transition">
                    <p className="text-slate-600 text-sm font-medium">Total Tasks</p>
                    <h3 className="text-4xl font-bold mt-2">{analytics.total_tasks}</h3>
                  </div>
                  <div className="bg-white border border-slate-300 rounded-lg p-6 text-slate-900 shadow hover:shadow-lg transition">
                    <p className="text-slate-600 text-sm font-medium">Total Users</p>
                    <h3 className="text-4xl font-bold mt-2">{analytics.total_users}</h3>
                  </div>
                  <div className="bg-white border border-slate-300 rounded-lg p-6 text-slate-900 shadow hover:shadow-lg transition">
                    <p className="text-slate-600 text-sm font-medium">Completion Rate</p>
                    <h3 className="text-4xl font-bold mt-2">{analytics.completion_rate}%</h3>
                  </div>
                  <div className="bg-white border border-slate-300 rounded-lg p-6 text-slate-900 shadow hover:shadow-lg transition">
                    <p className="text-slate-600 text-sm font-medium">Pending Confirmations</p>
                    <h3 className="text-4xl font-bold mt-2">
                      {pendingConfirmations.length}
                    </h3>
                  </div>
                </div>

                {/* Task Status Breakdown */}
                {analytics.tasks_by_status && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-slate-300 rounded-lg p-6">
                      <h4 className="text-slate-900 font-semibold mb-4">Tasks by Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Pending:</span>
                          <span className="text-amber-600 font-bold">
                            {analytics.tasks_by_status.pending || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">In Progress:</span>
                          <span className="text-blue-600 font-bold">
                            {analytics.tasks_by_status.in_progress || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Completed:</span>
                          <span className="text-green-600 font-bold">
                            {analytics.tasks_by_status.completed || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-300 rounded-lg p-6">
                      <h4 className="text-slate-900 font-semibold mb-4">
                        Confirmation Status
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Pending:</span>
                          <span className="text-amber-600 font-bold">
                            {analytics.tasks_by_confirmation?.pending || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Approved:</span>
                          <span className="text-green-600 font-bold">
                            {analytics.tasks_by_confirmation?.approved || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Rejected:</span>
                          <span className="text-red-600 font-bold">
                            {analytics.tasks_by_confirmation?.rejected || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-300 rounded-lg p-6">
                      <h4 className="text-slate-900 font-semibold mb-4">Priority Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.tasks_by_priority || {}).map(
                          ([priority, count]) => (
                            <div key={priority} className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                {getPriorityIcon(priority)} {priority.charAt(0).toUpperCase() + priority.slice(1)}:
                              </span>
                              <span className="text-slate-900 font-bold">{count}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Pending Confirmations */}
                {pendingConfirmations.length > 0 && (
                  <div className="bg-white border border-slate-300 rounded-lg p-6">
                    <h4 className="text-slate-900 font-semibold mb-4">
                      <FaSearch className="inline mr-1" /> Pending Confirmations ({pendingConfirmations.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {pendingConfirmations.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="bg-slate-50 p-3 rounded flex justify-between items-start cursor-pointer hover:bg-blue-50 transition border border-slate-300"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex-1">
                            <p className="text-slate-900 font-semibold">{task.title}</p>
                            <p className="text-slate-600 text-sm">
                              <FaUser className="inline mr-1" /> {task.username} • Status: {task.status}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === "tasks" && (
              <div>
                <div className="flex gap-2 mb-6 flex-wrap">
                  {["all", "pending", "in_progress", "completed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setTaskFilter(status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        taskFilter === status
                          ? "bg-blue-600 text-slate-900"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {status === "in_progress"
                        ? "In Progress"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4">
                  {tasks.length === 0 ? (
                    <div className="bg-slate-100 rounded-lg p-8 text-center border border-slate-300">
                      <p className="text-slate-600">No tasks found</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white border border-slate-300 rounded-lg p-6 hover:border-blue-400 shadow-sm hover:shadow-md transition cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-slate-900 font-bold text-lg">{task.title}</h3>
                            <p className="text-slate-600 text-sm mt-1">{task.description}</p>
                            <div className="flex gap-2 mt-3 flex-wrap">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                  task.status
                                )}`}
                              >
                                {task.status.replace("_", " ").toUpperCase()}
                              </span>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getConfirmationColor(task.confirmation_status)}`}>
                                Conf: {task.confirmation_status.toUpperCase()}
                              </span>
                              <span className="text-sm text-slate-600">
                                {getPriorityIcon(task.priority)} {task.priority}
                              </span>
                              <span className="text-sm text-slate-600">
                                <FaUser className="inline mr-1" /> {task.username}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.length === 0 ? (
                  <div className="bg-slate-100 rounded-lg p-8 text-center col-span-full border border-slate-300">
                    <p className="text-slate-600">No users found</p>
                  </div>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="bg-white border border-slate-300 rounded-lg p-6 hover:border-blue-400 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-slate-900 font-bold text-lg">{u.username}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            u.role === "admin"
                              ? "bg-slate-600 text-slate-900"
                              : "bg-blue-600 text-slate-900"
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mb-2"><FaEnvelope className="inline mr-2" /> {u.email}</p>
                      <p className="text-slate-600 text-sm mb-4"><FaWhatsapp className="inline mr-2" /> {u.whatsapp_number}</p>
                      <div className="flex gap-2">
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleViewUser(u)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-slate-900 px-3 py-2 rounded-lg font-semibold transition text-sm"
                          >
                            <FaEye className="inline mr-2" /> View
                          </button>
                        )}
                        <button
                          onClick={() => openUserProfile(u)}
                          className={`${u.role !== "admin" ? "flex-1" : "w-full"} bg-slate-600 hover:bg-slate-700 text-slate-900 px-3 py-2 rounded-lg font-semibold transition text-sm`}
                        >
                          <FaUser className="inline mr-2" /> Profile
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CONFIRMATIONS TAB */}
            {activeTab === "confirmations" && (
              <div>
                {pendingConfirmations.length === 0 ? (
                  <div className="bg-slate-100 rounded-lg p-8 text-center border border-slate-300">
                    <p className="text-slate-600 text-lg"><FaCheck className="inline mr-2 text-green-500" /> All tasks are confirmed!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingConfirmations.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white border-l-4 border-amber-500 rounded-lg p-6 hover:shadow-md transition shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-slate-900 font-bold text-lg">{task.title}</h3>
                            <p className="text-slate-600 text-sm mt-1">{task.description}</p>
                            <div className="flex gap-2 mt-3 flex-wrap">
                              <span className="text-sm text-slate-600">
                                <FaUser className="inline mr-1" /> {task.username}
                              </span>
                              <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              <span className="text-sm text-slate-600">
                                {getPriorityIcon(task.priority)} {task.priority}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="bg-blue-600 hover:bg-blue-700 text-slate-900 px-4 py-2 rounded-lg font-semibold transition"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === "messages" && (
              <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Users List */}
                  <div className="lg:col-span-1 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                    <div className="bg-slate-100 p-4 border-b border-slate-300">
                      <h3 className="text-lg font-bold text-slate-900"><FaUsers className="inline mr-1" /> Users</h3>
                    </div>
                      <div className="overflow-y-auto max-h-96">
                      {contacts.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          <p>No contacts available</p>
                        </div>
                      ) : (
                        contacts.map((c) => (
                          <button
                            key={c.user_id}
                            onClick={() => {
                              setSelectedUserForChat({ id: c.user_id, username: c.username, email: c.email });
                              setShowMessagesModal(true);
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-slate-300 transition bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 ${c.unread_count > 0 ? 'ring-2 ring-yellow-400' : ''}`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">{c.username}</p>
                                <p className="text-xs opacity-75">{c.email}</p>
                              </div>
                              <div className="text-right">
                                {c.last_message && (
                                  <p className="text-xs text-slate-500">{c.last_message.text.slice(0, 40)}{c.last_message.text.length>40?'...':''}</p>
                                )}
                                {c.unread_count > 0 && (
                                  <span className="inline-block bg-yellow-400 text-black text-xs px-2 py-1 rounded-full">{c.unread_count}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Messages Info */}
                    <div className="lg:col-span-3 bg-white rounded-lg border border-slate-300 p-6 shadow-sm">

                    {/* Admin Notifications */}
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4"><FaBell className="inline mr-2" /> Real-time Messages</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <button
                          onClick={async () => {
                            setActiveTab("messages");
                            try {
                              const res = await messageAPI.getContacts();
                              const ct = res.contacts || [];
                              setContacts(ct);
                              if (ct.length > 0) {
                                const top = ct[0];
                                setSelectedUserForChat({ id: top.user_id, username: top.username, email: top.email });
                                setShowMessagesModal(true);
                              }
                            } catch (err) {
                              console.error('Failed to load contacts on notification click', err);
                            }
                          }}
                          className="w-full text-left bg-blue-50 border-l-4 border-blue-500 p-4 rounded hover:bg-blue-100"
                        >
                          <p className="font-semibold text-blue-800"><FaEnvelope className="inline mr-2" /> Unread Messages</p>
                          <p className="text-sm text-blue-700 mt-1">You have {adminNotifications} unread message{adminNotifications !== 1 ? "s" : ""}</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <>
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">⏳ Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                      <h4 className="text-slate-900 font-bold mb-4"><FaChartBar className="inline mr-2" /> Overview Stats</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Total Tasks:</span>
                          <span className="text-slate-900 font-bold">{analytics.total_tasks}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Total Users:</span>
                          <span className="text-slate-900 font-bold">{analytics.total_users}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Completion Rate:</span>
                          <span className="text-green-600 font-bold">
                            {analytics.completion_rate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {analytics.users_by_role && (
                      <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                        <h4 className="text-slate-900 font-bold mb-4"><FaUsers className="inline mr-2" /> Users by Role</h4>
                        <div className="space-y-2">
                          {Object.entries(analytics.users_by_role).map(([role, count]) => (
                            <div key={role} className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                {role.charAt(0).toUpperCase() + role.slice(1)}:
                              </span>
                              <span className="text-slate-900 font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-red-400">❌ Failed to load analytics</p>
                  </div>
                )}
              </>
            )}
        </>
        )}
      </div>

      {/* Task Confirmation Modal */}
      {selectedTask && selectedTask.status === "completed" && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-300 shadow-xl">
            <div className="bg-white border-b border-slate-300 p-6 flex justify-between items-start sticky top-0">
              <h2 className="text-2xl font-bold text-slate-900">{selectedTask.title}</h2>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setConfirmationFeedback("");
                }}
                className="text-gray-400 hover:text-slate-900 text-2xl"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-blue-500 mb-2">{selectedTask.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                  <span className="text-sm text-gray-400">
                    <FaUser className="inline mr-1" /> {selectedTask.username}
                  </span>
                </div>
              </div>

              {selectedTask.confirmation_status !== "approved" ? (
                <>
                  <div className="mb-4">
                    <label className="block text-slate-900 font-semibold mb-2">
                      Your Feedback:
                    </label>
                    <textarea
                      value={confirmationFeedback}
                      onChange={(e) => setConfirmationFeedback(e.target.value)}
                      placeholder="Enter any feedback or comments..."
                      className="w-full bg-white text-slate-900 p-3 rounded border border-slate-300 focus:border-blue-500"
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        confirmTaskStatus(selectedTask.id, "approved")
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 text-slate-900 px-4 py-3 rounded-lg font-semibold transition"
                    >
                      <FaCheck className="inline mr-2" /> Approve
                    </button>
                    <button
                      onClick={() =>
                        confirmTaskStatus(selectedTask.id, "rejected")
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-slate-900 px-4 py-3 rounded-lg font-semibold transition"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Status:</span>{" "}
                    {selectedTask.confirmation_status.toUpperCase()}
                  </p>
                  {selectedTask.confirmation_feedback && (
                    <p className="text-sm text-gray-400 mt-2">
                      <span className="font-semibold">Feedback:</span>{" "}
                      {selectedTask.confirmation_feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800"><FaPlus className="inline mr-2" /> Create New Task</h2>
              <button
                onClick={() => closeCreateModal()}
                className="text-gray-400 hover:text-slate-900 text-2xl"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Task Title + AI Suggestions */}
              <form onSubmit={createTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter task title (optional - AI will suggest based on description)"
                    value={createTaskForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                {aiSuggestion && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">AI Description Suggestion</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{aiSuggestion.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiSuggestion(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                      >
                        Dismiss
                      </button>
                    </div>

                    {aiSuggestion.description && (
                      <p className="text-sm text-gray-700 mt-2">{aiSuggestion.description}</p>
                    )}

                    {aiSuggestion.lines && aiSuggestion.lines.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-700 font-semibold">Action Items:</p>
                        <ul className="text-xs text-gray-800 list-disc list-inside space-y-1 mt-1">
                          {aiSuggestion.lines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const fullDescription = aiSuggestion.description +
                          (aiSuggestion.lines && aiSuggestion.lines.length > 0
                            ? "\n\nAction Items:\n• " + aiSuggestion.lines.join("\n• ")
                            : "");
                        setCreateTaskForm(prev => ({
                          ...prev,
                          description: fullDescription
                        }));
                        setAiSuggestion(null);
                      }}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
                    >
                      <FaLightbulb className="inline" /> Use Description
                    </button>
                  </div>
                )}

                {/* Task Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Enter task description - type keywords like 'frontend', 'backend', 'fullstack', 'hardware' to get detailed AI suggestions"
                    value={createTaskForm.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {suggestionLoading && (
                    <p className="text-xs text-gray-500 mt-1">Generating AI suggestions...</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={createTaskForm.priority}
                    onChange={(e) =>
                      setCreateTaskForm({ ...createTaskForm, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="low"><MdRadioButtonChecked className="inline text-green-500 mr-1" /> Low</option>
                    <option value="medium"><MdRadioButtonChecked className="inline text-yellow-500 mr-1" /> Medium</option>
                    <option value="high"><MdRadioButtonChecked className="inline text-red-500 mr-1" /> High</option>
                    <option value="urgent"><FaExclamationTriangle className="inline text-red-600 mr-1" /> Urgent</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={createTaskForm.due_date}
                    onChange={(e) =>
                      setCreateTaskForm({ ...createTaskForm, due_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-slate-900 font-semibold py-2 rounded-lg transition text-sm"
                  >
                    {createLoading ? "Creating..." : <><FaCheck className="inline mr-2" /> Create Task</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeCreateModal()}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingProfile === "admin" ? (
                  <><FaUserCog className="inline mr-2" /> Admin Profile</>
                ) : (
                  <><FaUser className="inline mr-2" /> User Profile</>
                )}
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-200 text-2xl"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {profileMode === "view" ? (
                <>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Username</p>
                    <p className="text-slate-900 font-semibold text-lg">{profileForm.username}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-slate-900 font-semibold">{profileForm.email}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">WhatsApp</p>
                    <p className="text-slate-900 font-semibold">{profileForm.whatsapp_number || "Not set"}</p>
                  </div>
                  {profileForm.bio && (
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-gray-400 text-sm">Bio</p>
                      <p className="text-slate-900">{profileForm.bio}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setProfileMode("edit")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-slate-900 font-semibold py-2 rounded-lg transition mt-4"
                  >
                    <FaEdit className="inline mr-2" /> Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, username: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.whatsapp_number}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, whatsapp_number: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, bio: e.target.value })
                      }
                      rows="3"
                      className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                        {profileForm.profile_photo_data_url || profilePhoto ? (
                          <img src={profileForm.profile_photo_data_url || profilePhoto} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl"><FaUser /></span>
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
                        className="text-sm text-gray-300"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={saveProfileChanges}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-slate-900 font-semibold py-2 rounded-lg transition"
                    >
                      <FaCheck className="inline mr-2" /> Save Changes
                    </button>
                    <button
                      onClick={() => setProfileMode("view")}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-slate-900 font-semibold py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Modal */}
      {showUserAnalytics && userAnalyticsData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-screen md:max-h-96 overflow-hidden flex flex-col">
            {/* Modal Header - Sticky */}
            <div className="bg-gray-100 p-4 md:p-6 flex justify-between items-center border-b border-slate-300 flex-shrink-0">
              <h2 className="text-xl md:text-2xl font-bold text-blue-700"><FaChartBar className="inline mr-2" /> User Analytics</h2>
              <button
                onClick={() => setShowUserAnalytics(false)}
                className="text-gray-300 hover:text-slate-900 text-2xl font-bold flex-shrink-0 ml-4"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 p-4 md:p-6 space-y-6">
              {/* User Info */}
              <div className="bg-white border border-slate-300 rounded-lg p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-slate-900">{userAnalyticsData.username}</h3>
                <p className="text-slate-600 mt-1 text-sm md:text-base"><FaEnvelope className="inline mr-2" /> {userAnalyticsData.email}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-300">
                  <p className="text-slate-600 text-xs md:text-sm font-semibold">Total Tasks</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">{userAnalyticsData.totalTasks}</p>
                </div>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-300">
                  <p className="text-slate-600 text-xs md:text-sm font-semibold">Completed</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">{userAnalyticsData.completed}</p>
                </div>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-300">
                  <p className="text-slate-600 text-xs md:text-sm font-semibold">In Progress</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">{userAnalyticsData.inProgress}</p>
                </div>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-300">
                  <p className="text-slate-600 text-xs md:text-sm font-semibold">Pending</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">{userAnalyticsData.pending}</p>
                </div>
              </div>

              {/* Completion Rate and Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Completion Rate */}
                <div className="bg-white rounded-lg p-4 md:p-6 border border-slate-300">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4"><FaStar className="inline mr-1" /> Completion Rate</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600 text-sm">Progress</span>
                    <span className="text-xl md:text-2xl font-bold text-green-400">{userAnalyticsData.completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all"
                      style={{ width: `${userAnalyticsData.completionRate}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-600 text-xs mt-3">
                    <FaBullseye className="inline mr-2" /> {userAnalyticsData.completed} of {userAnalyticsData.totalTasks} tasks completed
                  </p>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4"><FaStopwatch className="inline mr-2" /> Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Avg Days to Complete</span>
                      <span className="text-lg md:text-xl font-bold text-blue-400">{userAnalyticsData.avgDaysToComplete} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Productivity Score</span>
                      <span className="text-lg md:text-xl font-bold text-purple-400">
                        {Math.round(userAnalyticsData.completionRate * 1.2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Reliability</span>
                      <span className="text-lg md:text-xl font-bold text-cyan-400">
                        {Math.max(50, userAnalyticsData.completionRate + 20)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Priority Breakdown */}
              <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4"><FaBullseye className="inline mr-2" /> Task Priority Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-red-900 rounded-lg p-3 md:p-4">
                    <p className="text-red-300 text-xs md:text-sm"><MdRadioButtonChecked className="inline mr-1 text-red-400" /> Urgent</p>
                    <p className="text-xl md:text-2xl font-bold text-red-400 mt-2">{userAnalyticsData.priority.urgent}</p>
                  </div>
                  <div className="bg-orange-900 rounded-lg p-3 md:p-4">
                    <p className="text-orange-300 text-xs md:text-sm"><MdRadioButtonChecked className="inline mr-1 text-orange-400" /> High</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-400 mt-2">{userAnalyticsData.priority.high}</p>
                  </div>
                  <div className="bg-yellow-900 rounded-lg p-3 md:p-4">
                    <p className="text-yellow-300 text-xs md:text-sm"><MdRadioButtonChecked className="inline mr-1 text-yellow-400" /> Medium</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-400 mt-2">{userAnalyticsData.priority.medium}</p>
                  </div>
                  <div className="bg-green-900 rounded-lg p-3 md:p-4">
                    <p className="text-green-300 text-xs md:text-sm"><MdRadioButtonChecked className="inline mr-1 text-green-400" /> Low</p>
                    <p className="text-xl md:text-2xl font-bold text-green-400 mt-2">{userAnalyticsData.priority.low}</p>
                  </div>
                </div>
              </div>

              {/* Status Distribution Chart */}
              <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4"><FaChartLine className="inline mr-2" /> Task Status Distribution</h3>
                <div className="w-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm text-gray-300">Completed</span>
                          <span className="text-xs md:text-sm font-bold text-green-400">{userAnalyticsData.completed}/{userAnalyticsData.totalTasks}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: userAnalyticsData.totalTasks > 0
                                ? `${(userAnalyticsData.completed / userAnalyticsData.totalTasks) * 100}%`
                                : "0%"
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm text-gray-300">In Progress</span>
                          <span className="text-xs md:text-sm font-bold text-blue-400">{userAnalyticsData.inProgress}/{userAnalyticsData.totalTasks}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: userAnalyticsData.totalTasks > 0
                                ? `${(userAnalyticsData.inProgress / userAnalyticsData.totalTasks) * 100}%`
                                : "0%"
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm text-gray-300">Pending</span>
                          <span className="text-xs md:text-sm font-bold text-red-400">{userAnalyticsData.pending}/{userAnalyticsData.totalTasks}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{
                              width: userAnalyticsData.totalTasks > 0
                                ? `${(userAnalyticsData.pending / userAnalyticsData.totalTasks) * 100}%`
                                : "0%"
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUserAnalytics(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-slate-900 px-4 py-2 md:py-3 rounded-lg font-semibold transition"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal - Now using the new MessagesModal component */}
      {showMessagesModal && selectedUserForChat && (
        <MessagesModal
          isOpen={showMessagesModal}
          onClose={() => {
            setShowMessagesModal(false);
            loadAdminMessages(); // Refresh unread count
          }}
          recipientId={selectedUserForChat.id}
          recipientName={selectedUserForChat.username}
          currentUserId={user?.id}
          currentUserRole="admin"
        />
      )}
        </main>
      </div>
    </div>

  );
};

export default AdminDashboard;
