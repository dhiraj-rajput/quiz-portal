# 🚀 Deployment Guide - Quiz Portal to Vercel

This guide will help you deploy your Quiz Portal application to Vercel.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **MongoDB Atlas**: Set up a cloud MongoDB database
4. **Email Provider**: Configure Gmail or other SMTP service

## Step-by-Step Deployment

### 1. Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Whitelist your IP addresses (or use 0.0.0.0/0 for all IPs)
5. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/quiz-portal`

### 2. Deploy Backend (API) First

1. **Login to Vercel**: `npx vercel login`
2. **Navigate to server directory**: `cd server`
3. **Deploy**: `npx vercel --prod`
4. **Set Environment Variables** in Vercel Dashboard:
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-portal
   JWT_SECRET=your-super-strong-production-jwt-secret-key-min-32-chars
   JWT_REFRESH_SECRET=your-super-strong-production-refresh-secret-key-min-32-chars
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-deployment.vercel.app
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=https://your-frontend-deployment.vercel.app
   ```

### 3. Deploy Frontend

1. **Navigate to root directory**: `cd ..`
2. **Update Environment Variables**: Edit the production URLs in your Vercel dashboard
3. **Deploy**: `npx vercel --prod`
4. **Set Environment Variables** in Vercel Dashboard:
   ```bash
   VITE_API_URL=https://your-api-deployment.vercel.app/api
   VITE_SOCKET_URL=https://your-api-deployment.vercel.app
   VITE_NODE_ENV=production
   ```

### 4. Configure Domain Names (Optional)

1. **Custom Domain**: Add your custom domain in Vercel dashboard
2. **Update Environment Variables**: Replace vercel.app URLs with your custom domains

## Alternative: Deploy via GitHub Integration

### 1. Connect GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework**: Vite (for frontend) / Other (for backend)
   - **Root Directory**: `.` (for frontend) / `server` (for backend)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2. Set Environment Variables

Add all the environment variables listed above in the Vercel dashboard for each deployment.

## Environment Variables Reference

### Frontend Environment Variables
```bash
VITE_NODE_ENV=production
VITE_API_URL=https://your-api-deployment.vercel.app/api
VITE_SOCKET_URL=https://your-api-deployment.vercel.app
```

### Backend Environment Variables
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-portal
JWT_SECRET=your-super-strong-production-jwt-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-super-strong-production-refresh-secret-key-min-32-chars
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-deployment.vercel.app
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://your-frontend-deployment.vercel.app
```

## Important Notes

1. **Deploy Backend First**: The frontend needs the backend URL to function
2. **Update CORS**: Make sure CORS_ORIGIN matches your frontend URL
3. **Database**: Use MongoDB Atlas for production (not localhost)
4. **Secrets**: Never commit production secrets to GitHub
5. **File Uploads**: Consider using cloud storage (AWS S3, Cloudinary) for file uploads in production

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Check CORS_ORIGIN environment variable
2. **Database Connection**: Verify MongoDB Atlas connection string and IP whitelist
3. **Environment Variables**: Ensure all required variables are set in Vercel dashboard
4. **Build Errors**: Check build logs in Vercel dashboard

### Useful Commands:

```bash
# Check deployment status
npx vercel ls

# View deployment logs
npx vercel logs [deployment-url]

# Set environment variable via CLI
npx vercel env add [variable-name]
```

## Security Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] MongoDB Atlas with authentication
- [ ] CORS configured correctly
- [ ] Email credentials secured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] No sensitive data in client-side code

## Post-Deployment

1. **Test All Features**: Registration, login, file uploads, etc.
2. **Monitor Performance**: Use Vercel Analytics
3. **Set Up Monitoring**: Consider error tracking (Sentry)
4. **Backup Database**: Regular MongoDB Atlas backups
5. **Documentation**: Update README with live URLs

Your Quiz Portal should now be live on Vercel! 🎉
