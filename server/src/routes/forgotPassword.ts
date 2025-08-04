import express from 'express';
import { 
  initiateForgotPassword, 
  sendForgotPasswordOTP, 
  verifyForgotPasswordOTP, 
  resetPassword,
  resendForgotPasswordOTP
} from '../controllers/forgotPasswordController';
import { createRateLimiter } from '../middleware/rateLimiting';

const router = express.Router();

// Apply rate limiting to forgot password endpoints
const forgotPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per window
  message: 'Too many forgot password requests from this IP, please try again later.'
});

router.use(forgotPasswordRateLimit);

// Step 1: Check if user exists by email
router.post('/initiate', initiateForgotPassword);

// Step 2: Send OTP to user's phone
router.post('/send-otp', sendForgotPasswordOTP);

// Step 3: Verify OTP
router.post('/verify-otp', verifyForgotPasswordOTP);

// Step 4: Reset password
router.post('/reset', resetPassword);

// Resend OTP
router.post('/resend-otp', resendForgotPasswordOTP);

export default router;
