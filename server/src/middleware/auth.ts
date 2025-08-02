import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import User from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'student';
    firstName: string;
    lastName: string;
  };
}

export const protect = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new AppError('Not authorized, no token provided', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if user still exists
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // Check if user is active
    if (currentUser.status !== 'active') {
      return next(new AppError('Your account is not active. Please contact support.', 401));
    }

    // Grant access to protected route
    req.user = {
      id: currentUser._id.toString(),
      email: currentUser.email,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    };

    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Alias for restrictTo for better readability
export const authorize = (...roles: string[]) => restrictTo(...roles);

export const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h', // Changed from 1h to 24h for longer sessions
  } as jwt.SignOptions);
};

export const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};
