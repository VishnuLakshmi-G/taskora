# 🚀 GenAI Task Manager - Render Deployment

A full-stack task management application with user authentication, real-time messaging, and admin dashboard.

## 📋 Prerequisites

- [MongoDB Atlas](https://cloud.mongodb.com/) account (free tier available)
- [Render](https://render.com/) account (free tier available)
- GitHub repository with this code

## 🗄️ Database Setup

1. **Create MongoDB Atlas Cluster:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create a free cluster
   - Create a database user
   - Get your connection string

2. **Whitelist Render IPs:**
   - In Network Access: Add `0.0.0.0/0` (allow all for Render)

## 🚀 Deployment Steps

### 1. Fork/Clone this repository to GitHub

### 2. Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file

### 3. Configure Environment Secrets

In Render Dashboard, go to Settings → Environment:

**Required Secrets:**
```
jwt-secret: your-secure-random-jwt-key-here
mongodb-uri: mongodb+srv://username:password@cluster.mongodb.net/genai_task_manager
allowed-origins: https://your-frontend-app.onrender.com
```

**Optional (already set to false):**
```
enable-scheduler: false  # Disables email/WhatsApp reminders
```

### 4. Deploy

- Click "Create Blueprint"
- Render will deploy both backend and frontend automatically
- Backend: `https://genai-task-manager-backend.onrender.com`
- Frontend: `https://genai-task-manager-frontend.onrender.com`

## 🔧 Manual Deployment (Alternative)

If blueprint doesn't work:

### Backend Deployment:
1. New → Web Service
2. Runtime: Python 3
3. Build Command: `pip install -r backend/requirements.txt`
4. Start Command: `cd backend && python app.py`
5. Add environment variables above

### Frontend Deployment:
1. New → Static Site
2. Build Command: `cd frontend && npm install && npm run build`
3. Publish Directory: `frontend/build`
4. Environment: `REACT_APP_API_BASE=https://your-backend-url.onrender.com`

## ✅ Features Included

- ✅ User registration and login
- ✅ JWT authentication
- ✅ Task management (CRUD)
- ✅ Admin dashboard
- ✅ Real-time messaging between users and admin
- ✅ Role-based access control

## 🚫 Features Excluded (Optional)

- OpenAI integration (commented out)
- Email notifications (commented out)
- WhatsApp integration (commented out)
- AI task parsing (commented out)

## 🔐 Security Notes

- Change the JWT secret key in production
- Use strong passwords for MongoDB
- Keep your Render secrets secure

## 🎯 URLs After Deployment

- **Frontend**: `https://genai-task-manager-frontend.onrender.com`
- **Backend API**: `https://genai-task-manager-backend.onrender.com`

## 🐛 Troubleshooting

**Free tier limitations:**
- Services sleep after 15 minutes of inactivity
- Wake-up time: ~30 seconds

**Common issues:**
- Check Render logs for errors
- Verify MongoDB connection string
- Ensure CORS origins match your frontend URL