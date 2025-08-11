import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import PendingRequest from '../models/PendingRequest';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, generateToken, generateRefreshToken } from '../middleware/auth';
import { NotificationService } from '../utils/notificationService';

// Temporary mock for express-validator - TO BE REPLACED
const validationResult = (_req: any) => ({
  isEmpty: () => true,
  array: () => []
});

// Helper function to handle validation errors
const handleValidationErrors = (req: Request): string | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map((err: any) => err.msg).join(', ');
  }
  return null;
};

// @desc    Register user (creates pending request)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { firstName, lastName, email, phoneNumber, password, admissionDate } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password || !admissionDate) {
      return next(new AppError('All fields are required', 400));
    }

    // Check if user already exists in either collection
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });
    if (existingUser) {
      if (existingUser.email === email) {
        return next(new AppError('User with this email already exists', 400));
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return next(new AppError('User with this phone number already exists', 400));
      }
    }

    const existingRequest = await PendingRequest.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });
    if (existingRequest) {
      if (existingRequest.email === email) {
        return next(new AppError('Registration request already pending for this email', 400));
      }
      if (existingRequest.phoneNumber === phoneNumber) {
        return next(new AppError('Registration request already pending for this phone number', 400));
      }
    }

    // Create pending request (automatically goes to Super Admin)
    const pendingRequest = await PendingRequest.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      admissionDate,
      status: 'pending' // This will be reviewed by Super Admin first
    });

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for admin approval.',
      data: {
        id: pendingRequest._id,
        firstName: pendingRequest.firstName,
        lastName: pendingRequest.lastName,
        email: pendingRequest.email,
        phoneNumber: pendingRequest.phoneNumber,
        status: 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(new AppError('Your account is not active. Please contact support.', 401));
    }

    // Generate tokens
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        accessToken: token,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          admissionDate: user.admissionDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get new access token using refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: refreshTokenFromBody } = req.body;
    const refreshTokenFromCookie = req.cookies?.refreshToken;

    const refreshToken = refreshTokenFromBody || refreshTokenFromCookie;

    if (!refreshToken) {
      return next(new AppError('Refresh token not provided', 401));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(new AppError('Your account is not active', 401));
    }

    // Generate new access token
    const newToken = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      data: {
        accessToken: newToken,
      },
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (_req: Request, res: Response): Promise<void> => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          admissionDate: user.admissionDate,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PATCH /api/auth/update-password
// @access  Private
export const updatePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user!.id).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    const userId = req.user!.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update allowed fields only
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    // Send notification about profile update
    try {
      await NotificationService.notifyProfileUpdate(userId, `${user.firstName} ${user.lastName}`);
    } catch (notificationError) {
      console.error('Failed to send profile update notification:', notificationError);
    }

    // Return updated user data (exclude password)
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      admissionDate: user.admissionDate,
      createdAt: user.createdAt,
      phoneVerified: user.phoneVerified,
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if email exists
// @route   POST /api/auth/check-email
// @access  Public
export const checkEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Email is required', 400));
    }

    // Check if email exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(200).json({
        success: true,
        exists: true,
        message: 'Email already exists'
      });
      return;
    }

    // Check if email exists in PendingRequest collection
    const existingRequest = await PendingRequest.findOne({ email });
    if (existingRequest) {
      res.status(200).json({
        success: true,
        exists: true,
        message: 'Email has a pending registration request'
      });
      return;
    }

    res.status(200).json({
      success: true,
      exists: false,
      message: 'Email is available'
    });
  } catch (error) {
    next(error);
  }
};
