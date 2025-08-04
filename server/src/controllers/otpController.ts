import { Request, Response } from 'express';
import OTPVerification from '../models/OTPVerification.js';
import User from '../models/User.js';
import otpService from '../utils/otpService.js';

// Send OTP
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          code: 'PHONE_REQUIRED'
        }
      });
      return;
    }

    // Validate phone number format
    const validation = otpService.validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: validation.message,
          code: 'INVALID_PHONE'
        }
      });
      return;
    }

    // Check if phone number is already registered and verified
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser && existingUser.phoneVerified) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is already registered and verified',
          code: 'PHONE_ALREADY_VERIFIED'
        }
      });
      return;
    }

    // Check for recent OTP requests (rate limiting)
    const recentOTP = await OTPVerification.findOne({
      phoneNumber,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
    });

    if (recentOTP) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Please wait 2 minutes before requesting another OTP',
          code: 'RATE_LIMITED'
        }
      });
      return;
    }

    // Generate OTP
    const otp = otpService.generateOTP();

    // Save OTP to database
    const otpRecord = new OTPVerification({
      phoneNumber,
      otp
    });
    await otpRecord.save();

    // Send OTP via SMS
    const smsResult = await otpService.sendOTP(phoneNumber, otp);

    if (smsResult.success) {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phoneNumber,
          expiresAt: otpRecord.expiresAt,
        },
      });
    } else {
      // Clean up failed OTP record
      await OTPVerification.findByIdAndDelete(otpRecord._id);
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send OTP',
          code: 'SMS_SEND_FAILED'
        }
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Phone number and OTP are required',
          code: 'MISSING_FIELDS'
        }
      });
      return;
    }

    // Find the most recent OTP for this phone number
    const otpRecord = await OTPVerification.findOne({
      phoneNumber,
      verified: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No pending OTP found for this phone number',
          code: 'OTP_NOT_FOUND'
        }
      });
      return;
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'OTP has expired. Please request a new one.',
          code: 'OTP_EXPIRED'
        }
      });
      return;
    }

    // Check if maximum attempts exceeded
    if (otpRecord.attempts >= 3) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
          code: 'MAX_ATTEMPTS_EXCEEDED'
        }
      });
      return;
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid OTP',
          code: 'INVALID_OTP',
          attemptsRemaining: 3 - otpRecord.attempts
        }
      });
      return;
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        phoneNumber,
        verified: true
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify OTP',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          code: 'PHONE_REQUIRED'
        }
      });
      return;
    }

    // Check for rate limiting (allow resend after 1 minute)
    const recentOTP = await OTPVerification.findOne({
      phoneNumber,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // 1 minute
    });

    if (recentOTP && !recentOTP.verified) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Please wait 1 minute before requesting another OTP',
          code: 'RATE_LIMITED'
        }
      });
      return;
    }

    // Call sendOTP function
    await sendOTP(req, res);
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to resend OTP',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};
