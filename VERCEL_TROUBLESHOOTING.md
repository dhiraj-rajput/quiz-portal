# Vercel Backend Deployment Troubleshooting

## The 404 error you're seeing is likely due to one of these issues:

### 1. **Environment Variables Not Set**
Make sure you've added ALL these environment variables in your Vercel project settings:

```
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority
JWT_SECRET=YOUR_JWT_SECRET_HERE_32_CHARS_MINIMUM
JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET_HERE_32_CHARS_MINIMUM
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://quiz-portal-alpha.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=alluses1033@gmail.com
EMAIL_PASS=harshu20051010
FRONTEND_URL=https://quiz-portal-alpha.vercel.app
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### 2. **Build Configuration Issues**
Make sure your Vercel project settings are:
- **Framework Preset**: Other
- **Root Directory**: `server`
- **Build Command**: `npm run vercel-build` 
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. **Node.js Version**
Make sure you're using a compatible Node.js version. Add this to your `server/package.json`:

```json
{
  "engines": {
    "node": "18.x"
  }
}
```

## 🔧 Fix Steps:

1. **Go to your Vercel project dashboard**
2. **Go to Settings → Environment Variables**
3. **Add ALL the environment variables listed above**
4. **Go to Settings → General**
5. **Set Node.js Version to 18.x**
6. **Redeploy the project**

## 🐛 Debug URLs to test:

Once deployed, test these URLs (replace with your actual deployment URL):

- `https://your-backend-url.vercel.app/` - Should show API status
- `https://your-backend-url.vercel.app/api/debug` - Should show debug info
- `https://your-backend-url.vercel.app/api/monitoring/health` - Should show health status

## Common Solutions:

1. **If you get "Function not found"**: Check that Root Directory is set to `server`
2. **If you get "Build failed"**: Check the build logs for TypeScript errors
3. **If you get "Internal Server Error"**: Check that all environment variables are set correctly

Let me know what error you see when you try to access the root URL of your backend deployment!
