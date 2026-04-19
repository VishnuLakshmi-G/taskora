# 🔌 Complete API Reference - Task Manager v2.0

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require JWT token in header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Authentication Endpoints

### POST /auth/signup
Register new user account

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "whatsapp_number": "+919876543210"
}
```

**Response:** `201 Created`
```json
{
  "message": "Signup successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "whatsapp_number": "+919876543210",
    "role": "user",
    "created_at": "2024-02-15T10:30:00"
  }
}
```

**Errors:**
- `400` - Missing required fields
- `409` - Username/email already exists

---

### POST /auth/login
Authenticate user

**Request:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2024-02-15T10:30:00"
  }
}
```

**Errors:**
- `400` - Missing credentials
- `401` - Invalid username/password

---

### GET /auth/verify
Verify JWT token validity

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "user"
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

### GET /auth/profile
Get current user profile

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "whatsapp_number": "+919876543210",
    "role": "user",
    "created_at": "2024-02-15T10:30:00"
  }
}
```

---

## 📋 Task Endpoints (User)

### GET /tasks
Get user's tasks

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
?status=pending|in_progress|completed
?priority=low|medium|high|urgent
?category=development|design|testing
?search=keyword
```

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Fix Login Bug",
      "description": "User cannot login with special characters",
      "status": "in_progress",
      "priority": "high",
      "category": "development",
      "deadline": "2024-02-20T18:00:00",
      "assigned_by": 10,
      "confirmation_status": "pending",
      "confirmation_feedback": "",
      "confirmed_at": null,
      "user_id": 1,
      "subtasks": ["Test password reset", "Check email validation"],
      "ai_generated": false,
      "created_at": "2024-02-15T10:30:00",
      "updated_at": "2024-02-15T14:15:00"
    }
  ],
  "count": 1
}
```

---

### POST /tasks
Create new task

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Implement Search Feature",
  "description": "Add full-text search to dashboard",
  "priority": "medium",
  "category": "development",
  "deadline": "2024-02-25T18:00:00",
  "subtasks": ["Create search index", "Build UI component", "Test performance"],
  "ai_generated": false
}
```

**Response:** `201 Created`
```json
{
  "message": "Task created successfully",
  "task": {
    "id": 2,
    "title": "Implement Search Feature",
    "user_id": 1,
    "assigned_by": 0,
    "status": "pending",
    "confirmation_status": "pending",
    "created_at": "2024-02-15T15:00:00"
  }
}
```

---

### PUT /tasks/<task_id>
Update task

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Updated Title",
  "status": "completed",
  "priority": "high",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "message": "Task updated successfully",
  "task": {
    "id": 2,
    "title": "Updated Title",
    "status": "completed",
    "updated_at": "2024-02-15T16:00:00"
  }
}
```

---

### GET /tasks/<task_id>
Get specific task

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "task": {
    "id": 2,
    "title": "Implement Search Feature",
    "description": "Add full-text search to dashboard",
    "status": "pending",
    "priority": "medium",
    "confirmation_status": "pending",
    "created_at": "2024-02-15T15:00:00"
  }
}
```

---

### DELETE /tasks/<task_id>
Delete task

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

---

### GET /tasks/stats
Get user's task statistics

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "total_tasks": 15,
  "pending_tasks": 5,
  "in_progress_tasks": 8,
  "completed_tasks": 2,
  "completion_rate": 13.3,
  "urgent_tasks": 2,
  "high_priority_tasks": 6,
  "overdue_tasks": 1
}
```

---

## 👨‍💼 Admin Endpoints

### GET /admin/users
Get all users (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2024-02-15T10:30:00"
    },
    {
      "id": 10,
      "username": "admin_user",
      "email": "admin@example.com",
      "role": "admin",
      "created_at": "2024-02-01T09:00:00"
    }
  ],
  "total": 2
}
```

**Errors:**
- `403` - User is not admin

---

### PUT /admin/users/<user_id>/role
Update user role (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "role": "admin"  // or "user"
}
```

**Response:** `200 OK`
```json
{
  "message": "Role updated successfully",
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "admin"
  }
}
```

---

### GET /admin/tasks
Get all tasks in system (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
```
?status=pending|in_progress|completed
?confirmation_status=pending|approved|rejected
?user_id=1
?priority=high
```

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Fix Login Bug",
      "user_id": 1,
      "username": "john_doe",
      "user_email": "john@example.com",
      "status": "in_progress",
      "confirmation_status": "pending",
      "priority": "high",
      "created_at": "2024-02-15T10:30:00"
    }
  ],
  "total": 1
}
```

---

### POST /admin/tasks/create-for-user/<user_id>
Create task for user (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "title": "Design Homepage",
  "description": "Create responsive homepage design",
  "priority": "high",
  "category": "design",
  "deadline": "2024-02-25T18:00:00",
  "subtasks": ["Create wireframes", "Design mockups"],
  "ai_generated": false
}
```

**Response:** `201 Created`
```json
{
  "message": "Task created successfully",
  "task": {
    "id": 5,
    "title": "Design Homepage",
    "user_id": 1,
    "assigned_by": 10,
    "status": "pending",
    "confirmation_status": "pending",
    "created_at": "2024-02-15T16:00:00"
  }
}
```

**Errors:**
- `403` - User is not admin
- `404` - Target user not found
- `400` - Missing required fields

---

### PUT /admin/tasks/<task_id>/confirm
Confirm task status (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "confirmation_status": "approved",  // or "rejected"
  "feedback": "Great work! Delivered on time with excellent quality.",
  "status": "completed"  // optional: update status too
}
```

**Response:** `200 OK`
```json
{
  "message": "Task confirmation updated to approved",
  "task": {
    "id": 1,
    "title": "Fix Login Bug",
    "status": "completed",
    "confirmation_status": "approved",
    "confirmation_feedback": "Great work! Delivered on time with excellent quality.",
    "confirmed_at": "2024-02-15T17:00:00"
  }
}
```

**Errors:**
- `403` - Not authorized
- `404` - Task not found

---

## 📊 Analytics Endpoints

### GET /admin/analytics/overview
System overview statistics (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`
```json
{
  "total_tasks": 145,
  "total_users": 25,
  "tasks_by_status": {
    "pending": 34,
    "in_progress": 56,
    "completed": 55
  },
  "tasks_by_confirmation": {
    "pending": 12,
    "approved": 89,
    "rejected": 44
  },
  "tasks_by_priority": {
    "urgent": 3,
    "high": 34,
    "medium": 78,
    "low": 30
  },
  "completion_rate": 37.9,
  "users_by_role": {
    "admin": 2,
    "user": 23
  }
}
```

---

### GET /admin/analytics/user/<user_id>
User-specific analytics (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "total_tasks": 12,
  "tasks_by_status": {
    "pending": 2,
    "in_progress": 5,
    "completed": 5
  },
  "tasks_by_confirmation": {
    "pending": 1,
    "approved": 4,
    "rejected": 0
  },
  "completion_rate": 41.7,
  "avg_completion_days": 3.2
}
```

---

### GET /admin/analytics/pending-confirmations
Pending task confirmations (Admin only)

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "id": 5,
      "title": "Design Homepage",
      "status": "completed",
      "user_id": 1,
      "username": "john_doe",
      "priority": "high",
      "created_at": "2024-02-15T16:00:00"
    }
  ],
  "total": 1
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Title is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authorization token required"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Task not found"
}
```

### 409 Conflict
```json
{
  "error": "Username already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting
Currently no rate limiting. Production deployment should add:
- 100 requests/minute per IP
- 1000 requests/hour per user

---

## Webhooks (Coming Soon)
- Task created notification
- Task completed notification
- Confirmation status changed
- Overdue task alert

---

## Pagination (Coming Soon)
Future versions will support:
```
?limit=20&offset=0
```

---

## Sorting (Coming Soon)
```
?sort=created_at:desc&sort=priority:asc
```

---

## Changelog

### v2.0 (February 2024)
- ✅ Added role-based access (admin/user)
- ✅ Added task confirmation workflow
- ✅ Added admin analytics endpoints
- ✅ Added user role management

### v1.0 (Initial)
- Basic CRUD for tasks
- Authentication
- Reminders & notifications

---

**API Version:** 2.0  
**Last Updated:** February 2024  
**Status:** Production Ready  
