# Quiz Portal - MERN Stack Application

A comprehensive quiz management system built with MongoDB, Express.js, React, Node.js, and TypeScript.

## 🌐 Live Demo

- **Frontend**: [Vercel Deployment URL]
- **Backend API**: [Render Deployment URL]

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
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
   cp client/.env.example client/.env

   # Update environment variables in server/.env and client/.env
   ```

4. **Start the application**
   ```bash
   # Start backend server (from project root)
   cd server
   npm run dev

   # Start frontend server (from project root, new terminal)
   npm run dev
   ```

5. **Seed the database (optional)**
   ```bash
   cd server
   npm run seed
   ```

## 🏗️ Project Structure

```
quiz-portal/
├── client/         # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── ...
├── server/         # Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── index.ts
│   ├── uploads/
│   ├── package.json
│   └── ...
└── README.md
```

## 🚀 Features

### Admin
- Dashboard with system statistics
- User management (approve/reject, assign sub-admins)
- Module management (create, edit, delete, upload files)
- Test management (create, edit, assign, analytics)
- Assignment of modules/tests to students
- Analytics and reporting

### Student
- Dashboard with personal progress
- View assigned modules and resources
- Take assigned tests/quizzes
- View results and feedback
- Manage profile

### Common
- JWT authentication (access/refresh tokens)
- Role-based access control
- File upload (PDF, DOCX, PPTX, MP4, etc.)
- Real-time notifications (Socket.io)
- Responsive UI (Tailwind CSS)
- Dark/Light mode support

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/update-password` - Change password

### Admin Management
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/pending-requests` - List pending registrations
- `PUT /api/admin/approve-user/:id` - Approve user
- `DELETE /api/admin/reject-user/:id` - Reject user

### Module Management
- `GET /api/modules` - List modules
- `POST /api/modules` - Create module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module
- `POST /api/modules/:id/assign` - Assign module to students

### Test Management
- `GET /api/tests` - List tests
- `POST /api/tests` - Create test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test
- `POST /api/tests/:id/assign` - Assign test to students

### File Management
- `GET /api/files/modules/:moduleId/:fileName` - View/stream module file
- `GET /api/files/modules/:moduleId/:fileName/download` - Download module file

## 🔧 Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quiz-portal
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
UPLOAD_DIR=uploads
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@quizportal.com or join our Slack channel.
