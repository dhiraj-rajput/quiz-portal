import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { connectDB } from '../src/utils/database';
import { createDatabaseIndexes, configureDatabaseOptimizations } from '../src/utils/databaseOptimization';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import { getCorsOrigins, serverConfig } from '../src/utils/config';
import EmailService from '../src/utils/emailService';
import AnalyticsService from '../src/utils/analyticsService';

// Route imports
import authRoutes from '../src/routes/auth';
import adminRoutes from '../src/routes/admin';
import studentRoutes from '../src/routes/student';
import testRoutes from '../src/routes/tests';
import moduleRoutes from '../src/routes/modules';
import fileRoutes from '../src/routes/files';
import analyticsRoutes from '../src/routes/analytics';
import notificationRoutes from '../src/routes/notifications';
import otpRoutes from '../src/routes/otp';
import forgotPasswordRoutes from '../src/routes/forgotPassword';
import monitoringRoutes from '../src/routes/monitoring';

// Load environment variables
dotenv.config();

const app = express();

// Initialize services
const emailService = new EmailService();
const analyticsService = new AnalyticsService();

// Make services globally available via Express types
declare global {
  namespace Express {
    interface Application {
      emailService: EmailService;
      analyticsService: AnalyticsService;
    }
  }
}

// Attach services to app
app.emailService = emailService;
app.analyticsService = analyticsService;

// Initialize database connection (for serverless)
let isDBConnected = false;
const initializeDB = async () => {
  if (!isDBConnected) {
    await connectDB();
    await createDatabaseIndexes();
    await configureDatabaseOptimizations();
    isDBConnected = true;
  }
};

// ---------- Security & Middleware ----------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression
app.use(compression());

// Request logging
if (serverConfig.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: serverConfig.RATE_LIMIT_WINDOW_MS,
  max: serverConfig.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Routes ----------
// Health check for Vercel
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Quiz Portal API is running on Vercel!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: serverConfig.NODE_ENV,
    version: '1.0.0'
  });
});

// Debug endpoint for troubleshooting
app.get('/api/debug', (_req, res) => {
  res.json({
    message: 'Debug endpoint',
    environment: serverConfig.NODE_ENV,
    hasMongoUri: !!serverConfig.MONGODB_URI,
    timestamp: new Date().toISOString(),
    status: 'API is working'
  });
});

// API Routes with database initialization
app.use('/api/auth', async (_req, _res, next) => {
  await initializeDB();
  next();
}, authRoutes);

app.use('/api/admin', async (_req, _res, next) => {
  await initializeDB();
  next();
}, adminRoutes);

app.use('/api/student', async (_req, _res, next) => {
  await initializeDB();
  next();
}, studentRoutes);

app.use('/api/tests', async (_req, _res, next) => {
  await initializeDB();
  next();
}, testRoutes);

app.use('/api/modules', async (_req, _res, next) => {
  await initializeDB();
  next();
}, moduleRoutes);

app.use('/api/files', async (_req, _res, next) => {
  await initializeDB();
  next();
}, fileRoutes);

app.use('/api/analytics', async (_req, _res, next) => {
  await initializeDB();
  next();
}, analyticsRoutes);

app.use('/api/notifications', async (_req, _res, next) => {
  await initializeDB();
  next();
}, notificationRoutes);

app.use('/api/otp', async (_req, _res, next) => {
  await initializeDB();
  next();
}, otpRoutes);

app.use('/api/forgot-password', async (_req, _res, next) => {
  await initializeDB();
  next();
}, forgotPasswordRoutes);

app.use('/health', monitoringRoutes);

// ---------- Error Handling ----------
app.use(notFound);
app.use(errorHandler);

// Export for Vercel
export default app;
