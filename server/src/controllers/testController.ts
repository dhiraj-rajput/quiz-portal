import { Request, Response, NextFunction } from 'express';
import MockTest from '../models/MockTest';
import TestAssignment from '../models/TestAssignment';
import TestResult from '../models/TestResult';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
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

// @desc    Get all tests with pagination and filtering
// @route   GET /api/tests
// @access  Private
export const getTests = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get search and filter parameters
    const search = req.query.search as string || '';
    const isPublished = req.query.isPublished as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build query
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    // Role-based filtering
    if (req.user!.role === 'student') {
      // Students: only show published tests assigned to them
      query.isPublished = true;
      
      const assignments = await TestAssignment.find({
        assignedTo: req.user!.id,
        isActive: true,
      }).select('testId');
      
      const testIds = assignments.map(assignment => assignment.testId);
      query._id = { $in: testIds };
    } else if (req.user!.role === 'sub_admin') {
      // Sub Admin: only show tests they created
      query.createdBy = req.user!.id;
    } else if (req.user!.role === 'super_admin') {
      // Super Admin: show all tests (no additional filtering needed)
      // They can see all tests in the system
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get tests with pagination
    const tests = await MockTest.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await MockTest.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        tests,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single test by ID
// @route   GET /api/tests/:id
// @access  Private
export const getTestById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const test = await MockTest.findById(id)
      .populate('createdBy', 'firstName lastName email');

    if (!test) {
      return next(new AppError('Test not found', 404));
    }

    // If user is student, check if test is assigned to them and published
    if (req.user!.role === 'student') {
      if (!test.isPublished) {
        return next(new AppError('Test is not available', 403));
      }

      const assignment = await TestAssignment.findOne({
        testId: id,
        assignedTo: req.user!.id,
        isActive: true,
      });

      if (!assignment) {
        return next(new AppError('You are not assigned to this test', 403));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test for taking (student view)
// @route   GET /api/tests/:id/take
// @access  Private (Student only)
export const getTestForTaking = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if test exists and is published
    const test = await MockTest.findById(id);
    if (!test || !test.isPublished) {
      return next(new AppError('Test not found or not available', 404));
    }

    // Check if test is assigned to student
    const assignment = await TestAssignment.findOne({
      testId: id,
      assignedTo: req.user!.id,
      isActive: true,
    });

    if (!assignment) {
      return next(new AppError('You are not assigned to this test', 403));
    }

    // Check if due date has passed
    if (assignment.dueDate && assignment.dueDate < new Date()) {
      return next(new AppError('Test submission deadline has passed', 403));
    }

    // Check previous attempts
    const previousAttempts = await TestResult.countDocuments({
      userId: req.user!.id,
      testId: id,
      isCompleted: true,
    });

    if (assignment.maxAttempts !== -1 && previousAttempts >= assignment.maxAttempts) {
      return next(new AppError('Maximum attempts reached for this test', 403));
    }

    // Return test without correct answers
    const testForStudent = {
      _id: test._id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      questions: test.questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options.map(opt => ({
          _id: opt._id,
          text: opt.text,
        })),
        points: q.points,
      })),
      totalQuestions: test.totalQuestions,
      totalPoints: test.totalPoints,
      timeLimit: assignment.timeLimit || test.timeLimit,
      assignmentId: assignment._id,
      attemptNumber: previousAttempts + 1,
      maxAttempts: assignment.maxAttempts,
      dueDate: assignment.dueDate,
    };

    res.status(200).json({
      success: true,
      data: {
        test: testForStudent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new test
// @route   POST /api/tests
// @access  Private (Admin only)
export const createTest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { title, description, instructions, questions, timeLimit, isPublished } = req.body;

    // Calculate total points and questions
    const totalQuestions = questions.length;
    const totalPoints = questions.reduce((sum: number, q: any) => sum + q.points, 0);

    // Create test
    const test = await MockTest.create({
      title,
      description,
      instructions,
      questions,
      totalQuestions,
      totalPoints,
      timeLimit,
      isPublished: isPublished || false,
      createdBy: req.user!.id,
    });

    // Populate creator info
    await test.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private (Admin only)
export const updateTest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, instructions, questions, timeLimit, isPublished } = req.body;

    // Find test
    const test = await MockTest.findById(id);
    if (!test) {
      return next(new AppError('Test not found', 404));
    }

    // Check if user is the creator or has admin privileges
    if (!['super_admin', 'sub_admin'].includes(req.user!.role) && test.createdBy.toString() !== req.user!.id) {
      return next(new AppError('You can only update tests you created', 403));
    }

    // Update fields
    if (title) test.title = title;
    if (description) test.description = description;
    if (instructions) test.instructions = instructions;
    if (timeLimit) test.timeLimit = timeLimit;
    if (isPublished !== undefined) test.isPublished = isPublished;

    if (questions) {
      test.questions = questions;
      test.totalQuestions = questions.length;
      test.totalPoints = questions.reduce((sum: number, q: any) => sum + q.points, 0);
    }

    await test.save();
    await test.populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete test
// @route   DELETE /api/tests/:id
// @access  Private (Admin only)
export const deleteTest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Find test
    const test = await MockTest.findById(id);
    if (!test) {
      return next(new AppError('Test not found', 404));
    }

    // Check if user is the creator or has admin privileges
    if (!['super_admin', 'sub_admin'].includes(req.user!.role) && test.createdBy.toString() !== req.user!.id) {
      return next(new AppError('You can only delete tests you created', 403));
    }

    // Delete related assignments and results
    await TestAssignment.deleteMany({ testId: id });
    await TestResult.deleteMany({ testId: id });

    // Delete test
    await MockTest.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Test deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test assignments
// @route   GET /api/tests/assignments
// @access  Private (Admin only)
export const getTestAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get test assignments with populated test and student data
    const assignments = await TestAssignment.find()
      .populate('testId', 'title description timeLimit totalQuestions')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TestAssignment.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignments for a specific test
// @route   GET /api/tests/:id/assignments
// @access  Private (Admin only)
export const getTestAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Find assignment for the specific test
    const assignment = await TestAssignment.findOne({ testId: id })
      .populate('testId', 'title description timeLimit totalQuestions')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: {
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign test to students
// @route   POST /api/tests/:id/assign
// @access  Private (Admin only)
export const assignTest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentIds, dueDate, timeLimit, maxAttempts } = req.body;

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return next(new AppError('At least one student ID is required', 400));
    }

    if (!dueDate) {
      return next(new AppError('Due date is required', 400));
    }

    const dueDateObj = new Date(dueDate);
    if (dueDateObj <= new Date()) {
      return next(new AppError('Due date must be in the future', 400));
    }

    // Check if test exists and is published
    const test = await MockTest.findById(id);
    if (!test) {
      return next(new AppError('Test not found', 404));
    }

    if (!test.isPublished) {
      return next(new AppError('Cannot assign unpublished test', 400));
    }

    // Validate student IDs
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      status: 'active',
    });

    if (students.length !== studentIds.length) {
      return next(new AppError('One or more invalid student IDs provided', 400));
    }

    // Create or update assignment
    const existingAssignment = await TestAssignment.findOne({ testId: id });
    
    if (existingAssignment) {
      // Update the assignment with new parameters
      existingAssignment.dueDate = dueDateObj;
      if (timeLimit) existingAssignment.timeLimit = timeLimit;
      if (maxAttempts !== undefined) existingAssignment.maxAttempts = maxAttempts;
      
      // Add new students to existing assignment
      const newStudentIds = studentIds.filter(
        (studentId: string) => !existingAssignment.assignedTo.map(id => id.toString()).includes(studentId)
      );
      
      if (newStudentIds.length > 0) {
        existingAssignment.assignedTo.push(...newStudentIds);
      }
      
      await existingAssignment.save();
    } else {
      // Create new assignment
      await TestAssignment.create({
        testId: id,
        assignedTo: studentIds,
        createdBy: req.user!.id,
        dueDate: dueDateObj,
        timeLimit: timeLimit || test.timeLimit,
        maxAttempts: maxAttempts || 1,
      });
    }

    // Send notifications to assigned students
    try {
      for (const student of students) {
        await NotificationService.notifyTestAssignment(student._id.toString(), test.title, dueDateObj);
      }
    } catch (notificationError) {
      console.error('Failed to send test assignment notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Test assigned successfully',
      data: {
        testId: id,
        assignedStudents: students.length,
        dueDate: dueDateObj,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit test answers
// @route   POST /api/tests/:id/submit
// @access  Private (Student only)
export const submitTest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    let { answers, timeSpent, startedAt, authToken } = req.body;

    // Handle beacon submissions - authToken in payload means this is a beacon submission
    if (authToken && !req.user) {
      // For beacon submissions, we need to verify the token manually
      try {
        const jwt = require('jsonwebtoken');
        const User = require('../models/User').default;
        
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new AppError('Invalid token - user not found', 401));
        }
        
        // Set the user for the rest of the function
        req.user = user;
      } catch (tokenError) {
        console.error('Beacon token validation failed:', tokenError);
        return next(new AppError('Invalid authentication token', 401));
      }
    }

    // Validate input
    if (!answers || !Array.isArray(answers)) {
      return next(new AppError('Answers are required', 400));
    }

    // Get test and assignment
    const test = await MockTest.findById(id);
    if (!test || !test.isPublished) {
      return next(new AppError('Test not found or not available', 404));
    }

    const assignment = await TestAssignment.findOne({
      testId: id,
      assignedTo: req.user!.id,
      isActive: true,
    });

    if (!assignment) {
      return next(new AppError('You are not assigned to this test', 403));
    }

    // Check if due date has passed
    if (assignment.dueDate && assignment.dueDate < new Date()) {
      return next(new AppError('Test submission deadline has passed', 403));
    }

    // Check previous completed attempts for max attempts validation
    const completedAttempts = await TestResult.countDocuments({
      userId: req.user!.id,
      testId: id,
      isCompleted: true,
    });

    if (assignment.maxAttempts !== -1 && completedAttempts >= assignment.maxAttempts) {
      return next(new AppError('Maximum attempts reached for this test', 403));
    }

    // Remove any incomplete attempts for this user and test to avoid conflicts
    await TestResult.deleteMany({
      userId: req.user!.id,
      testId: id,
      isCompleted: false,
    });

    // Get the next attempt number based on completed attempts only
    const nextAttemptNumber = completedAttempts + 1;

    // Calculate score and transform answers for storage
    let correctAnswers = 0;
    let score = 0;

    const processedAnswers = answers.map((answer: any) => {
      const question = test.questions.find(q => q._id!.toString() === answer.questionId);
      if (!question) {
        return {
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer || 0,
          isCorrect: false,
          pointsEarned: 0,
          timeSpent: answer.timeSpent || 0,
        };
      }

      // Find correct option
      const correctOption = question.options.find(opt => opt.isCorrect);
      let isCorrect = false;
      
      // Check correctness based on either selectedOptionId or selectedAnswer
      if (answer.selectedOptionId) {
        isCorrect = !!(correctOption && correctOption._id!.toString() === answer.selectedOptionId);
      } else if (answer.selectedAnswer !== undefined) {
        const selectedOption = question.options[answer.selectedAnswer];
        isCorrect = !!(correctOption && selectedOption && selectedOption._id!.toString() === correctOption._id!.toString());
      }
      
      const pointsEarned = isCorrect ? question.points : 0;
      
      if (isCorrect) {
        correctAnswers++;
        score += question.points;
      }

      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer !== undefined ? answer.selectedAnswer : 
                      (answer.selectedOptionId ? question.options.findIndex(opt => opt._id!.toString() === answer.selectedOptionId) : 0),
        isCorrect: isCorrect || false,
        pointsEarned,
        timeSpent: answer.timeSpent || 0,
      };
    });

    const percentage = test.totalPoints > 0 ? Math.round((score / test.totalPoints) * 100) : 0;

    // Create test result
    try {
      const testResult = await TestResult.create({
        userId: req.user!.id,
        testId: id,
        assignmentId: assignment._id,
        answers: processedAnswers,
        score,
        percentage,
        totalQuestions: test.totalQuestions,
        correctAnswers,
        timeSpent: timeSpent || 0,
        submittedAt: new Date(),
        attemptNumber: nextAttemptNumber,
        isCompleted: true,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      });

      // Send notification about test submission and result
      try {
        await NotificationService.notifyTestSubmission(req.user!.id, test.title, testResult.submittedAt);
        await NotificationService.notifyTestResult(req.user!.id, test.title, score, percentage);
      } catch (notificationError) {
        console.error('Failed to send test notifications:', notificationError);
      }

      res.status(201).json({
        success: true,
        message: 'Test submitted successfully',
        data: {
          testResult: {
            _id: testResult._id,
            score,
            percentage,
            correctAnswers,
            totalQuestions: test.totalQuestions,
            timeSpent,
            attemptNumber: testResult.attemptNumber,
            submittedAt: testResult.submittedAt,
          },
        },
      });
    } catch (createError: any) {
      console.error('Error creating test result:', createError);
      
      // Handle duplicate key error specifically
      if (createError.code === 11000) {
        return next(new AppError('You have already submitted this test attempt. Please refresh and try again.', 409));
      }
      
      throw createError;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get test results
// @route   GET /api/tests/:id/results
// @access  Private
export const getTestResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if test exists
    const test = await MockTest.findById(id);
    if (!test) {
      return next(new AppError('Test not found', 404));
    }

    let query: any = { testId: id };

    // If student, only show their results
    if (req.user!.role === 'student') {
      query.userId = req.user!.id;
    }

    const results = await TestResult.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    // Transform results to include test data and convert selectedAnswer indices to selectedOptionId
    const transformedResults = results.map(result => {
      const transformedAnswers = result.answers.map(answer => {
        const question = test.questions.find(q => q._id!.toString() === answer.questionId);
        let selectedOptionId = '';
        let correctOptionId = '';

        if (question) {
          // Convert selectedAnswer index to selectedOptionId
          if (answer.selectedAnswer !== undefined && question.options[answer.selectedAnswer]) {
            selectedOptionId = question.options[answer.selectedAnswer]._id!.toString();
          }

          // Find correct option ID
          const correctOption = question.options.find(opt => opt.isCorrect);
          if (correctOption) {
            correctOptionId = correctOption._id!.toString();
          }
        }

        return {
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          selectedOptionId,
          correctOptionId,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          timeSpent: answer.timeSpent,
        };
      });

      return {
        _id: result._id,
        userId: result.userId,
        testId: {
          _id: test._id,
          title: test.title,
          description: test.description,
          questions: test.questions,
        },
        assignmentId: result.assignmentId,
        answers: transformedAnswers,
        score: result.score,
        percentage: result.percentage,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        timeSpent: result.timeSpent,
        submittedAt: result.submittedAt,
        attemptNumber: result.attemptNumber,
        isCompleted: result.isCompleted,
        startedAt: result.startedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        results: transformedResults,
      },
    });
  } catch (error) {
    next(error);
  }
};
