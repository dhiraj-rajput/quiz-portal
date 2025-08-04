import express from 'express';
import { sendOTP, verifyOTP, resendOTP } from '../controllers/otpController';
import { createRateLimiter } from '../middleware/rateLimiting';

const router = express.Router();

// Apply rate limiting to OTP endpoints (stricter limits)
const otpRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many OTP requests from this IP, please try again later.'
});

router.use(otpRateLimit);

// Send OTP to phone number
router.post('/send', sendOTP);

// Verify OTP
router.post('/verify', verifyOTP);

// Resend OTP
router.post('/resend', resendOTP);

export default router;
