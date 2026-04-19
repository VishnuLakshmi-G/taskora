"""
Tester routes for task allocation based on description.
Allows testers to submit a description and allocate tasks to tester role users.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models_mongo import Task, User
from services.ai_service import AIService
from services.email_service import EmailService
from services.reminder_service import schedule_task_reminder, mail

tester_bp = Blueprint("tester", __name__)


def _parse_deadline(value):
    """Parse various deadline formats to a naive datetime."""
    if not value:
        return None
    try:
        from dateutil import parser as date_parser
        dt = date_parser.isoparse(str(value))
    except Exception:
        try:
            from dateutil import parser as date_parser
            dt = date_parser.parse(str(value), dayfirst=True, fuzzy=True)
        except Exception:
            return None
    if dt.tzinfo:
        dt = dt.astimezone(tz=None).replace(tzinfo=None)
    return dt


def tester_required(f):
    """Decorator to ensure user has tester role"""
    from functools import wraps
    
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
            user = User.find_by_id(user_id)
            
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Check if user has tester role in their technical roles
            user_roles = getattr(user, 'roles', []) or []
            if 'tester' not in [r.lower() for r in user_roles]:
                return jsonify({"error": "Tester role required"}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": f"Authorization failed: {str(e)}"}), 500
    
    return decorated_function


# =====================================================
# Role detection helpers
# =====================================================
def _detect_roles_from_description(description: str) -> list:
    """Detect technical roles from the description based on keywords."""
    desc_lower = description.lower()
    print(f"[ROLE_DETECT] Input description: '{description}'")
    print(f"[ROLE_DETECT] Lowercase: '{desc_lower}'")
    
    # Check for fullstack first (allocates to both frontend and backend)
    # Handle various variations: fullstack, full stack, full-stack, fullstack developer
    fullstack_keywords = ["fullstack", "full stack", "full-stack", "full stack developer", "fullstack developer"]
    for keyword in fullstack_keywords:
        print(f"[ROLE_DETECT] Checking fullstack keyword '{keyword}': {keyword in desc_lower}")
        if keyword in desc_lower:
            print(f"[ROLE_DETECT] MATCHED fullstack, returning ['frontend', 'backend']")
            return ["frontend", "backend"]
    
    # Check for individual roles (only if not fullstack)
    roles = []
    # Put hardware FIRST to ensure it's checked first
    role_keywords = {
        "hardware": ["hardware", "embedded", "iot", "firmware", "electronics", "microcontroller", "arduino", "raspberry", "esp32", "stm32", "pcb", "circuit", "board", "sensor", "electronic", "schematic"],
        "frontend": ["frontend", "front-end", "front end", "ui", "react", "vue", "angular", "reactjs", "vuejs", "html", "css", "javascript", "js", "bootstrap", "tailwind"],
        "backend": ["backend", "back-end", "back end", "api", "server", "node", "python", "django", "express", "java", "database", "sql", "mongodb"],
        "tester": ["tester", "testing", "qa", "quality", "test engineer", "quality assurance", "selenium", "cypress", "jest"]
    }
    
    print(f"[ROLE_DETECT] Checking individual role keywords in: '{desc_lower}'...")
    
    # Special debug for hardware
    if "hardware" in desc_lower or "circuit" in desc_lower or "embedded" in desc_lower:
        print(f"[ROLE_DETECT] *** FOUND hardware-related keywords in description! ***")
    
    # Use a scoring system to properly weight matches
    role_scores = {}
    for role, keywords in role_keywords.items():
        score = 0
        for keyword in keywords:
            # Check if keyword is in the description (word boundary check preferred)
            if keyword.lower() in desc_lower:
                score += 1
                print(f"[ROLE_DETECT] MATCHED '{keyword}' for role '{role}'")
        if score > 0:
            role_scores[role] = score
    
    print(f"[ROLE_DETECT] Role scores: {role_scores}")
    
    # Find the role with the highest score
    if role_scores:
        best_role = max(role_scores, key=role_scores.get)
        roles = [best_role]
        print(f"[ROLE_DETECT] Best role: {best_role} with score {role_scores[best_role]}")
    else:
        # Default to tester if no roles detected
        roles = ["tester"]
    
    # Final debug - show what we're returning
    print(f"[ROLE_DETECT] Roles found: {roles}")
    print(f"[ROLE_DETECT] Final result: {roles}")
    return roles


def _get_users_by_roles(roles: list) -> list:
    """Get all users who have any of the specified technical roles."""
    from database_mongo import MongoDBManager
    
    if not roles:
        return []
    
    # First, let's see ALL users and their roles in the system
    all_users = MongoDBManager.find_documents("users", {}, [("username", 1)])
    print(f"\n========== ALL USERS IN SYSTEM ==========")
    print(f"[ALL_USERS] Total users: {len(all_users)}")
    for u in all_users:
        print(f"[ALL_USERS] User: {u.get('username')}, roles: {u.get('roles')}")
    print(f"=========================================\n")
    
    # Normalize roles to lowercase for matching
    normalized_roles = [role.lower() for role in roles]
    
    print(f"[GET_USERS] Searching for roles: {roles}")
    print(f"[GET_USERS] Normalized roles: {normalized_roles}")
    
    # Find users with any of the specified roles using $in operator
    # This properly searches within the array field
    users_data = MongoDBManager.find_documents(
        "users",
        {"roles": {"$in": normalized_roles}},
        [("username", 1)]
    )
    
    print(f"[GET_USERS] Query for roles {normalized_roles} found: {len(users_data)} users")
    for u in users_data:
        print(f"[GET_USERS] -> User: {u.get('username')}, roles: {u.get('roles')}")
    
    return users_data


# =====================================================
# Route: Create tasks for specified roles from description
# =====================================================

@tester_bp.route("/tasks/from-description", methods=["POST"])
@tester_required
def create_tasks_from_description():
    """
    Tester submits a description with role keywords (frontend, backend, fullstack, tester, hardware).
    System parses it using AI and allocates tasks to users with matching technical roles.
    If 'fullstack' is mentioned, tasks are allocated to both frontend AND backend users.
    """
    try:
        tester_id = int(get_jwt_identity())
        data = request.get_json() or {}
        
        description = (data.get("description") or "").strip()
        if not description:
            return jsonify({"error": "Description is required"}), 400
        
        print(f"\n========== CREATE TASKS DEBUG ==========")
        print(f"[CREATE] Original Description: '{description}'")
        
        # Detect roles from description - USE ORIGINAL DESCRIPTION
        target_roles = _detect_roles_from_description(description)
        print(f"[CREATE] Target roles detected: {target_roles}")
        
        # Debug: show all users in system
        from database_mongo import MongoDBManager
        all_users = MongoDBManager.find_documents("users", {}, [("username", 1)])
        print(f"[CREATE] All users in system: {len(all_users)}")
        for u in all_users:
            print(f"  - User {u.get('id')}: {u.get('username')} has roles: {u.get('roles')}")
        
        # Get users by those roles
        target_users_data = _get_users_by_roles(target_roles)
        print(f"[CREATE] Found {len(target_users_data)} users")
        
        if not target_users_data:
            return jsonify({
                "error": f"No users found with roles: {', '.join(target_roles)}",
                "tasks_created": 0
            }), 404
        
        print(f"[CREATE] Will create tasks for {len(target_users_data)} users")
        
        # Print target user details
        for u in target_users_data:
            print(f"[CREATE] Will create task for user_id={u.get('id')}, username={u.get('username')}, roles={u.get('roles')}")
        
        # Parse the description using AI service
        parsed = AIService.parse_natural_language_task(description)
        
        title = parsed.get("title") or parsed.get("title_en") or description[:60] or "Task"
        category = parsed.get("category") or "general"
        priority = (parsed.get("priority") or "medium").lower()
        deadline = _parse_deadline(parsed.get("deadline") or description)
        
        # Get subtasks if any
        subtasks = parsed.get("subtasks") or []
        
        created_tasks = []
        
        for user_doc in target_users_data:
            target_user = User(**user_doc)
            
            # Create task for this user
            task = Task(
                title=title,
                description=description,
                deadline=deadline,
                priority=priority,
                category=category,
                status="pending",
                user_id=target_user.id,
                ai_generated=bool(parsed.get("ai_generated")),
                assigned_by=tester_id,
                confirmation_status="pending"
            )
            
            if subtasks:
                task.set_subtasks(subtasks)
            
            task.save()
            created_tasks.append(task.to_dict())
            
            # Send email notification to user
            try:
                if target_user.email:
                    EmailService.send_task_created_notification(mail, target_user.email, task.to_dict())
            except Exception as email_err:
                print(f"[Email] Failed for user {target_user.id}: {email_err}")
            
            # Schedule reminder
            try:
                task_dict = task.to_dict()
                if target_user.email:
                    task_dict["user_email"] = target_user.email
                schedule_task_reminder(current_app, task_dict)
            except Exception as sched_err:
                print(f"[Scheduler] Failed for task {task.id}: {sched_err}")
        
        # Format the roles for display
        roles_display = " + ".join(target_roles) if len(target_roles) > 1 else target_roles[0]
        
        return jsonify({
            "message": f"Successfully created {len(created_tasks)} tasks for {roles_display} role(s)",
            "tasks": created_tasks,
            "tasks_created": len(created_tasks),
            "target_roles": target_roles,
            "parsed": {
                "title": title,
                "category": category,
                "priority": priority,
                "deadline": deadline.isoformat() if deadline else None,
                "subtasks": subtasks
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to create tasks: {str(e)}"}), 500


# =====================================================
# Route: Get all tester users (for admin reference)
# =====================================================

@tester_bp.route("/testers", methods=["GET"])
@jwt_required()
def get_tester_users():
    """Get list of all users with tester role."""
    try:
        from database_mongo import MongoDBManager
        tester_users = MongoDBManager.find_documents(
            "users", 
            {"roles": {"$in": ["tester", "Tester"]}},
            [("username", 1)]
        )
        
        testers = []
        for user_doc in tester_users:
            user = User(**user_doc)
            testers.append({
                "id": user.id,
                "username": user.username,
                "email": user.email
            })
        
        return jsonify({
            "testers": testers,
            "count": len(testers)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get testers: {str(e)}"}), 500


# =====================================================
# Route: Preview parsed task from description (without creating)
# =====================================================

@tester_bp.route("/tasks/preview", methods=["POST"])
@tester_required
def preview_task_from_description():
    """
    Preview how a description will be parsed and which roles it will target.
    """
    try:
        data = request.get_json() or {}
        
        description = (data.get("description") or "").strip()
        if not description:
            return jsonify({"error": "Description is required"}), 400
        
        # Detect roles from description
        target_roles = _detect_roles_from_description(description)
        
        # Get users by those roles
        target_users_data = _get_users_by_roles(target_roles)
        
        # Parse the description using AI service
        parsed = AIService.parse_natural_language_task(description)
        
        # Format the roles for display
        roles_display = " + ".join(target_roles) if len(target_roles) > 1 else target_roles[0]
        
        return jsonify({
            "preview": parsed,
            "target_roles": target_roles,
            "roles_display": roles_display,
            "user_count": len(target_users_data),
            "message": f"This will create tasks for {len(target_users_data)} user(s) with role(s): {roles_display}"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to preview task: {str(e)}"}), 500