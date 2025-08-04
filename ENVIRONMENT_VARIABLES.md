# 🔧 Environment Variables - Ready to Copy & Paste

## For Render (Backend) - Copy these exactly:

NODE_ENV=production
MONGODB_URI=mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority
JWT_SECRET=e5b3b0239a454bfb31335411177f5f79130673a10a9c82b7e942d39c63583932
JWT_REFRESH_SECRET=c7873e22985c46a83a56813f9e93ec35169433ec1ad5c9c1aa7d577c6ae503b7
CORS_ORIGIN=*

## For Vercel (Frontend) - Copy these exactly:

VITE_NODE_ENV=production
VITE_API_URL=https://quiz-portal-server.onrender.com/api
VITE_SOCKET_URL=https://quiz-portal-server.onrender.com

## 📝 What to Replace:

1. In MONGODB_URI: Replace YOUR_PASSWORD with your MongoDB password
2. In MONGODB_URI: Replace the cluster URL with your actual cluster URL
3. In Vercel variables: Replace YOUR_RENDER_URL with your Render service URL
4. After frontend is deployed: Update CORS_ORIGIN in Render with your Vercel URL

## 🔒 Security Notes:

- JWT secrets are automatically generated and secure
- Never share these secrets publicly
- MongoDB connection includes your database password
- CORS_ORIGIN starts as "*" (allows all) but should be updated to your frontend URL
