/**
 * TaskItem component for displaying individual task cards.
 * Includes task actions, status updates, and quick editing.
 */

import React, { useState, useEffect } from 'react';
import { FaCheck, FaPlay, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaEye } from 'react-icons/fa';

const TaskItem = ({ task, onAction }) => {
  console.log('TaskItem: Rendering task:', task);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editData, setEditData] = useState({
    status: task.status,
    priority: task.priority
  });

  // Keep quick-edit state in sync if the task changes
  useEffect(() => {
    setEditData({
      status: task.status,
      priority: task.priority,
    });
  }, [task.status, task.priority]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-primary';
      case 'low': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-warning';
      case 'pending': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const isOverdue = () => {
    if (!task.deadline || task.status === 'completed') return false;
    const d = new Date(task.deadline);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
  };

  const handleQuickUpdate = async () => {
    await onAction(task.id, 'update', editData);
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus) => {
    await onAction(task.id, 'update', { status: newStatus });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await onAction(task.id, 'delete');
    }
  };

  const createdAt = formatDate(task.created_at);
  const updatedAt = formatDate(task.updated_at);
  const deadlineStr = formatDate(task.deadline);

  return (
    <>
      <div
        className={`card transition-all duration-200 hover:shadow-md ${
          isOverdue() ? 'border-danger-200 bg-danger-50' : ''
        }`}
      >
        <div className="card-content">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Task Header */}
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {task.title}
                </h3>
                {task.ai_generated && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    🤖 AI
                  </span>
                )}
                {isOverdue() && (
                  <span className="text-xs bg-danger-100 text-danger-800 px-2 py-1 rounded-full">
                    ⚠️ Overdue
                  </span>
                )}
              </div>

              {/* Task Meta */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`badge ${getStatusColor(task.status)}`}>
                  {String(task.status).replace('_', ' ')}
                </span>
                <span className={`badge ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                {task.category && (
                  <span className="badge badge-secondary">
                    {task.category}
                  </span>
                )}
                {deadlineStr && (
                  <span className="text-sm text-gray-600">
                    📅 {deadlineStr}
                  </span>
                )}
              </div>

              {/* Task Description */}
              {task.description && (
                <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {task.description}
                </p>
              )}

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className={`mt-3 ${isExpanded ? '' : 'hidden'}`}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Subtasks:</h4>
                  <ul className="space-y-1">
                    {task.subtasks.map((subtask, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                        {subtask}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Edit Form */}
              {isEditing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        className="input"
                        value={editData.status}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, status: e.target.value }))
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        className="input"
                        value={editData.priority}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, priority: e.target.value }))
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={handleQuickUpdate} className="btn-primary text-sm">
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 ml-4">
              <div className="flex space-x-1">
                {/* Status Toggle Buttons */}
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    title="Mark as completed"
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors flex items-center justify-center"
                  >
                    <FaCheck size={18} />
                  </button>
                )}

                {task.status !== 'in_progress' && task.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    title="Mark as in progress"
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors flex items-center justify-center"
                  >
                    <FaPlay size={18} />
                  </button>
                )}

                {/* View Button */}
                <button
                  onClick={() => setShowViewModal(true)}
                  title="View full details"
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex items-center justify-center"
                >
                  <FaEye size={18} />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  title="Quick edit"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center justify-center"
                >
                  <FaEdit size={18} />
                </button>

                {/* Delete Button */}
                <button
                  onClick={handleDelete}
                  title="Delete task"
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center"
                >
                  <FaTrash size={18} />
                </button>
              </div>

              {/* Expand/Collapse Button */}
              {(task.description || (task.subtasks && task.subtasks.length > 0)) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  className="p-2 text-gray-400 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-center"
                >
                  {isExpanded ? <FaChevronUp size={18} /> : <FaChevronDown size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Task Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>{createdAt ? `Created: ${createdAt}` : 'Created: —'}</span>
            {updatedAt && updatedAt !== createdAt && <span>Updated: {updatedAt}</span>}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Task Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                {task.ai_generated && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-2 inline-block">
                    🤖 AI Generated
                  </span>
                )}
              </div>

              {/* Status and Priority */}
              <div className="flex flex-wrap gap-2">
                <span className={`badge ${getStatusColor(task.status)}`}>
                  {String(task.status).replace('_', ' ')}
                </span>
                <span className={`badge ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                {task.category && (
                  <span className="badge badge-secondary">
                    {task.category}
                  </span>
                )}
                {isOverdue() && (
                  <span className="text-xs bg-danger-100 text-danger-800 px-2 py-1 rounded-full">
                    ⚠️ Overdue
                  </span>
                )}
              </div>

              {/* Deadline */}
              {deadlineStr && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Deadline</p>
                  <p className="text-gray-600">{deadlineStr}</p>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-700">Description</p>
                <p className="text-gray-600 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
              </div>

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Subtasks</p>
                  <ul className="mt-2 space-y-2">
                    {task.subtasks.map((subtask, index) => (
                      <li key={index} className="text-gray-600 flex items-start">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 mt-1.5"></span>
                        {subtask}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-700">{createdAt || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-700">{updatedAt || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Status */}
              {task.confirmation_status && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Confirmation Status</p>
                  <p className="text-gray-600 capitalize">{task.confirmation_status}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskItem;
