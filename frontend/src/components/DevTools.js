/**
 * Development Tool Component
 * Allows testing admin functionality in development mode
 * Remove or disable this in production
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { isAdmin, setAdminRole } from "../utils/roleUtils";
import { IconButton } from "@material-tailwind/react";
import { FaCog } from 'react-icons/fa';
import { FaExclamationTriangle } from 'react-icons/fa';

const DevTools = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setAdminEnabled(isAdmin(user));
    }
  }, [user]);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const toggleAdmin = () => {
    if (user) {
      const newValue = !adminEnabled;
      setAdminRole(user.username, newValue);
      setAdminEnabled(newValue);
    }
  };

  return (
    <>
      {/* Dev Tools Toggle Button */}
      <IconButton
        onClick={() => setShow(!show)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white hover:bg-gray-900 shadow-lg"
        title="Toggle dev tools"
        variant="filled"
        size="lg"
      >
        <FaCog className="w-6 h-6" />
      </IconButton>

      {/* Dev Tools Panel */}
      {show && (
        <div className="fixed bottom-20 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-40 w-64">
          <div className="text-white">
            <h3 className="font-bold text-lg mb-3">Development Tools</h3>
            
            <div className="space-y-3">
              {/* User Info */}
              <div className="bg-gray-800 rounded p-2 text-sm">
                <p className="text-gray-400">Current User:</p>
                <p className="font-mono text-blue-300">{user?.username}</p>
              </div>

              {/* Current Role */}
              <div className="bg-gray-800 rounded p-2 text-sm">
                <p className="text-gray-400">Current Role:</p>
                <p className="font-mono">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    adminEnabled 
                      ? "bg-purple-900 text-purple-200" 
                      : "bg-blue-900 text-blue-200"
                  }`}>
                    {adminEnabled ? "ADMIN" : "USER"}
                  </span>
                </p>
              </div>

              {/* Admin Toggle */}
              <div className="bg-gray-800 rounded p-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminEnabled}
                    onChange={toggleAdmin}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    Enable Admin Mode
                  </span>
                </label>
                {adminEnabled && (
                  <p className="text-xs text-yellow-400 mt-1"><FaExclamationTriangle className="inline mr-2" /> Admin mode active</p>
                )}
              </div>

              {/* Info */}
              <p className="text-xs text-gray-500 mt-4 border-t border-gray-700 pt-2">
                Development-only tools. Remove in production.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevTools;
