# Quiz Portal - Setup & Deployment Guide

Complete guide for setting up and deploying the Quiz Portal application with separated client and server architecture.

## 📁 Project Structure

```
quiz-portal/                 # Root directory (monorepo)
├── client/                  # Frontend React Application
│   ├── src/                # React components, hooks, contexts
│   ├── public/             # Static assets
│   ├── .env                # Client environment variables
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── vercel.json         # Client deployment config
├── server/                 # Backend Node.js API
│   ├── src/                # Express controllers, models, routes
│   ├── api/                # Vercel API deployment entry
│   ├── uploads/            # File storage directory
│   ├── .env                # Server environment variables
│   ├── package.json        # Backend dependencies
│   └── vercel.json         # Server deployment config
├── package.json            # Root monorepo configuration
├── .gitignore              # Git ignore rules
└── README.md              # Main documentation
```

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git** for version control

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/dhiraj-rajput/quiz-portal.git
cd quiz-portal

# Install root dependencies (includes concurrently for running both apps)
npm install

# Install dependencies for both client and server
npm run install:all
```

### Step 2: Environment Configuration

#### Server Environment (.env in server folder)
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/quiz-portal
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-portal

# JWT Configuration (IMPORTANT: Use strong secrets in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Email Configuration (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS/OTP Configuration (Optional)
OTP_API_KEY=your-sms-api-key
OTP_SENDER_ID=your-sender-id
```

#### Client Environment (.env in client folder)
```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:
```env
# Environment Configuration
VITE_NODE_ENV=development

# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Server Configuration (for reference)
VITE_SERVER_HOST=localhost
VITE_SERVER_PORT=5000
VITE_SERVER_PROTOCOL=http
```

### Step 3: Database Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. The application will automatically create the database and collections

#### Option B: MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `server/.env`

### Step 4: Start Development Servers

From the root directory:
```bash
# Start both client and server simultaneously
npm run dev
```

Or start them individually:
```bash
# Start only the backend server
npm run dev:server

# Start only the frontend (in another terminal)
npm run dev:client
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api/health

## 🏗️ Production Build

### Build both applications:
```bash
# Build both client and server
npm run build

# Or build individually
npm run build:client
npm run build:server
```

### Test production build:
```bash
# In client directory
cd client
npm run preview

# In server directory (separate terminal)
cd server
npm start
```

## 🌐 Deployment

### Vercel Deployment (Recommended)

#### Deploy Server (API)
1. **Prepare server for deployment:**
```bash
cd server
```

2. **Create production environment variables on Vercel:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `server/.env.example`
   - **Important**: Use strong, unique values for JWT secrets

3. **Deploy:**
```bash
# Deploy from server directory
vercel --prod
```

#### Deploy Client (Frontend)
1. **Prepare client for deployment:**
```bash
cd client
```

2. **Update client environment variables:**
   - Update `VITE_API_URL` to point to your deployed server
   - Example: `VITE_API_URL=https://your-api-domain.vercel.app/api`

3. **Deploy:**
```bash
# Deploy from client directory
vercel --prod
```

### Alternative Deployment Options

#### Option 1: Single Vercel Project (Monorepo)
Deploy both as a single project with proper routing:
```bash
# From root directory
vercel --prod
```

#### Option 2: Traditional Hosting
- **Frontend**: Build and deploy to any static hosting (Netlify, Vercel, AWS S3)
- **Backend**: Deploy to any Node.js hosting (Heroku, Railway, DigitalOcean)

## 🔧 Development Commands

### Root Level Commands (Monorepo)
```bash
npm run dev              # Start both client and server
npm run dev:client       # Start frontend only
npm run dev:server       # Start backend only
npm run build           # Build both applications
npm run build:client    # Build frontend only
npm run build:server    # Build backend only
npm run install:all     # Install all dependencies
npm run clean           # Clean all node_modules and build files
```

### Client Specific Commands
```bash
cd client
npm run dev             # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Server Specific Commands
```bash
cd server
npm run dev             # Start development server with hot reload
npm run build           # TypeScript compilation (if needed)
npm start               # Start production server
```

## 🔐 Security Considerations

### Environment Variables
- **Never commit `.env` files** to version control
- Use strong, unique JWT secrets (32+ characters)
- Rotate secrets regularly in production
- Use MongoDB Atlas IP whitelist for production

### API Security
- CORS is configured for the frontend domain
- Rate limiting is implemented for sensitive endpoints
- Input validation and sanitization
- JWT token expiration and refresh mechanism

### File Upload Security
- File type validation
- File size limits
- Secure file storage location
- Virus scanning (recommended for production)

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 5000 (server)
npx kill-port 5000

# Kill process on port 5173 (client)
npx kill-port 5173
```

#### MongoDB Connection Issues
- Check MongoDB service is running
- Verify connection string format
- Check firewall/network settings
- For Atlas: Verify IP whitelist and credentials

#### Build Failures
```bash
# Clear node_modules and reinstall
npm run clean
npm run install:all

# Clear npm cache
npm cache clean --force
```

#### CORS Errors
- Verify `CORS_ORIGIN` in server environment
- Check API URL in client environment
- Ensure both servers are running

## 📚 Additional Resources

- [Client Documentation](./client/README.md)
- [Server Documentation](./server/README.md)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** in the appropriate directory (client or server)
4. **Test locally** with `npm run dev`
5. **Commit changes**: `git commit -m "Add your feature"`
6. **Push to branch**: `git push origin feature/your-feature`
7. **Create a Pull Request**

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
