import { body, param, query } from 'express-validator/lib/middlewares/validation-chain-builders.js';


// Module validation
export const validateCreateModule = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
];

export const validateUpdateModule = [
  param('id')
    .isMongoId()
    .withMessage('Invalid module ID'),
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
];

export const validateAssignModule = [
  param('id')
    .isMongoId()
    .withMessage('Invalid module ID'),
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('At least one student ID is required')
    .custom((studentIds: any) => {
      if (!studentIds.every((id: any) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('All student IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),
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
];

// Test validation
export const validateCreateTest = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('instructions')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Instructions must be between 1 and 2000 characters'),
  body('timeLimit')
    .isInt({ min: 15, max: 180 })
    .withMessage('Time limit must be between 15 and 180 minutes'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*.question')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question text must be between 1 and 1000 characters'),
  body('questions.*.options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Each question must have between 2 and 6 options'),
  body('questions.*.options.*.text')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Option text must be between 1 and 200 characters'),
  body('questions.*.options.*.isCorrect')
    .isBoolean()
    .withMessage('isCorrect must be a boolean'),
  body('questions.*.points')
    .isInt({ min: 1, max: 10 })
    .withMessage('Points must be between 1 and 10'),
  body('questions')
    .custom((questions: any) => {
      // Validate that each question has exactly one correct answer
      for (let i = 0; i < questions.length; i++) {
        const correctOptions = questions[i].options.filter((opt: any) => opt.isCorrect);
        if (correctOptions.length !== 1) {
          throw new Error(`Question ${i + 1} must have exactly one correct answer`);
        }
      }
      return true;
    }),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
];

export const validateUpdateTest = [
  param('id')
    .isMongoId()
    .withMessage('Invalid test ID'),
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
  body('instructions')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Instructions must be between 1 and 2000 characters'),
  body('timeLimit')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Time limit must be between 15 and 180 minutes'),
  body('questions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*.question')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question text must be between 1 and 1000 characters'),
  body('questions.*.options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('Each question must have between 2 and 6 options'),
  body('questions.*.options.*.text')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Option text must be between 1 and 200 characters'),
  body('questions.*.options.*.isCorrect')
    .optional()
    .isBoolean()
    .withMessage('isCorrect must be a boolean'),
  body('questions.*.points')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Points must be between 1 and 10'),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
];

export const validateAssignTest = [
  param('id')
    .isMongoId()
    .withMessage('Invalid test ID'),
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('At least one student ID is required')
    .custom((studentIds: any) => {
      if (!studentIds.every((id: any) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('All student IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value: any) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('timeLimit')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Time limit must be between 15 and 180 minutes'),
  body('maxAttempts')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Max attempts must be between 1 and 5'),
];

export const validateSubmitTest = [
  param('id')
    .isMongoId()
    .withMessage('Invalid test ID'),
  body('answers')
    .isArray({ min: 1 })
    .withMessage('At least one answer is required'),
  body('answers.*.questionId')
    .isMongoId()
    .withMessage('Invalid question ID'),
  body('answers.*.selectedOptionId')
    .isMongoId()
    .withMessage('Invalid option ID'),
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a positive number'),
  body('startedAt')
    .optional()
    .isISO8601()
    .withMessage('Started at must be a valid date'),
];

// Common validation
export const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

export const validateFileId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid module ID'),
  param('fileId')
    .isMongoId()
    .withMessage('Invalid file ID'),
];

// Query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt'])
    .withMessage('Sort by must be one of: title, createdAt, updatedAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];
