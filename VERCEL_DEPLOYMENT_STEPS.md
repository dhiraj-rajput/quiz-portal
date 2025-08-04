# 🚀 Vercel Deployment Steps

## Backend Deployment (Step 1)

### 1. Create Backend Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import `quiz-portal` repository from GitHub
4. **Configure the backend project:**
   - **Project Name**: `quiz-portal-api`
   - **Framework Preset**: Other
   - **Root Directory**: `server`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2. Set Environment Variables for Backend
Go to your backend project settings and add these environment variables:

```bash
# Database
MONGODB_URI=mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=829f2063b88840ab752e61872d38f1e4a21ded7c9c10343711d00da7b37e5c85
JWT_REFRESH_SECRET=your-super-strong-production-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=production
PORT=5000

# CORS Configuration
CORS_ORIGIN=https://your-frontend-url.vercel.app

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Frontend URL (will be updated after frontend deployment)
FRONTEND_URL=https://your-frontend-url.vercel.app

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# OTP Service Configuration
DATAGEN_USERNAME=your-datagen-username
DATAGEN_PASSWORD=your-datagen-password
```

### 3. Deploy Backend
Click "Deploy" and wait for the deployment to complete.
**Note down the backend URL** (e.g., `https://quiz-portal-api.vercel.app`)

---

## Frontend Deployment (Step 2)

### 1. Create Frontend Project in Vercel
1. Go back to Vercel Dashboard
2. Click "New Project" again
3. Import the same `quiz-portal` repository
4. **Configure the frontend project:**
   - **Project Name**: `quiz-portal-frontend`
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2. Set Environment Variables for Frontend
Add these environment variables to the frontend project:

```bash
# Environment
VITE_NODE_ENV=production

# API Configuration (use your actual backend URL from step 1)
VITE_API_URL=https://quiz-portal-api.vercel.app/api

# WebSocket Configuration
VITE_SOCKET_URL=https://quiz-portal-api.vercel.app

# Server Configuration
VITE_SERVER_HOST=quiz-portal-api.vercel.app
VITE_SERVER_PORT=443
VITE_SERVER_PROTOCOL=https

# Frontend Configuration
VITE_FRONTEND_HOST=quiz-portal-frontend.vercel.app
VITE_FRONTEND_PORT=443
VITE_FRONTEND_PROTOCOL=https
```

### 3. Deploy Frontend
Click "Deploy" and wait for the deployment to complete.
**Note down the frontend URL** (e.g., `https://quiz-portal-frontend.vercel.app`)

---

## Post-Deployment Configuration (Step 3)

### 1. Update Backend CORS Configuration
Go back to your backend project in Vercel:
1. Go to Settings → Environment Variables
2. Update the `CORS_ORIGIN` variable with your actual frontend URL:
   ```
   CORS_ORIGIN=https://quiz-portal-frontend.vercel.app
   ```
3. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://quiz-portal-frontend.vercel.app
   ```
4. Redeploy the backend project

### 2. Test Your Application
1. Visit your frontend URL
2. Test registration, login, and core features
3. Check browser console for any CORS or API errors

---

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Make sure `CORS_ORIGIN` in backend matches frontend URL exactly
2. **API Connection Issues**: Verify `VITE_API_URL` in frontend points to correct backend URL
3. **Database Connection**: Check MongoDB Atlas connection string and IP whitelist
4. **File Upload Issues**: File uploads work differently in serverless environment

### MongoDB Atlas Setup:
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Go to Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
3. This is required for Vercel's serverless functions

---

## Final URLs
- **Frontend**: https://quiz-portal-frontend.vercel.app
- **Backend API**: https://quiz-portal-api.vercel.app/api
- **API Health Check**: https://quiz-portal-api.vercel.app/api/monitoring/health

🎉 Your Quiz Portal is now live on Vercel!
