"""
Message management routes - Real-time chat between users and admin
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models_mongo import Message, User
from datetime import datetime
import traceback

message_bp = Blueprint("messages", __name__)


# ----- Helper Functions -----
def _user_exists(user_id):
    """Check if user exists."""
    return User.find_by_id(user_id) is not None


def _current_user_id_int():
    """Return the current JWT identity coerced to int when possible."""
    try:
        return int(get_jwt_identity())
    except Exception:
        return get_jwt_identity()


# ----- Message Routes -----

@message_bp.route("/messages/send", methods=["POST"])
@jwt_required()
def send_message():
    """
    Send a message from one user to another.
    Expected JSON: {
        "recipient_id": <int>,
        "text": "<message text>"
    }
    """
    try:
        sender_id = _current_user_id_int()
        data = request.get_json()
        
        recipient_id = data.get("recipient_id")
        text = data.get("text", "").strip()

        # Validation
        if not recipient_id or not text:
            return jsonify({"error": "recipient_id and text are required"}), 400

        recipient_id = int(recipient_id)
        
        if not _user_exists(recipient_id):
            return jsonify({"error": "Recipient not found"}), 404

        # Create and save message
        message = Message(sender_id=sender_id, recipient_id=recipient_id, text=text)
        message.save()

        return jsonify({
            "success": True,
            "message": message.to_dict()
        }), 201

    except Exception as e:
        tb = traceback.format_exc()
        print("[ERROR] send_message failed:", str(e))
        print(tb)
        return jsonify({"error": str(e), "trace": tb}), 500


@message_bp.route("/messages/conversation/<int:user_id>", methods=["GET"])
@jwt_required()
def get_conversation(user_id):
    """
    Get conversation history between current user and another user.
    Query params: limit (default 50), skip (default 0)
    """
    try:
        current_user_id = _current_user_id_int()
        
        if not _user_exists(user_id):
            return jsonify({"error": "User not found"}), 404

        limit = request.args.get("limit", default=50, type=int)
        skip = request.args.get("skip", default=0, type=int)

        # Limit can't be more than 100
        limit = min(limit, 100)

        messages = Message.get_conversation(current_user_id, user_id, limit=limit, skip=skip)
        
        # Mark messages from other user as read
        Message.mark_as_read(user_id, current_user_id)

        return jsonify({
            "success": True,
            "messages": [msg.to_dict() for msg in reversed(messages)]  # Reverse to show oldest first
        }), 200

    except Exception as e:
        print("[ERROR] get_conversation failed:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@message_bp.route("/messages/unread", methods=["GET"])
@jwt_required()
def get_unread_count():
    """
    Get count of unread messages for current user.
    """
    try:
        user_id = _current_user_id_int()
        count = Message.get_unread_count(user_id)
        
        return jsonify({
            "success": True,
            "unread_count": count
        }), 200

    except Exception as e:
        print("[ERROR] get_unread_count failed:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@message_bp.route("/messages/contacts", methods=["GET"])
@jwt_required()
def get_message_contacts():
    """
    Get list of all users the current user has messaged (or can message).
    Returns users with their last message info.
    """
    try:
        from database_mongo import MongoDBManager
        
        current_user_id = _current_user_id_int()
        current_user = User.find_by_id(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404

        contacts = []

        # Build contacts list with last message and per-contact unread count
        if current_user.role == "admin":
            users = MongoDBManager.find_documents("users", {"role": "user"})
        else:
            users = MongoDBManager.find_documents("users", {"role": "admin"})

        for user_data in users:
            user_obj = User(**user_data)

            # Find last message between current user and this contact
            last_msg_data = MongoDBManager.find_document(
                "messages",
                {
                    "$or": [
                        {"sender_id": current_user_id, "recipient_id": user_obj.id},
                        {"sender_id": user_obj.id, "recipient_id": current_user_id}
                    ]
                },
                sort=[("created_at", -1)]
            )

            # Unread messages from this contact to current user
            unread = MongoDBManager.count_documents(
                "messages",
                {"sender_id": user_obj.id, "recipient_id": current_user_id, "read": False}
            )

            last_msg_obj = Message(**last_msg_data) if last_msg_data else None

            contacts.append({
                "user_id": user_obj.id,
                "username": user_obj.username,
                "email": user_obj.email,
                "last_message": last_msg_obj.to_dict() if last_msg_obj else None,
                "last_message_obj": last_msg_obj,
                "unread_count": unread
            })

        # Sort contacts by last_message timestamp (most recent first), fall back to username
        from datetime import datetime as _dt
        def _contact_sort_key(c):
            if c.get("last_message_obj") and getattr(c["last_message_obj"], "created_at", None):
                return c["last_message_obj"].created_at
            return _dt.min

        contacts.sort(key=_contact_sort_key, reverse=True)

        # Remove helper objects before returning
        for c in contacts:
            c.pop("last_message_obj", None)

        return jsonify({
            "success": True,
            "contacts": contacts
        }), 200

    except Exception as e:
        print("[ERROR] get_message_contacts failed:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@message_bp.route("/messages/<int:message_id>", methods=["DELETE"])
@jwt_required()
def delete_message(message_id):
    """
    Delete a message (only by sender).
    """
    try:
        from database_mongo import MongoDBManager
        
        current_user_id = _current_user_id_int()
        message = Message.find_by_id(message_id)

        if not message:
            return jsonify({"error": "Message not found"}), 404

        if message.sender_id != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403

        MongoDBManager.delete_document("messages", {"id": message_id})

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
