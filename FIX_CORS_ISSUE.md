# 🔧 Fix CORS Connection Issue

## Problem: Frontend can't connect to Backend
Your frontend is deployed but getting "Failed to fetch" errors because of CORS policy.

## Solution: Update Backend CORS Settings

### Step 1: Get Your Vercel URL
Look at your Vercel dashboard or browser address bar. Your URL should be something like:
`https://quiz-portal-alpha-xyz.vercel.app`

### Step 2: Update Render Backend CORS

1. **Go to Render Dashboard**: [https://dashboard.render.com](https://dashboard.render.com)
2. **Find your service**: `quiz-portal-server`
3. **Click on it**
4. **Go to "Environment" tab**
5. **Find the `CORS_ORIGIN` variable**
6. **Change the value from**: `*`
7. **Change the value to**: `https://your-actual-vercel-url.vercel.app`
8. **Click "Save Changes"**
9. **Wait 2-3 minutes** for automatic redeploy

### Step 3: Test Again
After the backend redeploys:
1. Go to your Vercel frontend URL
2. Try logging in again
3. Should work without CORS errors!

## Example:
If your Vercel URL is: `https://quiz-portal-alpha-abc123.vercel.app`
Then set CORS_ORIGIN to: `https://quiz-portal-alpha-abc123.vercel.app`

## 🎯 Quick Fix Checklist:
- [ ] Get exact Vercel URL (copy from browser)
- [ ] Update CORS_ORIGIN in Render dashboard
- [ ] Wait for backend redeploy
- [ ] Test login again

**The connection will work as soon as you update the CORS setting!** 🚀
