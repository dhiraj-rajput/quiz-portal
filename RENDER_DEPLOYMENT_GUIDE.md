# 🚀 Deploy Your Server to Render - Step by Step

Your database is ready! Now let's deploy your backend to Render.

## Step 1: First, Push Your Code to GitHub

```bash
# In your quiz-portal folder, run these commands:
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

## Step 2: Go to Render Website

1. Open your browser and go to: **[https://render.com](https://render.com)**
2. Click **"Get Started for Free"** (top right)
3. Click **"Sign up with GitHub"** (easiest option)
4. Allow Render to access your GitHub repositories

## Step 3: Create a New Web Service

1. Once logged in, you'll see the Render Dashboard
2. Click the big **"New +"** button (top right)
3. Select **"Web Service"** from the dropdown

## Step 4: Connect Your Repository

1. You'll see a list of your GitHub repositories
2. Find **"quiz-portal"** in the list
3. Click **"Connect"** next to it

## Step 5: Configure Your Service

Fill in these settings **EXACTLY**:

**Basic Settings:**
- **Name**: `quiz-portal-server`
- **Region**: Choose one closest to you (e.g., Oregon, Ohio, Frankfurt)
- **Branch**: `main`
- **Root Directory**: `server` ⚠️ **IMPORTANT: Type "server" here**
- **Runtime**: `Node`

**Build & Deploy Settings:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## Step 6: Add Environment Variables

Scroll down to **"Environment Variables"** section and add these **ONE BY ONE**:

Click **"Add Environment Variable"** for each:

**Variable 1:**
- **Key**: `NODE_ENV`
- **Value**: `production`

**Variable 2:**
- **Key**: `MONGODB_URI`
- **Value**: `mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority`

**Variable 3:**
- **Key**: `JWT_SECRET`
- **Value**: `e5b3b0239a454bfb31335411177f5f79130673a10a9c82b7e942d39c63583932`

**Variable 4:**
- **Key**: `JWT_REFRESH_SECRET`
- **Value**: `c7873e22985c46a83a56813f9e93ec35169433ec1ad5c9c1aa7d577c6ae503b7`

**Variable 5:**
- **Key**: `CORS_ORIGIN`
- **Value**: `*`

## Step 7: Deploy!

1. Scroll to the bottom and click **"Create Web Service"**
2. Render will start building your app
3. **Wait 5-10 minutes** for the first deployment
4. Watch the logs - you'll see it installing packages and starting your server

## Step 8: Get Your Backend URL

1. Once deployment is successful, you'll see **"Your service is live"**
2. **Copy the URL** at the top (it will look like: `https://quiz-portal-server-xxxx.onrender.com`)
3. **Save this URL** - you'll need it for the frontend!

## Step 9: Test Your Backend

1. Open a new browser tab
2. Go to: `https://your-render-url.onrender.com/api/monitoring/health`
3. You should see: `{"status":"healthy","timestamp":"..."}`
4. If you see this: ✅ **Your backend is working!**

## 🎉 Success! Your Backend is Live!

Your server is now running on Render and connected to your MongoDB database.

**Save your backend URL**: `https://quiz-portal-server-xxxx.onrender.com`

## Next Steps

1. ✅ Backend deployed to Render
2. ⬜ Deploy frontend to Vercel (next step)
3. ⬜ Connect frontend to backend
4. ⬜ Test complete application

---

## 🆘 Troubleshooting

**If deployment fails:**
1. Check the **"Logs"** tab in Render dashboard
2. Look for error messages
3. Common issues:
   - Wrong root directory (should be "server")
   - Missing environment variables
   - Build command errors

**If you see "Service Unavailable":**
- Wait a few more minutes - first deployment takes time
- Check logs for any errors

**Need help?** Check the logs and let me know what error you see!

Ready for the next step? Let me know when your backend is live! 🚀
