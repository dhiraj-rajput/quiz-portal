# 🚀 Deploy Frontend to Vercel - Step by Step

Your backend is live at: `https://quiz-portal-server.onrender.com`

Now let's deploy your frontend!

## Step 1: Go to Vercel

1. Open browser: **[https://vercel.com](https://vercel.com)**
2. Click **"Sign up"** (top right)
3. Choose **"Continue with GitHub"** (easiest)
4. Allow Vercel to access your repositories

## Step 2: Create New Project

1. Once logged in, click **"New Project"** (big button or from dashboard)
2. You'll see "Import Git Repository"
3. Find **"quiz-portal"** in your repository list
4. Click **"Import"** next to it

## Step 3: Configure Project Settings

**Framework Preset**: 
- Vercel should auto-detect "Vite" ✅
- If not, select "Vite" from dropdown

**Root Directory**: 
- Click "Edit" next to Root Directory
- Type: `client` ⚠️ **IMPORTANT**
- Click "Continue"

**Build Settings**: (Should auto-fill, but verify)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Step 4: Add Environment Variables

Click **"Environment Variables"** section and add these **ONE BY ONE**:

**Variable 1:**
- **Name**: `VITE_NODE_ENV`
- **Value**: `production`

**Variable 2:**
- **Name**: `VITE_API_URL`
- **Value**: `https://quiz-portal-server.onrender.com/api`

**Variable 3:**
- **Name**: `VITE_SOCKET_URL`
- **Value**: `https://quiz-portal-server.onrender.com`

## Step 5: Deploy!

1. Click **"Deploy"** button
2. Wait 2-5 minutes for deployment
3. Watch the build logs (should see Vite building successfully)

## Step 6: Get Your Frontend URL

Once deployed, you'll see:
- ✅ **"Your project has been deployed"**
- 🔗 **Your frontend URL** (e.g., `https://quiz-portal-abc123.vercel.app`)
- **Copy this URL** - you'll need it!

## Step 7: Update Backend CORS

1. Go back to **Render Dashboard**: [https://dashboard.render.com](https://dashboard.render.com)
2. Click on your `quiz-portal-server` service
3. Go to **"Environment"** tab
4. Find `CORS_ORIGIN` variable
5. Change value from `*` to your Vercel URL (e.g., `https://quiz-portal-abc123.vercel.app`)
6. Click **"Save Changes"**
7. Wait for automatic redeploy (2-3 minutes)

## Step 8: Test Everything!

1. Visit your Vercel frontend URL
2. Try to register a new user
3. Try to login
4. Check if data loads correctly

## 🎯 Expected Results:

✅ **Frontend**: Loads at your Vercel URL  
✅ **Registration**: Works without CORS errors  
✅ **Login**: Works and shows dashboard  
✅ **API Calls**: All working properly  

---

## 🆘 Troubleshooting:

**Frontend build fails:**
- Check that Root Directory is set to `client`
- Verify environment variables are correct

**CORS errors:**
- Make sure CORS_ORIGIN in Render matches your Vercel URL exactly
- Wait for Render to redeploy after changing CORS_ORIGIN

**API not working:**
- Verify VITE_API_URL points to your Render backend
- Check browser console for error details

---

## 🎉 Success Checklist:

- [ ] Frontend deployed to Vercel
- [ ] Backend CORS_ORIGIN updated with Vercel URL  
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads with data

**Ready to start? Go to [vercel.com](https://vercel.com) and let's get your frontend live! 🚀**
