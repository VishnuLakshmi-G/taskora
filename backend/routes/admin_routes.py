"""
Admin routes for task management, user management, and analytics.
Only accessible by users with 'admin' role.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models_mongo import Task, User
from services.email_service import EmailService
from services.reminder_service import schedule_task_reminder, mail
from services.ai_service import AIService

admin_bp = Blueprint("admin", __name__)


# =====================================================
# Middleware to check admin role
# =====================================================
def admin_required(f):
    """Decorator to ensure user is admin"""
    from functools import wraps
    
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
            user = User.find_by_id(user_id)
            
            if not user or user.role != "admin":
                return jsonify({"error": "Admin access required"}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": f"Authorization failed: {str(e)}"}), 500
    
    return decorated_function


# =====================================================
# User Management Routes
# =====================================================

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_all_users():
    """Get all users in the system"""
    try:
        from database_mongo import MongoDBManager
        users_data = MongoDBManager.find_documents("users", {}, [("created_at", -1)])
        users = [User(**doc).to_dict() for doc in users_data]
        return jsonify({"users": users, "total": len(users)}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get users: {str(e)}"}), 500


@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@admin_required
def update_user_role(user_id: int):
    """Update user role (admin/user)"""
    try:
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json() or {}
        new_role = (data.get("role") or "user").lower()
        
        if new_role not in ["admin", "user"]:
            return jsonify({"error": "Invalid role. Must be 'admin' or 'user'"}), 400
        
        user.role = new_role
        user.save()
        
        return jsonify({"message": "Role updated successfully", "user": user.to_dict()}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update role: {str(e)}"}), 500


# =====================================================
# Task Management Routes (Admin)
# =====================================================

@admin_bp.route("/tasks", methods=["GET"])
@admin_required
def get_all_tasks():
    """Get all tasks across all users with filters"""
    try:
        filters = {}
        
        # Extract filters from query params
        if request.args.get("status"):
            filters["status"] = request.args.get("status")
        if request.args.get("confirmation_status"):
            filters["confirmation_status"] = request.args.get("confirmation_status")
        if request.args.get("user_id"):
            filters["user_id"] = int(request.args.get("user_id"))
        if request.args.get("priority"):
            filters["priority"] = request.args.get("priority")
        
        print(f"[ADMIN_TASKS] Query args: {dict(request.args)}")
        print(f"[ADMIN_TASKS] Filters to apply: {filters}")
        
        from database_mongo import MongoDBManager
        tasks_data = MongoDBManager.find_documents(
            "tasks", 
            filters, 
            [("confirmation_status", 1), ("deadline", 1), ("created_at", -1)]
        )
        print(f"[ADMIN_TASKS] Found {len(tasks_data)} tasks with filters {filters}")
        
        tasks = [Task(**doc).to_dict() for doc in tasks_data]
        
        # Add username for each task
        for task in tasks:
            user = User.find_by_id(task["user_id"])
            if user:
                task["username"] = user.username
                task["user_email"] = user.email
        
        return jsonify({"tasks": tasks, "total": len(tasks)}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get tasks: {str(e)}"}), 500


@admin_bp.route("/tasks/create-for-user/<int:user_id>", methods=["POST"])
@admin_required
def create_task_for_user(user_id: int):
    """Admin creates task for specific user"""
    try:
        admin_id = int(get_jwt_identity())
        
        # Verify target user exists
        target_user = User.find_by_id(user_id)
        if not target_user:
            return jsonify({"error": "Target user not found"}), 404
        
        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        # Parse deadline
        from dateutil import parser as date_parser
        deadline = None
        if data.get("deadline"):
            try:
                deadline = date_parser.isoparse(str(data["deadline"]))
                if deadline.tzinfo:
                    deadline = deadline.astimezone(tz=None).replace(tzinfo=None)
            except Exception:
                pass
        
        task = Task(
            title=title,
            description=(data.get("description") or "").strip(),
            deadline=deadline,
            priority=(data.get("priority") or "medium").lower(),
            category=(data.get("category") or "general").lower(),
            status="pending",
            user_id=user_id,
            ai_generated=bool(data.get("ai_generated", False)),
            assigned_by=admin_id,
            confirmation_status="pending"
        )
        
        if data.get("subtasks"):
            task.set_subtasks(data["subtasks"])
        
        task.save()
        
        # Send email notification to user
        try:
            if target_user.email:
                msg = f"New task assigned to you: {task.title}"
                EmailService.send_task_created_notification(mail, target_user.email, task.to_dict())
        except Exception as email_err:
            print(f"[Email] Failed: {email_err}")
        
        # Schedule reminder
        try:
            task_dict = task.to_dict()
            if target_user.email:
                task_dict["user_email"] = target_user.email
            schedule_task_reminder(current_app, task_dict)
        except Exception as sched_err:
            print(f"[Scheduler] Failed: {sched_err}")
        
        return jsonify({
            "message": "Task created successfully",
            "task": task.to_dict()
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create task: {str(e)}"}), 500


# =====================================================
# Task Confirmation Routes
# =====================================================

@admin_bp.route("/tasks/<int:task_id>/confirm", methods=["PUT"])
@admin_required
def confirm_task_status(task_id: int):
    """Admin confirms (approves/rejects) user task status update"""
    try:
        admin_id = int(get_jwt_identity())
        task = Task.find_by_id(task_id)
        
        if not task:
            return jsonify({"error": "Task not found"}), 404
        
        data = request.get_json() or {}
        confirmation_status = (data.get("confirmation_status") or "pending").lower()
        feedback = (data.get("feedback") or "").strip()
        
        if confirmation_status not in ["approved", "rejected", "pending"]:
            return jsonify({"error": "Invalid confirmation status"}), 400
        
        # Update task confirmation
        task.confirmation_status = confirmation_status
        task.confirmation_feedback = feedback
        task.confirmed_at = datetime.utcnow()
        
        # If rejected, reset task status to pending so user can work on it again
        if confirmation_status == "rejected":
            task.status = "pending"
        
        # If approved, optionally update task status
        if confirmation_status == "approved" and data.get("status"):
            task.status = (data.get("status") or task.status).lower()
        
        task.save()
        
        # Notify user
        user = User.find_by_id(task.user_id)
        if user and user.email:
            status_msg = "✅ APPROVED" if confirmation_status == "approved" else "❌ REJECTED"
            email_body = f"Your task '{task.title}' has been {status_msg}\n\nFeedback: {feedback}"
            try:
                EmailService.send_task_created_notification(mail, user.email, {
                    "title": f"Task Confirmation - {status_msg}",
                    "description": email_body
                })
            except Exception as e:
                print(f"[Email notification] Failed: {e}")
        
        return jsonify({
            "message": f"Task confirmation updated to {confirmation_status}",
            "task": task.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to confirm task: {str(e)}"}), 500


# =====================================================
# Analytics Routes
# =====================================================

@admin_bp.route("/analytics/overview", methods=["GET"])
@admin_required
def get_analytics_overview():
    """Get overall system analytics"""
    try:
        from database_mongo import MongoDBManager
        
        # Total counts
        total_tasks = len(MongoDBManager.find_documents("tasks", {}, []))
        total_users = len(MongoDBManager.find_documents("users", {}, []))
        
        # Tasks by status
        tasks_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        tasks_by_status = {}
        for row in MongoDBManager.aggregate("tasks", tasks_pipeline):
            tasks_by_status[row["_id"]] = row["count"]
        
        # Tasks by confirmation status
        confirm_pipeline = [
            {"$group": {"_id": "$confirmation_status", "count": {"$sum": 1}}}
        ]
        tasks_by_confirmation = {}
        for row in MongoDBManager.aggregate("tasks", confirm_pipeline):
            tasks_by_confirmation[row["_id"]] = row["count"]
        
        # Tasks by priority
        priority_pipeline = [
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
        ]
        tasks_by_priority = {}
        for row in MongoDBManager.aggregate("tasks", priority_pipeline):
            tasks_by_priority[row["_id"]] = row["count"]
        
        # Completion rate
        completed = tasks_by_status.get("completed", 0)
        completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0
        
        # Users by role
        users_pipeline = [
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ]
        users_by_role = {}
        for row in MongoDBManager.aggregate("users", users_pipeline):
            users_by_role[row["_id"]] = row["count"]
        
        return jsonify({
            "total_tasks": total_tasks,
            "total_users": total_users,
            "tasks_by_status": tasks_by_status,
            "tasks_by_confirmation": tasks_by_confirmation,
            "tasks_by_priority": tasks_by_priority,
            "completion_rate": round(completion_rate, 1),
            "users_by_role": users_by_role,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get analytics: {str(e)}"}), 500


@admin_bp.route("/analytics/user/<int:user_id>", methods=["GET"])
@admin_required
def get_user_analytics(user_id: int):
    """Get analytics for a specific user"""
    try:
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        from database_mongo import MongoDBManager
        
        # Get user's tasks
        user_tasks = MongoDBManager.find_documents("tasks", {"user_id": user_id}, [])
        total_tasks = len(user_tasks)
        
        # Tasks by status
        tasks_by_status = {}
        for task_data in user_tasks:
            status = task_data.get("status", "pending")
            tasks_by_status[status] = tasks_by_status.get(status, 0) + 1
        
        # Tasks by confirmation status
        tasks_by_confirmation = {}
        for task_data in user_tasks:
            conf_status = task_data.get("confirmation_status", "pending")
            tasks_by_confirmation[conf_status] = tasks_by_confirmation.get(conf_status, 0) + 1
        
        # Completion rate
        completed = tasks_by_status.get("completed", 0)
        completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0
        
        # Average time to completion
        completed_tasks = [Task(**t) for t in user_tasks if t.get("status") == "completed"]
        avg_completion_time = 0
        if completed_tasks:
            completion_times = []
            for task in completed_tasks:
                if task.created_at and task.updated_at:
                    days = (task.updated_at - task.created_at).days
                    completion_times.append(days)
            avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        return jsonify({
            "user": user.to_dict(),
            "total_tasks": total_tasks,
            "tasks_by_status": tasks_by_status,
            "tasks_by_confirmation": tasks_by_confirmation,
            "completion_rate": round(completion_rate, 1),
            "avg_completion_days": round(avg_completion_time, 1),
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get user analytics: {str(e)}"}), 500


@admin_bp.route("/analytics/pending-confirmations", methods=["GET"])
@admin_required
def get_pending_confirmations():
    """Get all tasks pending confirmation"""
    try:
        from database_mongo import MongoDBManager
        
        tasks_data = MongoDBManager.find_documents(
            "tasks",
            {"confirmation_status": "pending", "status": "completed"},
            [("deadline", 1), ("created_at", -1)]
        )
        tasks = [Task(**doc).to_dict() for doc in tasks_data]
        
        # Add username for each task
        for task in tasks:
            user = User.find_by_id(task["user_id"])
            if user:
                task["username"] = user.username
        
        return jsonify({"tasks": tasks, "total": len(tasks)}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get pending confirmations: {str(e)}"}), 500


# =====================================================
# Helper functions for keyword-based allocation
# =====================================================

def _detect_role_from_text(title: str, description: str) -> str:
    """Detect the best role based on keywords in title and description."""
    text = (title + " " + description).lower()
    
    # Define keyword mappings for roles
    role_keywords = {
        "hardware": ["hardware", "circuit", "board", "sensor", "iot", "embedded", "arduino", "raspberry", "firmware", "microcontroller", "pcb", "esp32", "stm32", "schematic", "electronics", "electronic"],
        "frontend": ["html", "css", "javascript", "react", "vue", "angular", "ui", "design", "component", "interface", "layout", "responsive", "bootstrap", "tailwind", "frontend", "front-end", "front end"],
        "backend": ["python", "java", "node", "api", "database", "server", "sql", "mongodb", "endpoint", "authentication", "authorization", "middleware", "backend", "back-end", "back end"],
        "tester": ["test", "qa", "quality", "bug", "automation", "selenium", "cypress", "jest", "unit", "integration", "regression", "manual", "testing", "tester"],
    }
    
    # Score each role
    scores = {}
    for role, keywords in role_keywords.items():
        scores[role] = sum(1 for kw in keywords if kw in text)
    
    # Check for fullstack first
    if "fullstack" in text or "full stack" in text or "full-stack" in text:
        return "fullstack"
    
    # Return best matching role, or default to backend
    if scores:
        best_role = max(scores, key=scores.get)
        if scores[best_role] > 0:
            return best_role
    
    return "backend"


def _get_users_by_role(role: str) -> list:
    """Get all users who have the specified technical role."""
    from database_mongo import MongoDBManager
    
    # Handle fullstack specially - need users with BOTH frontend AND backend
    if role == "fullstack":
        users = MongoDBManager.find_documents(
            "users",
            {"roles": {"$in": ["frontend", "backend"]}},
            [("username", 1)]
        )
        # Filter to only include users with both roles
        return [u for u in users if u.get("roles") and "frontend" in u.get("roles") and "backend" in u.get("roles")]
    
    # Single role search
    users = MongoDBManager.find_documents(
        "users",
        {"roles": {"$in": [role]}},
        [("username", 1)]
    )
    return users


# =====================================================
# Route: Create task with automatic role-based allocation
# =====================================================

@admin_bp.route("/tasks/create-with-keywords", methods=["POST"])
@admin_required
def create_task_with_keywords():
    """
    Admin creates task with automatic user allocation based on keywords in title/description.
    Detects role keywords (hardware, frontend, backend, tester) and assigns to appropriate user.
    """
    try:
        admin_id = int(get_jwt_identity())
        data = request.get_json() or {}
        
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        # Detect role from keywords
        detected_role = _detect_role_from_text(title, description)
        print(f"[ADMIN_CREATE] Detected role: {detected_role} from title='{title}' desc='{description[:50]}...'")
        
        # Get users with this role
        target_users = _get_users_by_role(detected_role)
        
        if not target_users:
            return jsonify({
                "error": f"No users found with role: {detected_role}",
                "detected_role": detected_role
            }), 404
        
        # Parse deadline
        deadline = None
        if data.get("deadline"):
            try:
                from dateutil import parser as date_parser
                deadline = date_parser.isoparse(str(data["deadline"]))
                if deadline.tzinfo:
                    deadline = deadline.astimezone(tz=None).replace(tzinfo=None)
            except Exception:
                pass
        
        # Create task for the first matching user (can be extended for multiple users)
        target_user = User(**target_users[0])
        
        task = Task(
            title=title,
            description=description,
            deadline=deadline,
            priority=(data.get("priority") or "medium").lower(),
            category=(data.get("category") or "general").lower(),
            status="pending",
            user_id=target_user.id,
            ai_generated=bool(data.get("ai_generated", False)),
            assigned_by=admin_id,
            confirmation_status="pending"
        )
        
        if data.get("subtasks"):
            task.set_subtasks(data["subtasks"])
        
        task.save()
        
        # Send email notification to user
        try:
            if target_user.email:
                EmailService.send_task_created_notification(mail, target_user.email, task.to_dict())
        except Exception as email_err:
            print(f"[Email] Failed: {email_err}")
        
        # Schedule reminder
        try:
            task_dict = task.to_dict()
            if target_user.email:
                task_dict["user_email"] = target_user.email
            schedule_task_reminder(current_app, task_dict)
        except Exception as sched_err:
            print(f"[Scheduler] Failed: {sched_err}")
        
        return jsonify({
            "message": f"Task created and assigned to {target_user.username} ({detected_role} role)",
            "task": task.to_dict(),
            "assigned_to": {
                "id": target_user.id,
                "username": target_user.username,
                "role": detected_role
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to create task: {str(e)}"}), 500
