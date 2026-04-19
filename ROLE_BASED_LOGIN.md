# Role-Based Login System

## Overview

The application now implements role-based login that automatically redirects users to appropriate dashboards based on their role (Admin or User).

## How It Works

### Login Flow

1. **User enters credentials** → Username & Password
2. **Backend validates and returns**:
   ```json
   {
     "access_token": "token_string",
     "user": {
       "id": 1,
       "username": "admin_user",
       "email": "admin@example.com",
       "role": "admin",  // ← Key field for role detection
       "whatsapp_number": "+919876543210"
     }
   }
   ```
3. **Frontend detects role** and redirects:
   - If `role === "admin"` → `/admin` (Admin Dashboard)
   - If `role === "user"` or no role → `/dashboard` (User Dashboard)

### Authentication Context

The `AuthContext` now:
- Stores user role in localStorage
- Returns `redirectUrl` from login/signup methods
- Handles role persistence across page refreshes

### Storage

Role is saved in localStorage under key: `user_role`
```javascript
// Example
localStorage.user_role = "admin"
```

## Files Updated

### 1. **AuthContext.js** - Role handling
```javascript
// Returns redirect URL based on role
const login = async (credentials) => {
  // ...
  const redirectUrl = isAdmin(res.user) ? "/admin" : "/dashboard";
  return { success: true, redirectUrl };
};
```

### 2. **Login.js** - Uses redirectUrl
```javascript
if (result?.success) {
  const redirectUrl = result.redirectUrl || "/dashboard";
  navigate(redirectUrl, { replace: true });
}
```

### 3. **Signup.js** - New users to dashboard
```javascript
// New users always get user role, redirect to /dashboard
return { success: true, redirectUrl: "/dashboard" };
```

### 4. **api.js** - Role storage
```javascript
export const setRole = (role) => localStorage.setItem("user_role", role);
export const getRole = () => localStorage.getItem("user_role") || "user";
```

### 5. **App.js** - Smart routing
```javascript
// PublicRoute redirects authenticated users appropriately
const PublicRoute = ({ children }) => {
  if (isAuthenticated) {
    const redirectURL = isAdmin(user) ? "/admin" : "/dashboard";
    return <Navigate to={redirectURL} replace />;
  }
  return children;
};
```

---

## Routing Structure

```
Public Routes (Anyone, but redirects if authenticated):
  /login          → Login page
  /signup         → Signup page

Protected Routes (Requires authentication):
  /dashboard      → User dashboard (all users)
  /profile        → User profile panel (all users)
  /tasks/new      → Create task (all users)
  /tasks/edit/:id → Edit task (all users)
  /admin          → Admin dashboard (admin-only, redirects to /profile if not admin)
```

---

## Role Detection Priority

1. **Backend role field** (Highest priority)
   - If API returns `role` field, that's used

2. **Admin list** (Environment variable)
   - Set `REACT_APP_ADMIN_USERS=1,2,5` to mark users as admin
   - Comma-separated user IDs

3. **Development mode** (Testing only)
   - Dev Tools panel allows toggling admin mode
   - Only works in development (`NODE_ENV=development`)

---

## Login Scenarios

### Scenario 1: Regular User Login
```
Username: john
Password: ••••••••

Backend returns:
{
  "role": "user",
  ...
}

Redirect: /dashboard ✓
```

### Scenario 2: Admin Login
```
Username: admin
Password: ••••••••

Backend returns:
{
  "role": "admin",
  ...
}

Redirect: /admin ✓
```

### Scenario 3: Admin Tries to Access /dashboard
```
Redirect: /dashboard (allowed)
• Admins can still view /dashboard
• Admin button visible in header
• Click "Admin" button to go to /admin
```

### Scenario 4: User Tries to Access /admin
```
Redirect: /profile (blocked)
• New users cannot view /admin
• Automatically redirected to /profile (user panel)
```

---

## Development Testing

### Enable Admin Mode
1. Look for **⚙️ settings icon** (bottom-right corner)
2. Click to open Dev Tools panel
3. Check **"Enable Admin Mode"**
4. Page will immediately reflect role change
5. Admin button appears in dashboard
6. Navigate to /admin to test admin panel

### Disable Admin Mode
1. Open Dev Tools again
2. Uncheck **"Enable Admin Mode"**
3. Role reverts to user

---

## Backend Integration

To use real role-based login:

### 1. Update MongoDB User Schema
```python
# models_mongo.py
class User:
    def __init__(self, username=None, email=None, password=None, 
                 whatsapp_number=None, role="user", **kwargs):
        self.role = role or kwargs.get("role", "user")
```

### 2. Update Login API Response
```python
# routes/auth_routes.py
@auth_bp.route('/login', methods=['POST'])
def login():
    # ... validation ...
    user = User.find_by_username(username)
    # ... password check ...
    
    return jsonify({
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,  # ← Add this
            "whatsapp_number": user.whatsapp_number
        }
    }), 200
```

### 3. Update Signup API Response
```python
# New users default to 'user' role
user = User(
    username=username,
    email=email,
    password=password,
    whatsapp_number=whatsapp_number,
    role="user"  # ← Default role
)
```

### 4. Create Admin Users
```python
# Manually set role to 'admin' during user creation
user.role = "admin"
user.save()
```

---

## Security Notes

⚠️ **Important**

1. **Frontend role check is UI-only**
   - Always validate role on backend before returning admin data
   - Never trust frontend role declarations

2. **Admin API Endpoints** (Backend)
   ```python
   from flask_jwt_extended import jwt_required, get_jwt_identity
   
   @admin_bp.route('/all-tasks', methods=['GET'])
   @jwt_required()
   def get_all_tasks():
       # Verify user is admin before returning data
       user = User.find_by_id(get_jwt_identity())
       if user.role != "admin":
           return {"error": "Unauthorized"}, 403
       
       # Return all tasks
       tasks = Task.find_all()
       return {"tasks": [t.to_dict() for t in tasks]}, 200
   ```

3. **Production Checklist**
   - [ ] Remove DevTools component in production
   - [ ] Validate role on all admin endpoints
   - [ ] Use HTTPS for authentication
   - [ ] Implement role-based permissions properly
   - [ ] Test all redirect scenarios

---

## Testing Checklist

- [ ] Regular user can login and see /dashboard
- [ ] Regular user redirected to /profile when accessing /admin
- [ ] Admin can login and see /admin
- [ ] Admin can still view /dashboard if desired
- [ ] Admin button visible only for admins
- [ ] Dev tools showed current role correctly
- [ ] Refresh page maintains role and redirects properly
- [ ] Logout clears role from localStorage
- [ ] New signup users go to /dashboard
