import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import { connectDB } from './utils/database';
import { createDatabaseIndexes, configureDatabaseOptimizations } from './utils/databaseOptimization';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import WebSocketService from './utils/websocket';
import EmailService from './utils/emailService';
import AnalyticsService from './utils/analyticsService';

// Route imports
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import studentRoutes from './routes/student';
import moduleRoutes from './routes/modules';
import testRoutes from './routes/tests';
import fileRoutes from './routes/files';
import analyticsRoutes from './routes/analytics';
import monitoringRoutes from './routes/monitoring';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);

// Initialize services
const webSocketService = new WebSocketService(server);
const emailService = new EmailService();
const analyticsService = new AnalyticsService();

// Make services globally available via Express types
declare global {
  namespace Express {
    interface Application {
      webSocket: WebSocketService;
      emailService: EmailService;
      analyticsService: AnalyticsService;
    }
  }
}

app.webSocket = webSocketService;
app.emailService = emailService;
app.analyticsService = analyticsService;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression
app.use(compression());

// Logging
app.use(process.env.NODE_ENV === 'development' ? morgan('dev') : morgan('combined'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter (relaxed for development)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased to 1000
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
app.set('trust proxy', 1);

// Only apply rate limiting in production
if (process.env.NODE_ENV !== 'development') {
  app.use(limiter);
  console.log('🚦 Rate limiting enabled for production');
} else {
  console.log('🚦 Rate limiting disabled for development');
}

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Serve uploads
app.use('/uploads', express.static('uploads'));

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// ---------- 🛠 START SERVER LOGIC WRAPPED ASYNC ----------
async function startServer() {
  try {
    await connectDB(); // 🟢 Ensure DB is connected first
    console.log('✅ MongoDB connected');

    await configureDatabaseOptimizations(); // optional pre-optimizations
    await createDatabaseIndexes(); // 🟢 Safe to create indexes now

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server initialized`);
      console.log(`✅ MongoDB Connected: ${process.env.MONGODB_URI?.includes('localhost') ? 'localhost' : 'remote'}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); // 🚀 Run startup sequence

// ---------- Error Handling for crashes ----------
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

export default app;
