# Quiz Portal - MERN Stack Application

A comprehensive quiz management system built with MongoDB, Express.js, React, Node.js, and TypeScript.

## 🌐 Live Demo

- **Frontend**: Deploy to Vercel - [Your Deployment URL]
- **API**: Deploy to Render - [Your Deployment URL]

## 🚀 Quick Deployment

### Render (Backend) + Vercel (Frontend)
```bash
# 1. Push your code to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Follow the deployment guide
See DEPLOYMENT.md for step-by-step instructions
```

**Prerequisites**: GitHub account, Render account, Vercel account, MongoDB Atlas

## 🚀 Features

### Phase 1-6 (Completed)
- ✅ **Backend Foundation**: Express.js server with TypeScript, middleware, error handling
- ✅ **Database & Schema**: MongoDB with Mongoose, 7 collections, relationships
- ✅ **API Development**: 30+ RESTful endpoints with validation, pagination, search
- ✅ **File Management**: Upload system supporting multiple file types (PDF, DOC, PPT, etc.)
- ✅ **Frontend Integration**: React with real API calls, JWT authentication, loading states
- ✅ **Environment Variables**: Full environment configuration for deployment
- ✅ **Vercel Deployment**: Production-ready deployment configuration

### Phase 6 (In Progress)
- 🔄 **Real-time Features**: WebSocket integration for live test timers
- 🔄 **Auto-save**: Automatic saving during test sessions
- 🔄 **Analytics Dashboard**: Data visualization and aggregated statistics
- 🔄 **Email Notifications**: Automated approval/rejection emails
- 🔄 **Export Functionality**: Report generation and export

### Phase 7-8 (Planned)
- 📋 **Security & Optimization**: Rate limiting, CORS, validation, monitoring
- 📋 **Testing & Deployment**: Unit tests, Docker, CI/CD, production deployment

## 🏗️ Architecture

```
├── Frontend (React + TypeScript)
│   ├── Authentication & Authorization
│   ├── Admin Dashboard
│   ├── Student Dashboard
│   └── Real-time Features
├── Backend (Express.js + TypeScript)
│   ├── REST API (30+ endpoints)
│   ├── WebSocket Server
│   ├── File Upload System
│   └── Email Service
└── Database (MongoDB)
    ├── Users (Admin/Student)
    ├── Modules & Assignments
    ├── Tests & Results
    └── Analytics Data
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd quiz-portal
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. **Environment Setup**
```bash
# Copy environment files
cp server/.env.example server/.env
cp .env.example .env

# Update environment variables in server/.env
```

4. **Start the application**
```bash
# Start backend server (from project root)
cd server
npm run dev

# Start frontend server (from project root, new terminal)
npm run dev
```

5. **Seed the database**
```bash
cd server
npm run seed
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Admin Management
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Module Management
- `GET /api/modules` - List modules
- `POST /api/modules` - Create module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

### Test Management
- `GET /api/tests` - List tests
- `POST /api/tests` - Create test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test

### File Management
- `POST /api/files/upload` - Upload files
- `GET /api/files/:id` - Download file

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Socket.io Client** for real-time features

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.io** for WebSocket
- **Multer** for file uploads
- **Nodemailer** for email services

### Development Tools
- **ESLint** & **Prettier** for code quality
- **Husky** for git hooks
- **Jest** for testing
- **Docker** for containerization

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:
- Access tokens (15 minutes expiry)
- Refresh tokens (7 days expiry)
- Role-based access control (Admin/Student)

### Default Test Accounts
- **Admin**: admin@quiz.com / password123
- **Student**: student@quiz.com / password123

## 📊 Database Schema

### Collections
1. **users** - User accounts and profiles
2. **modules** - Course modules
3. **moduleassignments** - Module assignments to students
4. **mocktests** - Test definitions
5. **testassignments** - Test assignments to students
6. **testresults** - Test submission results
7. **pendingrequests** - Admin approval requests

## 🌐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quiz-portal
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
BCRYPT_SALT_ROUNDS=12
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🚀 Deployment

### Deploy to Vercel

This project is configured for easy deployment to Vercel:

1. **Deploy Backend**:
   ```bash
   cd server
   npx vercel --prod
   ```

2. **Deploy Frontend**:
   ```bash
   npx vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Production Requirements

- **MongoDB Atlas**: Cloud database for production
- **Email Service**: Gmail or SMTP provider
- **Environment Variables**: All secrets configured in Vercel
- **Domain Names**: Optional custom domains

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@quizportal.com or join our Slack channel.
