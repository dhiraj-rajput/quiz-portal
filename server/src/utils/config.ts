// Server configuration utility
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const serverConfig = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server Configuration
  PORT: parseInt(process.env.PORT || '5000'),
  
  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-portal',
  MONGODB_URI_TEST: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/quiz-portal-test',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Security
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  
  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'Quiz Portal <noreply@quizportal.com>',
  
  // OTP Configuration
  OTP_API_URL: process.env.OTP_API_URL || 'https://control.msg91.com/api/v5/otp',
  OTP_AUTHKEY: process.env.OTP_AUTHKEY,
  OTP_SENDER_ID: process.env.OTP_SENDER_ID,
  OTP_TEMPLATE_ID: process.env.OTP_TEMPLATE_ID,
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '5'),
} as const;

// Helper functions
export const getCorsOrigins = (): string[] => {
  const origins = serverConfig.CORS_ORIGIN;
  if (origins.includes(',')) {
    return origins.split(',').map(origin => origin.trim());
  }
  return [origins, 'http://localhost:3000']; // Add additional fallback origins
};

export const buildServerUrl = (path: string = ''): string => {
  const protocol = serverConfig.NODE_ENV === 'production' ? 'https' : 'http';
  const host = serverConfig.NODE_ENV === 'production' ? 'your-domain.com' : 'localhost';
  return `${protocol}://${host}:${serverConfig.PORT}${path}`;
};

export default serverConfig;
