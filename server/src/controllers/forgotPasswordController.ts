import { Request, Response } from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Step 1: Check if user exists by email and allow password reset
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

    // Generate a reset token for password reset
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store the reset token in user record with expiration
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified. You can now reset your password.',
      data: {
        resetToken: resetToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
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

// Legacy endpoints for backward compatibility (now simplified)
export const sendForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  // Redirect to initiate forgot password since we no longer use OTP
  await initiateForgotPassword(req, res);
};

export const verifyForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  // Redirect to initiate forgot password since we no longer use OTP
  await initiateForgotPassword(req, res);
};

// Reset password
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

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters long',
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

    // Update user password and clear reset token
    user.password = newPassword; // Will be hashed by pre-save middleware
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

// Legacy endpoint for backward compatibility
export const resendForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  // Redirect to initiate forgot password since we no longer use OTP
  await initiateForgotPassword(req, res);
};