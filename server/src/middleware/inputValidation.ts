import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error: any) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
    return;
  }
  
  next();
};

// XSS Protection middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

// MongoDB injection protection (already applied globally, but can be used specifically)
export const preventMongoInjection = mongoSanitize();

// Common validation rules
export const commonValidators = {
  // MongoDB ObjectId validation
  mongoId: (field: string = 'id') => 
    param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId`),

  // Email validation
  email: body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  // Password validation
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Name validation
  name: (field: string) => 
    body(field)
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage(`${field} must be between 1 and 50 characters`)
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(`${field} must only contain letters and spaces`),

  // Role validation
  role: body('role')
    .isIn(['admin', 'student'])
    .withMessage('Role must be either admin or student'),

  // Status validation
  status: body('status')
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),

  // Date validation
  date: (field: string) =>
    body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid date`)
      .toDate(),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be a positive integer between 1 and 1000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be a positive integer between 1 and 100'),
  ],

  // Search validation
  search: query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),

  // Sort validation
  sort: [
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'admissionDate'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
};

// Specific validation chains for different endpoints
export const validationChains = {
  // Authentication
  register: [
    commonValidators.name('firstName'),
    commonValidators.name('lastName'),
    commonValidators.email,
    commonValidators.password,
    commonValidators.date('admissionDate'),
    handleValidationErrors,
  ],

  login: [
    commonValidators.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],

  // User management
  approveUser: [
    commonValidators.mongoId(),
    commonValidators.role,
    handleValidationErrors,
  ],

  rejectUser: [
    commonValidators.mongoId(),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Rejection reason must not exceed 500 characters'),
    handleValidationErrors,
  ],

  updateUser: [
    commonValidators.mongoId(),
    commonValidators.role.optional(),
    commonValidators.status.optional(),
    body().custom((value: any) => {
      if (!value.role && !value.status) {
        throw new Error('At least one field (role or status) must be provided');
      }
      return true;
    }),
    handleValidationErrors,
  ],

  // Module management
  createModule: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    handleValidationErrors,
  ],

  updateModule: [
    commonValidators.mongoId(),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    handleValidationErrors,
  ],

  // Test management
  createTest: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('instructions')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Instructions must be between 1 and 1000 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    body('timeLimit')
      .isInt({ min: 1, max: 480 })
      .withMessage('Time limit must be between 1 and 480 minutes'),
    body('questions')
      .isArray({ min: 1, max: 100 })
      .withMessage('Must have between 1 and 100 questions'),
    body('questions.*.question')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Question text must be between 1 and 500 characters'),
    body('questions.*.options')
      .isArray({ min: 2, max: 6 })
      .withMessage('Each question must have between 2 and 6 options'),
    body('questions.*.points')
      .isInt({ min: 1, max: 100 })
      .withMessage('Question points must be between 1 and 100'),
    handleValidationErrors,
  ],

  // File upload validation
  fileUpload: [
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('File description must not exceed 200 characters'),
    handleValidationErrors,
  ],

  // Assignment validation
  assignModule: [
    commonValidators.mongoId(),
    body('studentIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('Must assign to between 1 and 100 students'),
    body('studentIds.*')
      .isMongoId()
      .withMessage('Each student ID must be a valid MongoDB ObjectId'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date')
      .custom((value: any) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      }),
    handleValidationErrors,
  ],

  assignTest: [
    commonValidators.mongoId(),
    body('studentIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('Must assign to between 1 and 100 students'),
    body('studentIds.*')
      .isMongoId()
      .withMessage('Each student ID must be a valid MongoDB ObjectId'),
    body('dueDate')
      .isISO8601()
      .withMessage('Due date must be a valid date')
      .custom((value: any) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      }),
    body('maxAttempts')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Max attempts must be between 1 and 10'),
    handleValidationErrors,
  ],

  // Analytics validation
  analyticsExport: [
    param('type')
      .isIn(['users', 'tests', 'modules', 'performance'])
      .withMessage('Export type must be one of: users, tests, modules, performance'),
    handleValidationErrors,
  ],

  performanceTrends: [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter'])
      .withMessage('Period must be one of: week, month, quarter'),
    handleValidationErrors,
  ],

  // Generic list validation
  getList: [
    ...commonValidators.pagination,
    commonValidators.search,
    ...commonValidators.sort,
    handleValidationErrors,
  ],
};

// Advanced validation for complex objects
export const complexValidators = {
  // Test question validation
  validateTestQuestions: (questions: any[]): string[] => {
    const errors: string[] = [];
    
    questions.forEach((question, index) => {
      if (!question.question || question.question.trim().length === 0) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }
      
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }
      
      const correctOptions = question.options?.filter((opt: any) => opt.isCorrect) || [];
      if (correctOptions.length !== 1) {
        errors.push(`Question ${index + 1}: Must have exactly one correct option`);
      }
      
      if (!question.points || question.points < 1) {
        errors.push(`Question ${index + 1}: Points must be at least 1`);
      }
    });
    
    return errors;
  },

  // File type validation
  validateFileType: (mimetype: string): boolean => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
    ];
    
    return allowedTypes.includes(mimetype);
  },

  // Password strength validation
  validatePasswordStrength: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export default {
  handleValidationErrors,
  sanitizeInput,
  preventMongoInjection,
  commonValidators,
  validationChains,
  complexValidators,
};
