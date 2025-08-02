import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Enhanced rate limiting for different endpoints
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req: Request, res: Response) => {
      console.log(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Strict rate limiting for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '300000'), // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '5'), // 5 attempts per 5 minutes
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// General API rate limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per 15 minutes
  message: 'API rate limit exceeded. Please slow down your requests.',
});

// Strict rate limiting for password reset
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 3600000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  skipFailedRequests: true,
});

// File upload rate limiter
export const uploadRateLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Too many file uploads. Please wait before uploading more files.',
});

// Admin operations rate limiter
export const adminRateLimiter = createRateLimiter({
  windowMs: 300000, // 5 minutes
  max: 50, // 50 admin operations per 5 minutes
  message: 'Too many admin operations. Please slow down.',
});

// Test submission rate limiter
export const testSubmissionRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 1, // 1 submission per minute
  message: 'Please wait before submitting another test.',
});

// Analytics rate limiter (for expensive queries)
export const analyticsRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 10, // 10 analytics requests per minute
  message: 'Too many analytics requests. Please wait before requesting more data.',
});

export default {
  authRateLimiter,
  apiRateLimiter,
  passwordResetRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
  testSubmissionRateLimiter,
  analyticsRateLimiter,
  createRateLimiter,
};
