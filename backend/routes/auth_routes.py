"""
Authentication routes for user signup and login.
Fully supports MongoDB User model.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import re
import traceback

# ✅ MongoDB User Model
from models_mongo import User

auth_bp = Blueprint('auth', __name__)

# Validators
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+\d{10,15}$")


def normalize_whatsapp_number(number: str) -> str:
    """Normalize number => +<digits> format"""
    number = (number or "").strip().replace(" ", "").replace("-", "")
    digits = "".join(ch for ch in number if ch.isdigit())
    return f"+{digits}" if digits else ""


# ==============================================
# SIGNUP ROUTE
# ==============================================
@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        # Parse JSON
        data = request.get_json() or {}
        
        print("\n" + "="*60)
        print("[SIGNUP] ========== STARTING SIGNUP ==========")
        print("[SIGNUP] Full payload:", data)
        print("[SIGNUP] Payload keys:", list(data.keys()))
        print("[SIGNUP] Role field exists?", 'role' in data)
        print("[SIGNUP] Role value:", repr(data.get('role')))
        print("="*60 + "\n")

        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        whatsapp_number = normalize_whatsapp_number(data.get('whatsapp_number') or "")
        
        # Extract and validate role (admin/user)
        raw_role = data.get('role')
        print(f"[ROLE] Raw role from request: {repr(raw_role)} (type: {type(raw_role).__name__})")
        
        user_role = (raw_role or 'user').strip().lower() if raw_role else 'user'
        print(f"[ROLE] After processing: {repr(user_role)}")
        
        if user_role not in ['admin', 'user']:
            print(f"[ROLE] Invalid role '{user_role}', defaulting to 'user'")
            user_role = 'user'
        
        print(f"[ROLE] Final role to use: {repr(user_role)}")
        
        # Extract and validate technical roles
        raw_roles = data.get('roles', [])
        print(f"[TECHNICAL_ROLES] Raw roles from request: {repr(raw_roles)} (type: {type(raw_roles).__name__})")
        
        if not isinstance(raw_roles, list):
            print(f"[TECHNICAL_ROLES] Roles is not a list, defaulting to empty list")
            technical_roles = []
        else:
            # Validate each role is one of the allowed technical roles
            allowed_roles = ['frontend', 'backend', 'tester', 'hardware']
            technical_roles = [r.strip().lower() for r in raw_roles if r and r.strip().lower() in allowed_roles]
            print(f"[TECHNICAL_ROLES] After validation: {repr(technical_roles)}")
        
        print("="*60 + "\n")

        # Validate required fields
        if not username or not email or not password or not whatsapp_number:
            return jsonify({"error": "All fields are required"}), 400

        if len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters"}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        if not EMAIL_RE.match(email):
            return jsonify({"error": "Invalid email format"}), 400

        if not PHONE_RE.match(whatsapp_number):
            return jsonify({"error": "Invalid WhatsApp number format"}), 400

        # Check for duplicates
        if User.find_by_username(username):
            return jsonify({"error": "Username already exists"}), 409

        if User.find_by_email(email):
            return jsonify({"error": "Email already registered"}), 409

        if User.find_by_whatsapp(whatsapp_number):
            return jsonify({"error": "WhatsApp number already registered"}), 409

        # ✅ CREATE USER WITH ROLE AND TECHNICAL ROLES
        print(f"[CREATE_USER] Creating user with role: {repr(user_role)} and technical roles: {repr(technical_roles)}")
        user = User(
            username=username,
            email=email,
            password=password,
            whatsapp_number=whatsapp_number,
            role=user_role,  # admin/user role
            roles=technical_roles  # technical roles array
        )
        print(f"[CREATE_USER] User object created. user.role = {repr(user.role)}, user.roles = {repr(user.roles)}")
        
        user.save()
        print(f"[CREATE_USER] User saved to database. user.role = {repr(user.role)}")
        print("[CREATE_USER] User.to_dict():", user.to_dict())

        # Create JWT token
        token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )

        user_dict = user.to_dict()
        print(f"[DEBUG] Returning user object: {user_dict}")

        return jsonify({
            "message": "Signup successful",
            "access_token": token,
            "user": user_dict
        }), 201

    except Exception as e:
        print("[ERROR] Signup failed:", str(e))
        print(traceback.format_exc())
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


# ==============================================
# LOGIN ROUTE
# ==============================================
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        
        print("[DEBUG] Login payload received:", data)

        username_or_email = (data.get('username') or '').strip()
        password = data.get('password') or ''

        if not username_or_email or not password:
            return jsonify({"error": "Missing username or password"}), 400

        user = None
        if "@" in username_or_email:
            # Email login should be case-insensitive
            user = User.find_by_email(username_or_email.lower())
        else:
            # Username login should be case-insensitive
            from database_mongo import MongoDBManager
            query = {
                "username": {
                    "$regex": f"^{re.escape(username_or_email)}$",
                    "$options": "i"
                }
            }
            user_data = MongoDBManager.find_document("users", query)
            user = User(**user_data) if user_data else None
            if not user:
                # fallback to email if user entered email-like text without @
                user = User.find_by_email(username_or_email.lower())

        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        print(f"[DEBUG] User logged in with role: {user.role}")

        token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )

        return jsonify({
            "message": "Login successful",
            "access_token": token,
            "user": user.to_dict()
        }), 200

    except Exception as e:
        print("[ERROR] Login failed:", str(e))
        print(traceback.format_exc())
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


# ==============================================
# PROFILE ROUTE
# ==============================================
@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json() or {}

        # Update allowed fields
        if 'username' in data:
            username = (data['username'] or '').strip()
            if len(username) < 3:
                return jsonify({"error": "Username must be at least 3 characters"}), 400
            if User.find_by_username(username) and User.find_by_username(username).id != user.id:
                return jsonify({"error": "Username already exists"}), 409
            user.username = username

        if 'email' in data:
            email = (data['email'] or '').strip().lower()
            if not EMAIL_RE.match(email):
                return jsonify({"error": "Invalid email format"}), 400
            if User.find_by_email(email) and User.find_by_email(email).id != user.id:
                return jsonify({"error": "Email already registered"}), 409
            user.email = email

        if 'whatsapp_number' in data:
            whatsapp_number = normalize_whatsapp_number(data['whatsapp_number'] or "")
            if not PHONE_RE.match(whatsapp_number):
                return jsonify({"error": "Invalid WhatsApp number format"}), 400
            if User.find_by_whatsapp(whatsapp_number) and User.find_by_whatsapp(whatsapp_number).id != user.id:
                return jsonify({"error": "WhatsApp number already registered"}), 409
            user.whatsapp_number = whatsapp_number

        if 'bio' in data:
            user.bio = (data['bio'] or '').strip()

        if 'roles' in data:
            roles = data['roles']
            if isinstance(roles, list):
                user.roles = [r.strip().lower() for r in roles if r.strip()]
            else:
                user.roles = []

        user.save()

        return jsonify({"message": "Profile updated successfully", "user": user.to_dict()}), 200

    except Exception as e:
        print("[ERROR] Profile update failed:", str(e))
        print(traceback.format_exc())
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500


# ==============================================
# VERIFY TOKEN ROUTE
# ==============================================
@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)

        if not user:
            return jsonify({"valid": False}), 401

        return jsonify({
            "valid": True,
            "user": user.to_dict()
        }), 200

    except Exception:
        print("[ERROR] Token verification failed:", traceback.format_exc())
        return jsonify({"valid": False}), 401


@auth_bp.route('/admin-exists', methods=['GET'])
def admin_exists():
    """Return whether any admin user exists. Public endpoint used by signup UI."""
    try:
        # Check for any user with role 'admin'
        from models_mongo import User
        # Using find_by_username is not suitable; use MongoDBManager directly for efficiency
        from database_mongo import MongoDBManager
        count = MongoDBManager.count_documents('users', {'role': 'admin'})
        return jsonify({'exists': bool(count)}), 200
    except Exception as e:
        print('[ERROR] admin_exists failed:', str(e))
        print(traceback.format_exc())
        return jsonify({'error': 'Could not determine admin existence'}), 500