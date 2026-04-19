# 📊 System Architecture Diagrams

## 1. User Role System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TASK MANAGER SYSTEM                   │
└─────────────────────────────────────────────────────────┘
           │
           ├─────────────────────┬─────────────────────┐
           │                     │                     │
        LOGIN                  ADMIN                 USER
         Page                Dashboard             Dashboard
       (Role Select)        (👨‍💼 Role)           (👥 Role)
           │                     │                     │
           │        ┌────────────┴────────────┐        │
           └────────┤                         ├────────┘
                    │                         │
              ┌─────▼─────┐            ┌─────▼─────┐
              │  JWT Token │            │  JWT Token │
              │   + Role   │            │   + Role   │
              └─────┬─────┘            └─────┬─────┘
                    │                         │
        ┌───────────┴──────────┐  ┌──────────┴──────────┐
        │                      │  │                     │
     /api/admin/*          /api/tasks/*           /api/auth/*
        │                      │                     
        │                      └──────────┬──────────┐
        │                                 │  
   ┌────▼────────────────┐      ┌────────▼──────┐
   │  ADMIN FEATURES      │      │ USER FEATURES │
   │  • Create tasks      │      │ • View tasks  │
   │  • Assign to users   │      │ • Update     │
   │  • Review work       │      │   status     │
   │  • Approve/reject    │      │ • See        │
   │  • View analytics    │      │   feedback   │
   │  • Manage users      │      │ • Track      │
   │  • Confirm tasks     │      │   progress   │
   └────┬─────────────────┘      └────────┬─────┘
        │                                 │
        └──────────────┬──────────────────┘
                       │
                ┌──────▼──────┐
                │  MONGODB    │
                │  Database   │
                │ • Users Col │
                │ • Tasks Col │
                └─────────────┘
```

---

## 2. Authentication Flow Diagram

```
┌──────────────┐
│ User Visits  │
│   /login     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Login Page Loaded    │
│ Shows Role Options:  │
│ • 👥 Regular User    │
│ • 👨‍💼 Admin          │
└──────┬───────────────┘
       │
       ├─ User selects Role ─┐
       │                     │
       ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Enter Username  │   │ Enter Username  │
│ Enter Password  │   │ Enter Password  │
│                 │   │                 │
│ (User Mode)     │   │ (Admin Mode)    │
└────────┬────────┘   └────────┬────────┘
         │                      │
         │ POST /auth/login     │
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ API Validates        │
         │ • Username exists?   │
         │ • Password correct?  │
         │ • Get user.role      │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
      ✅ Valid              ❌ Invalid
         │                     │
         ▼                     ▼
    ┌─────────────┐    ┌──────────────┐
    │ Return JWT  │    │ Return 401   │
    │ + User      │    │ Error        │
    │ + Role      │    └──────┬───────┘
    └────┬────────┘           │
         │                    │
         │ Store in          Display
         │ localStorage      Error
         │                   Message
         ▼
    ┌─────────────────────────────────┐
    │ Frontend checks user.role        │
    └────────────┬────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────────┐  ┌──────────────────┐
│ role="admin"     │  │ role="user"      │
│ Redirect to      │  │ Redirect to      │
│/admin-dashboard  │  │/user-dashboard   │
└──────────────────┘  └──────────────────┘
```

---

## 3. Task Creation & Assignment Flow

```
┌──────────────────────────────────┐
│   Admin Dashboard                │
│   📋 All Tasks Tab               │
└──────────────┬───────────────────┘
               │
               ▼
     ┌─────────────────────┐
     │ Click "Create Task" │
     │ for User John       │
     └──────────┬──────────┘
                │
                ▼
     ┌──────────────────────────┐
     │ Admin Form               │
     │ • Title                  │
     │ • Description            │
     │ • Priority (High)        │
     │ • Category (Dev)         │
     │ • Deadline               │
     │ • Assign to: John        │
     └──────────┬───────────────┘
                │
                │ POST /api/admin/tasks/
                │        create-for-user/1
                │
                ▼
     ┌──────────────────────────┐
     │ Backend Checks           │
     │ • User (John) exists?    │
     │ • Admin has permission?  │
     │ • Data valid?            │
     └──────────┬───────────────┘
                │
         ✅ Valid
                │
                ▼
     ┌──────────────────────────┐
     │ Create Task              │
     │ • assigned_by: 10        │
     │ • user_id: 1 (John)      │
     │ • status: pending        │
     │ • confirmation_status:   │
     │   pending                │
     └──────────┬───────────────┘
                │
    ┌───────────┴──────────┐
    │                      │
    ▼                      ▼
 Email Notify         WhatsApp Notify
 John: New task    John: New task assigned
                        
                ▼
     ┌──────────────────────────┐
     │ John Logs In             │
     │ User Dashboard shows     │
     │ NEW TASK: "Fix Bug"      │
     │ Status: ⏸️ PENDING       │
     └──────────────────────────┘
```

---

## 4. Task Status Update & Confirmation Flow

```
┌─────────────────────┐
│  USER DASHBOARD     │
│  John's Tasks       │
└──────────┬──────────┘
           │
      Task: Fix Login Bug
      Current: ⏸️ PENDING
           │
           ▼
    ┌────────────────────┐
    │ Click Task         │
    │ (Expand details)   │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Status Buttons Show    │
    │ • ⏸️ Pending          │
    │ • 🚀 In Progress      │
    │ • ✅ Completed       │
    └────────┬───────────────┘
             │
      John Clicks "🚀 In Progress"
             │
             ▼
    ┌────────────────────────┐
    │ Update Status To:      │
    │ in_progress            │
    │ PUT /api/tasks/1       │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Backend Updates        │
    │ Task Status Changed    │
    │ Task Show: 🚀 Progress │
    └────────┬───────────────┘
             │
    ┌────────┴─────────┐
    │                  │
    Notify Admin   Continue Work
    │
    John continues...
    │
    Finishes work
    │
    Click "✅ Completed"
    │
    ▼
    ┌────────────────────────┐
    │ Status = "completed"   │
    │ confirmation_status =  │
    │ "pending"              │
    │                        │
    │ Ready for admin review │
    └────────┬───────────────┘
             │
    ┌────────┴────────────────────┐
    │                             │
    ▼                             ▼
┌────────────────────┐   ┌────────────────────┐
│ ADMIN GETS NOTIFIED│   │ Task appears in    │
│ New pending task to│   │ "Confirmations" tab│
│ review: "Fix Login"│   │ in Admin Dashboard │
└────────────────────┘   └────────┬───────────┘
                                  │
                         Admin clicks "Review"
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ Confirmation Modal │
                         │ Shows:             │
                         │ • Task details     │
                         │ • What was done    │
                         │ • Feedback input   │
                         │ • Approve/Reject   │
                         └────────┬───────────┘
                                  │
                      Admin types feedback:
                      "Good work, shipped!"
                                  │
                      Click "✅ Approve"
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ Task Updated:      │
                         │ confirmation_status│
                         │ = "approved"       │
                         │ confirmed_at =     │
                         │ (timestamp)        │
                         └────────┬───────────┘
                                  │
                    ┌─────────────┴──────────┐
                    │                        │
                    ▼                        ▼
              Notify User             Update Analytics
              "Task Approved!"        (Completion count++)
              
              ▼
              User sees task shows:
              ✅ APPROVED
              💬 Feedback: "Good work!"
```

---

## 5. Admin Dashboard Tabs

```
┌─────────────────────────────────────────────────────┐
│         ADMIN DASHBOARD - Tab Navigation             │
└─────────────────────────────────────────────────────┘

    📊 Overview  │  📋 Tasks  │  👥 Users  │  ✔️ Confirmations  │  📉 Analytics
        │             │           │              │                    │
        │             │           │              │                    │
        ▼             ▼           ▼              ▼                    ▼

   ┌─────────┐  ┌──────────┐ ┌────────┐  ┌──────────────┐  ┌──────────────┐
   │ Metrics │  │ All Tasks│ │ All    │  │ Pending      │  │ Statistics   │
   │ Cards:  │  │ from     │ │ Users  │  │ Tasks Needing│  │ by Status    │
   │         │  │ System   │ │ List   │  │ Review       │  │by Priority   │
   │ • Total │  │          │ │        │  │              │  │by Completion │
   │   Tasks │  │ Filters: │ │Filter: │  │ For Each:    │  │              │
   │ • Users │  │ • Status │ │ • Role │  │ • Review     │  │ Graphs &     │
   │ • Comp% │  │ • Confir │ │ • Name │  │ • Add        │  │ Charts       │
   │ • Pend  │  │         │ │        │  │   Feedback   │  │              │
   │  Conf   │  │ For Each │ │Details:│  │ • Approve/   │  │ Export Options│
   │         │  │ Task:    │ │        │  │   Reject     │  │ (coming soon)│
   │ Status  │  │ • Title  │ │ • Info │  │              │  │              │
   │ Distrib │  │ • Status │ │ • Role │  │ Modal Shows: │  │ Performance  │
   │         │  │ • Owner  │ │ • ID   │  │ • Task      │  │ Indicators   │
   │Priority │  │ • Confir │ │        │  │ • Feedback  │  │              │
   │ Distrib │  │   Status │ │        │  │ • Approval  │  │ User Metrics │
   │         │  │ • Click  │ │        │  │ • Rejection │  │              │
   │ Pending │  │   Detail │ │        │  │   Options   │  │ Team Stats   │
   │ Tasklist│  │         │ │        │  │              │  │              │
   │         │  │         │ │        │  │              │  │              │
   └─────────┘  └──────────┘ └────────┘  └──────────────┘  └──────────────┘
```

---

## 6. Database Structure

```
┌─────────────────────────┐
│   MongoDB Collections   │
└─────────────────────────┘
         │
         ├─────────────┬─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌──────────┐
    │ users  │   │ tasks  │   │Sequences │
    └────┬───┘   └───┬────┘   └──────────┘
         │           │
         │           │
    Documents:   Documents:
    ┌────────┐   ┌────────┐
    │id      │   │id      │
    │username│   │title   │
    │email   │   │status  │
    │role ◄──┼───┤user_id │◄──┐
    │pwd_hash│   │assigned│    │
    │WhatsApp│   │_by     │    │
    │date    │   │confirm │    │
    └────────┘   │_status │    │
                 │confirm │    │
                 │_feedback   │
                 │deadline│    │
                 │priority│    │
                 │created │    │
                 │updated │    │
                 └────────┘    │
                               │
                    ┌──────────┘
                    │
            "user_id" Links to
            User in "users" collection
            
            
INDEXES:
────────
users:
  • id (unique, primary)
  • username (unique, index)
  • email (unique, index)

tasks:
  • id (unique, primary)
  • user_id (index)
  • confirmation_status (index)
  • deadline (index)
  • created_at (index)
```

---

## 7. Role-Based Access Control (RBAC)

```
┌────────────────────────────────────┐
│     ACCESS CONTROL MATRIX           │
└────────────────────────────────────┘

Endpoint                    | Admin | User
────────────────────────────┼───────┼─────
/auth/login                 |  ✅   | ✅
/auth/signup                |  ✅   | ✅
/auth/verify                |  ✅   | ✅
/auth/profile               |  ✅   | ✅
────────────────────────────┼───────┼─────
GET /tasks                  |  ❌   | ✅ own
POST /tasks                 |  ❌   | ✅
GET /tasks/:id              |  ❌   | ✅ own
PUT /tasks/:id              |  ❌   | ✅ own
DELETE /tasks/:id           |  ❌   | ✅ own
GET /tasks/stats            |  ❌   | ✅
────────────────────────────┼───────┼─────
GET /admin/users            |  ✅   | ❌
PUT /admin/users/:id/role   |  ✅   | ❌
GET /admin/tasks            |  ✅   | ❌
POST /admin/tasks/.../user  |  ✅   | ❌
PUT /admin/tasks/:id/confirm|  ✅   | ❌
GET /admin/analytics/*      |  ✅   | ❌
────────────────────────────┼───────┼─────

Legend:
✅ = Allowed
❌ = Not Allowed
"own" = Only for own resources
```

---

## 8. Complete Workflow Timeline

```
TIME ──────────────────────────────────────────────────────────────────>

DAY 0:
┌─ Admin Account Created
│
│  DAY 1:
│  ┌─ Admin Creates Task "Design Homepage"
│  │  └─ assigns_by = Admin.id
│  │  └─ user_id = User.id
│  │  └─ status = "pending"
│  │  └─ confirmation_status = "pending"
│  │
│  │  User Notified (Email + WhatsApp)
│  │
│  │  DAY 2:
│  │  ┌─ User Logs In
│  │  │  └─ Sees Task in Dashboard
│  │  │
│  │  │  DAY 3:
│  │  │  ┌─ User Clicks "🚀 In Progress"
│  │  │  │  └─ status = "in_progress"
│  │  │  │  └─ updated_at = NOW
│  │  │  │
│  │  │  │  DAY 5:
│  │  │  │  ┌─ User Finishes Work
│  │  │  │  │  └─ Clicks "✅ Completed"
│  │  │  │  │  └─ status = "completed"
│  │  │  │  │  └─ confirmation_status = "pending"
│  │  │  │  │
│  │  │  │  │  Admin Notified
│  │  │  │  │
│  │  │  │  │  DAY 5 (30 min later):
│  │  │  │  │  ┌─ Admin Checks Dashboard
│  │  │  │  │  │
│  │  │  │  │  │  DAY 5 (1 hour later):
│  │  │  │  │  │  ┌─ Admin Clicks "Confirmations"
│  │  │  │  │  │  │  └─ Sees "Design Homepage"
│  │  │  │  │  │  │
│  │  │  │  │  │  │  DAY 5 (1.5 hours later):
│  │  │  │  │  │  │  ┌─ Admin Opens Confirmation Modal
│  │  │  │  │  │  │  │  └─ Types: "Great design! Ready for deployment"
│  │  │  │  │  │  │  │  └─ Clicks "✅ Approve"
│  │  │  │  │  │  │  │  └─ confirmation_status = "approved"
│  │  │  │  │  │  │  │  └─ confirmed_at = NOW
│  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  User Notified of Approval
│  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  DAY 6:
│  │  │  │  │  │  │  │  ┌─ User Sees Confirmation
│  │  │  │  │  │  │  │  │  └─ Task shows: "✅ APPROVED"
│  │  │  │  │  │  │  │  │  └─ See admin feedback
│  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  │  Analytics Updated:
│  │  │  │  │  │  │  │  │  └─ Total completed: +1
│  │  │  │  │  │  │  │  │  └─ User completion rate: ↑
│  │  │  │  │  │  │  │  │  └─ System completion rate: ↑
│  │  │  │  │  │  │  │  │  └─ Days to complete: 5 days
```

---

## 9. API Request/Response Flow

```
┌────────────────────────────────────────────────────────┐
│           FRONTEND (React)                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ User Clicks "Approve" Button                     │  │
│  │ state = { feedback: "Great work!" }              │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                    │
└─────────────────────┼────────────────────────────────────┘
                      │
                      │ adminAPI.confirmTaskStatus(5, {
                      │   confirmation_status: "approved",
                      │   feedback: "Great work!"
                      │ })
                      │
                      ▼
         ┌─────────────────────────────────────┐
         │ axios.put(                           │
         │  "/api/admin/tasks/5/confirm",       │
         │  {                                   │
         │    confirmation_status: "approved",  │
         │    feedback: "Great work!"           │
         │  },                                  │
         │  {                                   │
         │    headers: {                        │
         │      "Authorization": "Bearer token" │
         │    }                                 │
         │  }                                   │
         │ )                                    │
         └──────────────────┬────────────────────┘
                            │
                    HTTP PUT Request
                            │
┌───────────────────────────┼─────────────────────────────┐
│           BACKEND (Flask)                                │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Route: PUT /api/admin/tasks/<task_id>/confirm   │  │
│   │ @admin_required decorator checks:               │  │
│   │ • Token valid?                                  │  │
│   │ • User.role == "admin"?                         │  │
│   └────────────────┬────────────────────────────────┘  │
│                    │                                     │
│    ✅ Authorized                                         │
│                    │                                     │
│   ┌────────────────┼────────────────────────────────┐  │
│   │ Load Task #5 from MongoDB                       │  │
│   │ Update fields:                                  │  │
│   │ • confirmation_status = "approved"              │  │
│   │ • confirmation_feedback = "Great work!"         │  │
│   │ • confirmed_at = datetime.now()                 │  │
│   │ Save to MongoDB                                 │  │
│   └────────────────┬────────────────────────────────┘  │
│                    │                                     │
│   ┌────────────────┼────────────────────────────────┐  │
│   │ SIDE EFFECTS:                                   │  │
│   │ • Get User #1 (task owner)                      │  │
│   │ • Send email notification                       │  │
│   │ • Update analytics                              │  │
│   └────────────────┬────────────────────────────────┘  │
│                    │                                     │
│   ┌────────────────┼────────────────────────────────┐  │
│   │ Return 200 OK with:                             │  │
│   │ {                                               │  │
│   │   "message": "Task confirmation updated...",    │  │
│   │   "task": {                                     │  │
│   │     "id": 5,                                    │  │
│   │     "confirmation_status": "approved",          │  │
│   │     "confirmed_at": "2024-02-15T17:30:00"      │  │
│   │   }                                             │  │
│   │ }                                               │  │
│   └────────────────┬────────────────────────────────┘  │
└────────────────────┼──────────────────────────────────┘
                     │
                     │ HTTP 200 Response
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────┼─────────────────────────┼─────────┐
│FRONTEND│                        │         │
│ ┌─────▼──────────────────────┐ │         │
│ │ Response received           │ │         │
│ │ const task = res.task       │ │         │
│ │                             │ │         │
│ │ Update state:               │ │         │
│ │ setSelectedTask(null)       │ │         │
│ │ loadPendingConfirmations()  │ │         │
│ │                             │ │         │
│ │ UI Updates:                 │ │         │
│ │ • Modal closes              │ │         │
│ │ • Task list refreshes       │ │         │
│ │ • Pending count decreases   │ │         │
│ │ • Success toast shown       │ │         │
│ └─────┬──────────────────────┘ │         │
└──────┼──────────────────────────┘         │
       │                                    │
User Sees Updated UI ◄────────────────────┘
Task shows "APPROVED" ✅
```

---

**These diagrams show the complete system architecture, workflows, and data flow for the role-based task manager system.**
