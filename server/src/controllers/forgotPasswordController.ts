import { Request, Response } from 'express';
import User from '../models/User.js';
import OTPVerification from '../models/OTPVerification.js';
import otpService from '../utils/otpService.js';
import bcrypt from 'bcryptjs';

// Step 1: Initiate forgot password - check if user exists by email
export const initiateForgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 'EMAIL_REQUIRED'
        }
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'No account found with this email address',
          code: 'USER_NOT_FOUND'
        }
      });
      return;
    }

    // Check if user has a phone number for OTP verification
    if (!user.phoneNumber) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No phone number associated with this account. Please contact administrator.',
          code: 'NO_PHONE_NUMBER'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User found. Proceed to phone verification.',
      data: {
        phoneNumber: user.phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'), // Mask phone number
        email: email
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR'
      }
    });
  }
};

// Step 2: Send OTP to user's phone number
export const sendForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 'EMAIL_REQUIRED'
        }
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.phoneNumber) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found or no phone number available',
          code: 'USER_NOT_FOUND'
        }
      });
      return;
    }

    // Rate limiting check - prevent too many OTP requests
    const recentOTP = await OTPVerification.findOne({
      phoneNumber: user.phoneNumber,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
    });

    if (recentOTP) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Please wait 2 minutes before requesting another OTP',
          code: 'TOO_MANY_REQUESTS'
        }
      });
      return;
    }

    // Generate OTP
    const otp = otpService.generateOTP();

    // Save OTP to database
    await OTPVerification.create({
      phoneNumber: user.phoneNumber,
      otp: otp,
      purpose: 'forgot_password',
      email: email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP via SMS
    const smsResult = await otpService.sendOTP(user.phoneNumber, otp);

    if (smsResult.success) {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your registered phone number',
        data: {
          phoneNumber: user.phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2')
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: smsResult.message || 'Failed to send OTP',
          code: 'OTP_SEND_FAILED'
        }
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR'
      }
    });
  }
};

// Step 3: Verify OTP
export const verifyForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email and OTP are required',
          code: 'MISSING_FIELDS'
        }
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
      return;
    }

    // Find and verify OTP
    const otpRecord = await OTPVerification.findOne({
      phoneNumber: user.phoneNumber,
      otp: otp,
      purpose: 'forgot_password',
      email: email,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired OTP',
          code: 'INVALID_OTP'
        }
      });
      return;
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Generate a temporary token for password reset
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store the reset token in user record with expiration
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        resetToken: resetToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR'
      }
    });
  }
};

// Step 4: Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: {
          message: 'All fields are required',
          code: 'MISSING_FIELDS'
        }
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH'
        }
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
          code: 'PASSWORD_TOO_SHORT'
        }
      });
      return;
    }

    // Find user with valid reset token
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: resetToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        }
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      const emailService = (req.app as any).emailService;
      await emailService.sendPasswordResetConfirmation({
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`
      });
    } catch (emailError) {
      // Don't fail the password reset if email fails
      console.warn('Failed to send password reset confirmation email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      data: {
        email: user.email
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR'
      }
    });
  }
};

// Resend OTP for forgot password
export const resendForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 'EMAIL_REQUIRED'
        }
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.phoneNumber) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found or no phone number available',
          code: 'USER_NOT_FOUND'
        }
      });
      return;
    }

    // Check rate limiting
    const recentOTP = await OTPVerification.findOne({
      phoneNumber: user.phoneNumber,
      purpose: 'forgot_password',
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) } // 1 minute
    });

    if (recentOTP) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Please wait 1 minute before requesting another OTP',
          code: 'TOO_MANY_REQUESTS'
        }
      });
      return;
    }

    // Invalidate old OTPs
    await OTPVerification.updateMany(
      { 
        phoneNumber: user.phoneNumber, 
        purpose: 'forgot_password',
        isUsed: false 
      },
      { isUsed: true }
    );

    // Generate new OTP
    const otp = otpService.generateOTP();

    // Save new OTP
    await OTPVerification.create({
      phoneNumber: user.phoneNumber,
      otp: otp,
      purpose: 'forgot_password',
      email: email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP
    const smsResult = await otpService.sendOTP(user.phoneNumber, otp);

    if (smsResult.success) {
      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully',
        data: {
          phoneNumber: user.phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2')
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: smsResult.message || 'Failed to send OTP',
          code: 'OTP_SEND_FAILED'
        }
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR'
      }
    });
  }
};
