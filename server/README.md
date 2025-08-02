# Quiz Portal Server

Backend API for the Comprehensive Quiz Portal Application built with Node.js, Express, and MongoDB.

## Features Implemented

### ✅ **Phase 1: Backend Foundation Complete**
- Express.js server with TypeScript
- MongoDB connection with Mongoose
- JWT-based authentication system
- Role-based authorization (admin/student)
- Password hashing with bcrypt (12 salt rounds)
- Input validation with express-validator
- Error handling middleware
- Security middleware (helmet, CORS, rate limiting)
- Request logging with Morgan

### ✅ **Phase 2: Database & Schema Complete**
- **Complete Database Schema** with 7 collections:
  - `users` - Approved users with roles
  - `pendingrequests` - Registration requests awaiting approval
  - `modules` - Learning materials with file attachments
  - `mocktests` - Quiz questions and test configurations  
  - `testassignments` - Assigned tests to students
  - `testresults` - Student test submissions and scores
  - `moduleassignments` - Assigned modules to students

- **Admin Approval Workflow**:
  - View pending registration requests with pagination/search
  - Approve users with role assignment (admin/student)
  - Reject registrations with optional reason
  - User management dashboard with statistics
  - Bulk user operations and filtering

- **Student Dashboard**:
  - Overview of assigned modules and tests
  - Progress tracking and completion status
  - Recent test results and upcoming deadlines
  - Performance analytics

### ✅ **Phase 3: API Development Complete**
- **Module Management APIs**:
  - Create, read, update, delete modules with file attachments
  - File upload support (PDF, MP4, DOC, DOCX, PPT, PPTX, TXT, XLS, XLSX)
  - Assign modules to students with due dates
  - File serving and download endpoints with access control
  - Pagination, search, and filtering capabilities

- **Test Management APIs**:
  - Create, update, delete quiz tests with multiple-choice questions
  - Publish/unpublish tests for availability control
  - Assign tests to students with attempt limits and deadlines
  - Test-taking interface for students with time limits
  - Automatic scoring and result calculation
  - Comprehensive test result tracking and analytics

- **File Management**:
  - Secure file upload with validation (50MB limit per file)
  - File serving with proper MIME types and access control
  - Download endpoints for module files
  - Automatic file cleanup and organization

- **Advanced Features**:
  - Role-based access control for all endpoints
  - Input validation with comprehensive error messages
  - Pagination and search across all list endpoints
  - Real-time test submission with immediate scoring
  - Attempt tracking and deadline enforcement

## Database Models

### User Collection
```javascript
{
  firstName: String (required, max 50)
  lastName: String (required, max 50)
  email: String (required, unique, validated)
  password: String (required, hashed, min 8)
  role: String (enum: admin/student)
  status: String (enum: active/inactive)  
  admissionDate: Date (required, not future)
  createdAt: Date
  updatedAt: Date
}
```

### Module Collection
```javascript
{
  title: String (required, max 100)
  description: String (required, max 500)
  files: [ModuleFile] (PDF, MP4, DOCX, PPTX)
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date
}
```

### MockTest Collection  
```javascript
{
  title: String (required, max 100)
  instructions: String (required, max 2000)
  description: String (required, max 500)
  questions: [Question] (multiple choice, 2-6 options)
  totalQuestions: Number (auto-calculated)
  totalPoints: Number (auto-calculated)
  timeLimit: Number (15-180 minutes)
  isPublished: Boolean
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date
}
```

### TestAssignment Collection
```javascript
{
  testId: ObjectId (ref: MockTest)
  assignedTo: [ObjectId] (ref: User)
  dueDate: Date (required, future)
  timeLimit: Number (15-180 minutes)
  maxAttempts: Number (1-5)
  isActive: Boolean
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date  
}
```

### TestResult Collection
```javascript
{
  userId: ObjectId (ref: User)
  testId: ObjectId (ref: MockTest)
  assignmentId: ObjectId (ref: TestAssignment)
  answers: [Answer] (question responses)
  score: Number (auto-calculated)
  percentage: Number (auto-calculated)
  totalQuestions: Number
  correctAnswers: Number (auto-calculated)
  timeSpent: Number (seconds)
  submittedAt: Date
  attemptNumber: Number (1-based)
  isCompleted: Boolean
  startedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

## Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on localhost:27017
   # Or update MONGODB_URI in .env
   ```

4. **Seed Database (Optional)**
   ```bash
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Server will run on http://localhost:5000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with test data
- `npm run lint` - Run ESLint

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user (creates pending request) | No |
| POST | `/login` | Login user and get JWT token | No |
| POST | `/refresh-token` | Get new access token | No |
| POST | `/logout` | Logout user | Yes |
| GET | `/me` | Get current user profile | Yes |
| PATCH | `/update-password` | Update user password | Yes |

### Admin Management (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/pending-requests` | Get pending registration requests | Admin |
| POST | `/approve-user/:id` | Approve user registration | Admin |
| POST | `/reject-user/:id` | Reject user registration | Admin |
| GET | `/users` | Get all users with pagination | Admin |
| GET | `/stats` | Get dashboard statistics | Admin |

### Module Management (`/api/modules`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all modules (paginated, filtered) | Yes |
| GET | `/:id` | Get single module by ID | Yes |
| POST | `/` | Create new module with files | Admin |
| PUT | `/:id` | Update module and add files | Admin |
| DELETE | `/:id` | Delete module | Admin |
| POST | `/:id/assign` | Assign module to students | Admin |
| DELETE | `/:id/files/:fileId` | Remove file from module | Admin |

### Test Management (`/api/tests`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all tests (paginated, filtered) | Yes |
| GET | `/:id` | Get single test details | Yes |
| GET | `/:id/take` | Get test for taking (students only) | Student |
| GET | `/:id/results` | Get test results | Yes |
| POST | `/` | Create new test | Admin |
| PUT | `/:id` | Update test | Admin |
| DELETE | `/:id` | Delete test | Admin |
| POST | `/:id/assign` | Assign test to students | Admin |
| POST | `/:id/submit` | Submit test answers | Student |

### File Management (`/api/files`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/modules/:moduleId/:fileName` | View/stream module file | Yes |
| GET | `/modules/:moduleId/:fileName/download` | Download module file | Yes |

### Student Dashboard (`/api/student`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard` | Get student dashboard data | Student |
| GET | `/assignments` | Get assigned modules and tests | Student |
| GET | `/results` | Get test results | Student |

### Registration Validation

- **firstName**: 1-50 characters, required
- **lastName**: 1-50 characters, required
- **email**: Valid email format, unique
- **password**: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- **confirmPassword**: Must match password
- **admissionDate**: Valid date, not in future

### Example API Usage

**Register User:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "admissionDate": "2024-01-15"
}
```

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@quiz.com",
  "password": "Admin123!"
}
```

**Create Module with Files:**
```bash
POST /api/modules
Authorization: Bearer <admin-jwt-token>
Content-Type: multipart/form-data

{
  "title": "Introduction to JavaScript",
  "description": "Basic JavaScript concepts and syntax",
  "files": [file1.pdf, file2.mp4]
}
```

**Create Test:**
```bash
POST /api/tests
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "title": "JavaScript Basics Quiz",
  "description": "Test your knowledge of JavaScript fundamentals",
  "instructions": "Choose the best answer for each question. You have 30 minutes.",
  "timeLimit": 30,
  "questions": [
    {
      "question": "What is the correct way to declare a variable in JavaScript?",
      "options": [
        { "text": "var myVar;", "isCorrect": false },
        { "text": "let myVar;", "isCorrect": true },
        { "text": "variable myVar;", "isCorrect": false },
        { "text": "declare myVar;", "isCorrect": false }
      ],
      "points": 2
    }
  ],
  "isPublished": true
}
```

**Assign Test to Students:**
```bash
POST /api/tests/:testId/assign
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "studentIds": ["676d123456789abcdef01234", "676d123456789abcdef01235"],
  "dueDate": "2024-12-31T23:59:59.000Z",
  "timeLimit": 45,
  "maxAttempts": 2
}
```

**Submit Test Answers (Student):**
```bash
POST /api/tests/:testId/submit
Authorization: Bearer <student-jwt-token>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "676d123456789abcdef01236",
      "selectedOptionId": "676d123456789abcdef01237"
    }
  ],
  "timeSpent": 1800,
  "startedAt": "2024-12-15T10:00:00.000Z"
}
```

**Get Student Dashboard:**
```bash
GET /api/student/dashboard
Authorization: Bearer <student-jwt-token>
```

## Test Accounts (After Seeding)

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@quiz.com | Admin123! |
| Student | student@quiz.com | Student123! |
| Pending | jane.smith@quiz.com | Password123! |

## Environment Variables

Key variables in `.env`:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origins
- `BCRYPT_SALT_ROUNDS` - Password hashing rounds (default: 12)

## Security Features

- Password hashing with bcrypt (12+ salt rounds)
- JWT token authentication with refresh mechanism
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- MongoDB injection protection

## Database Schema

### User Collection
```javascript
{
  firstName: String (required, max 50)
  lastName: String (required, max 50)
  email: String (required, unique, validated)
  password: String (required, hashed, min 8)
  role: String (enum: admin/student)
  status: String (enum: active/inactive)
  admissionDate: Date (required, not future)
  createdAt: Date
  updatedAt: Date
}
```

### PendingRequest Collection
```javascript
{
  firstName: String (required, max 50)
  lastName: String (required, max 50)
  email: String (required, unique, validated)
  password: String (required, hashed, min 8)
  admissionDate: Date (required, not future)
  status: String (always 'pending')
  createdAt: Date
  updatedAt: Date
}
```

## Next Steps (Phase 4)

### Frontend Implementation
- React.js dashboard for admins
- Student portal for taking tests and viewing modules  
- File upload interface for module creation
- Real-time test taking with timer functionality
- Results visualization and analytics charts

### Advanced Features
- Email notifications for test assignments and results
- Bulk operations for student management
- Test analytics and reporting
- Module completion tracking
- Advanced search and filtering options

### Production Optimizations
- Redis caching for better performance
- File storage optimization (AWS S3 integration)
- Comprehensive test suite with Jest
- API documentation with Swagger
- Docker containerization for deployment

## Error Handling

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "stack": "..." // Only in development
  }
}
```

## Health Check

Monitor server health at:
```
GET /health
```

Returns server status, uptime, and environment info.
