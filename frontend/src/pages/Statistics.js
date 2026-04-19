/**
 * Statistics Page
 * Displays comprehensive task statistics and analytics
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { taskAPI, logout, handleApiError } from "../utils/api";
import { MdRadioButtonChecked } from 'react-icons/md';
import { FaExclamationTriangle, FaUser, FaEye, FaCalendar, FaClipboard } from 'react-icons/fa';

const Statistics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const [filter, setFilter] = useState("all");
  const [viewTask, setViewTask] = useState(null); // For viewing task details

  const showToast = (message, type = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev)), 2800);
  };

  useEffect(() => {
    fetchStats();
    fetchTasks();
  }, [filter]);

  // listen for external status changes to refresh tasks
  useEffect(() => {
    const handler = (e) => {
      const { taskId, status } = e.detail || {};
      if (status === 'approved' || status === 'rejected') {
        fetchTasks();
        fetchStats(false);
      }
    };
    window.addEventListener('taskStatusChanged', handler);
    return () => window.removeEventListener('taskStatusChanged', handler);
  }, []);

  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) setStatsLoading(true);
      const res = await taskAPI.getStats();
      setStats(res);
      setError(null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      if (showLoading) setStatsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const filters = filter !== "all" ? { status: filter } : {};
      const res = await taskAPI.getTasks(filters);
      const received = res.tasks || [];
      // make sure every task has some kind of identifier; the API normally returns `id` not `_id`
      const fixed = received.map((t, idx) => {
        if (!t.id && t._id) {
          // some older endpoints might accidentally include Mongo _id
          return { ...t, id: t._id };
        }
        if (!t.id) {
          console.warn("Statistics.fetchTasks task missing id", t);
          // give it a synthetic id so React rendering still works
          return { ...t, id: `missing-${idx}` };
        }
        return t;
      });
      setTasks(fixed);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus, task = null) => {
    try {
      const payload = { status: newStatus };
      // if re-submitting a previously rejected completed task, reset confirmation
      if (newStatus === "completed" && task && task.confirmation_status === "rejected") {
        payload.confirmation_status = "pending";
      }
      await taskAPI.updateTask(taskId, payload);
      fetchTasks();
      // Avoid a full loading spinner when updating status via drag/drop
      fetchStats(false);
      const wasRejected = task && task.confirmation_status === "rejected";
      const message = wasRejected && newStatus === "completed" 
        ? "Task updated and sent for admin approval" 
        : "Task status updated";
      showToast(message, "success");
    } catch (err) {
      showToast("Failed to update task status: " + (err.response?.data?.error || err.message), "error");
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

    await updateTaskStatus(task.id || task._id, newStatus, task);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
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


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg mb-6 mb-8">
            <FaExclamationTriangle className="inline mr-2 text-yellow-500" /> {error}
          </div>
        )}

        {toast.visible && (
          <div
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        {statsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading statistics...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Task Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition">
                  <p className="text-gray-600 text-sm font-medium">Total Tasks</p>
                  <h3 className="text-4xl font-bold text-blue-600 mt-2">{stats.total_tasks}</h3>
                  <p className="text-xs text-gray-500 mt-2">All tasks assigned</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition">
                  <p className="text-gray-600 text-sm font-medium">Pending</p>
                  <h3 className="text-4xl font-bold text-yellow-600 mt-2">{stats.pending_tasks}</h3>
                  <p className="text-xs text-gray-500 mt-2">Awaiting start</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-400 hover:shadow-lg transition">
                  <p className="text-gray-600 text-sm font-medium">In Progress</p>
                  <h3 className="text-4xl font-bold text-blue-400 mt-2">{stats.in_progress_tasks}</h3>
                  <p className="text-xs text-gray-500 mt-2">Currently being worked on</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition">
                  <p className="text-gray-600 text-sm font-medium">Completed</p>
                  <h3 className="text-4xl font-bold text-green-600 mt-2">{stats.completed_tasks}</h3>
                  <p className="text-xs text-gray-500 mt-2">Successfully finished</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition">
                  <p className="text-gray-600 text-sm font-medium">Completion Rate</p>
                  <h3 className="text-4xl font-bold text-purple-600 mt-2">{stats.completion_rate}%</h3>
                  <p className="text-xs text-gray-500 mt-2">Overall progress</p>
                </div>
              </div>
            </div>

            {/* Task Filtering Section */}
            <div className="mt-12 mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Tasks</h2>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter("in_progress")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "in_progress"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Completed
                </button>
              </div>

              {/* Task Board (Drag & Drop) */}
              {tasks.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                  No tasks found for the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: "pending", label: "Pending", color: "bg-yellow-50 border-yellow-400" },
                    { key: "in_progress", label: "In Progress", color: "bg-blue-50 border-blue-400" },
                    { key: "completed", label: "Completed", color: "bg-green-50 border-green-400" },
                  ].map((column) => {
                    const columnTasks = tasks.filter((t) => t.status === column.key);
                    return (
                      <div
                        key={column.key}
                        className={`rounded-lg border-l-4 p-4 ${column.color} flex flex-col h-full`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(column.key)}
                      >
                        <h3 className="text-lg font-semibold mb-3">{column.label}</h3>
                        {columnTasks.length === 0 ? (
                          <div className="text-sm text-slate-500">No tasks</div>
                        ) : (
                          <div className="space-y-3 flex-1">
                            {columnTasks.map((task) => {
                              const taskId = task.id || task._id;
                              const isApproved = task.confirmation_status === "approved";
                              return (
                                <div
                                  key={taskId}
                                  draggable={!isApproved}
                                  onDragStart={(e) => !isApproved && handleDragStart(e, taskId)}
                                  className={`bg-white border border-slate-300 rounded-lg p-4 shadow-sm transition ${
                                    isApproved
                                      ? "opacity-75 cursor-not-allowed bg-gray-50"
                                      : "hover:shadow-2xl transform-gpu hover:-translate-y-1 hover:scale-105 cursor-move"
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-slate-900 font-semibold">{task.title}</h4>
                                      <p className="text-slate-600 text-sm mt-1 line-clamp-2">{task.description}</p>
                                      {isApproved && (
                                        <p className="text-xs text-green-600 font-semibold mt-1">✓ Approved by Admin</p>
                                      )}
                                      {task.confirmation_status === "rejected" && task.confirmation_feedback && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                          <strong>Admin Feedback:</strong> {task.confirmation_feedback}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                      {task.status.replace("_", " ")}
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                                    <div className="flex flex-wrap gap-2 items-center">
                                      <span className="text-sm text-slate-600">
                                        {getPriorityIcon(task.priority)} {task.priority}
                                      </span>
                                      {task.username && (
                                        <span className="text-sm text-slate-600 flex items-center gap-1">
                                          <FaUser /> {task.username}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setViewTask(task)}
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition"
                                    >
                                      <FaEye /> View
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Statistics Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Progress Chart */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Task Progress</h3>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Completed Tasks</span>
                      <span className="text-sm font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        {stats.completed_tasks} / {stats.total_tasks}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width:
                            stats.total_tasks > 0
                              ? `${(stats.completed_tasks / stats.total_tasks) * 100}%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">In Progress Tasks</span>
                      <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        {stats.in_progress_tasks} / {stats.total_tasks}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width:
                            stats.total_tasks > 0
                              ? `${(stats.in_progress_tasks / stats.total_tasks) * 100}%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Pending Tasks</span>
                      <span className="text-sm font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                        {stats.pending_tasks} / {stats.total_tasks}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width:
                            stats.total_tasks > 0
                              ? `${(stats.pending_tasks / stats.total_tasks) * 100}%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Key Metrics</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Average Tasks per Status</p>
                      <p className="text-xs text-gray-500 mt-1">Average distribution</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.total_tasks > 0 ? (stats.total_tasks / 3).toFixed(1) : 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Success Metrics</p>
                      <p className="text-xs text-gray-500 mt-1">Task completion efficiency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{stats.completion_rate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Active Tasks</p>
                      <p className="text-xs text-gray-500 mt-1">Tasks in progress or pending</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.in_progress_tasks + stats.pending_tasks}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
            No statistics available yet. Start by creating some tasks!
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {viewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                <FaClipboard className="inline mr-2" /> Task Details
              </h2>
              <button
                onClick={() => setViewTask(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <p className="text-gray-500 text-sm font-semibold">Title</p>
                <p className="text-slate-900 font-semibold text-lg">{viewTask.title}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-500 text-sm font-semibold">Description</p>
                <p className="text-slate-700 whitespace-pre-wrap">{viewTask.description || "No description provided"}</p>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm font-semibold">Status</p>
                  <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(viewTask.status)}`}>
                    {viewTask.status?.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-semibold">Priority</p>
                  <span className="inline-block mt-1 text-sm">
                    {getPriorityIcon(viewTask.priority)} {viewTask.priority}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-gray-500 text-sm font-semibold">Category</p>
                <p className="text-slate-700 capitalize">{viewTask.category || "general"}</p>
              </div>

              {/* Deadline - Debug: {JSON.stringify(viewTask.deadline)} */}
              <div>
                <p className="text-gray-500 text-sm font-semibold">
                  <FaCalendar className="inline mr-1" /> Deadline
                </p>
                <p className="text-slate-700">
                  {viewTask && viewTask.deadline
                    ? new Date(viewTask.deadline).toLocaleDateString()
                    : viewTask && viewTask.due_date
                      ? new Date(viewTask.due_date).toLocaleDateString()
                      : "No deadline set"}
                </p>
                {viewTask && !viewTask.deadline && !viewTask.due_date && (
                  <p className="text-xs text-red-500 mt-1">Debug: {JSON.stringify(viewTask).slice(0, 200)}</p>
                )}
              </div>

              {/* Assigned By */}
              {viewTask.assigned_by_username && (
                <div>
                  <p className="text-gray-500 text-sm font-semibold">Assigned By</p>
                  <p className="text-slate-700">{viewTask.assigned_by_username}</p>
                </div>
              )}

              {/* Confirmation Status */}
              {viewTask.confirmation_status && (
                <div>
                  <p className="text-gray-500 text-sm font-semibold">Confirmation Status</p>
                  <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full ${
                    viewTask.confirmation_status === "approved" ? "bg-green-100 text-green-700" :
                    viewTask.confirmation_status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {viewTask.confirmation_status}
                  </span>
                </div>
              )}

              {/* Admin Feedback */}
              {viewTask.confirmation_feedback && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm font-semibold">Admin Feedback</p>
                  <p className="text-slate-700">{viewTask.confirmation_feedback}</p>
                </div>
              )}

              {/* Created Date */}
              <div>
                <p className="text-gray-500 text-sm font-semibold">Created</p>
                <p className="text-slate-700 text-sm">
                  {viewTask.created_at ? new Date(viewTask.created_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setViewTask(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
