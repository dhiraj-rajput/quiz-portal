import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) return;
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

// Routes
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Quiz Portal API is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (_req, res) => {
  res.json({
    status: 'API endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  });
});

app.get('/api/test-db', async (_req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic auth routes (simplified for testing)
app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();
    
    // Basic response for now
    res.json({
      message: 'Login endpoint working',
      receivedData: !!req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Authentication service error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await connectDB();
    
    // Basic response for now
    res.json({
      message: 'Register endpoint working',
      receivedData: !!req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Registration service error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch all for undefined routes
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Basic error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

export default app;
