import React, { useState, useEffect, useRef } from "react";
import { messageAPI, handleApiError } from "../utils/api";

const MessagesModal = ({ isOpen, onClose, recipientId, recipientName, currentUserId, currentUserRole }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch messages when modal opens
  useEffect(() => {
    if (isOpen && recipientId) {
      fetchMessages();
      // Poll for new messages every 2 seconds
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, recipientId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setError(null);
      const data = await messageAPI.getConversation(recipientId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError(handleApiError(err));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await messageAPI.sendMessage(recipientId, messageInput.trim());
      
      // Add new message to the list
      setMessages([...messages, data.message]);
      setMessageInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(handleApiError(err));
      // Show notification alert
      alert("Failed to send message: " + handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getMessageSender = (msg) => {
    return msg.sender_id === currentUserId ? "You" : recipientName;
  };

  const getMessageAlignment = (msg) => {
    return msg.sender_id === currentUserId ? "justify-end" : "justify-start";
  };

  const getMessageBubbleStyle = (msg) => {
    return msg.sender_id === currentUserId
      ? "bg-blue-500 text-white rounded-lg rounded-tr-none"
      : "bg-gray-200 text-gray-900 rounded-lg rounded-tl-none";
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative w-full max-w-2xl mx-auto mt-20 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-t-lg">
          <div>
            <h3 className="text-lg font-semibold">Chat with {recipientName}</h3>
            <p className="text-sm opacity-90">{currentUserRole === "admin" ? "User" : "Admin"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-full p-1 transition"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Container */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${getMessageAlignment(msg)}`}>
                <div className="max-w-xs">
                  <div className="text-xs text-gray-600 mb-1 px-2">
                    {getMessageSender(msg)} • {formatTime(msg.created_at)}
                  </div>
                  <div className={`${getMessageBubbleStyle(msg)} px-4 py-2 break-words`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !messageInput.trim()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessagesModal;
