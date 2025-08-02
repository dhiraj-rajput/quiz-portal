import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ModuleAssignment from '../models/ModuleAssignment';
import TestAssignment from '../models/TestAssignment';
import TestResult from '../models/TestResult';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// @desc    Get student dashboard
// @route   GET /api/student/dashboard
// @access  Private (Student only)
export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get assigned modules count
    const assignedModulesCount = await ModuleAssignment.countDocuments({
      assignedTo: { $in: [userId] },
      isActive: true,
    });

    // Get completed modules count
    const completedModulesCount = await ModuleAssignment.countDocuments({
      assignedTo: { $in: [userId] },
      isActive: true,
      'completedBy.studentId': userId,
    });

    // Get assigned tests count (all assigned tests, not just future ones)
    const assignedTestsCount = await TestAssignment.countDocuments({
      assignedTo: { $in: [userId] },
      isActive: true,
    });

    // Get completed tests count (unique tests completed, not total attempts)
    const completedTestsResult = await TestResult.aggregate([
      {
        $match: {
          userId: userId,
          isCompleted: true,
        }
      },
      {
        $group: {
          _id: '$testId',
        }
      },
      {
        $count: 'uniqueTestsCompleted'
      }
    ]);
    
    const completedTestsCount = completedTestsResult.length > 0 ? completedTestsResult[0].uniqueTestsCompleted : 0;

    // Get recent test results (last 5)
    const recentTestResults = await TestResult.find({
      userId: userId,
      isCompleted: true,
    })
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('testId score percentage submittedAt attemptNumber');

    // Get upcoming test assignments (next 5)
    const upcomingTests = await TestAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
      dueDate: { $gte: new Date() },
    })
      .populate('testId', 'title description timeLimit')
      .sort({ dueDate: 1 })
      .limit(5)
      .select('testId dueDate timeLimit maxAttempts');

    // Get recent module assignments (last 5)
    const recentModules = await ModuleAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
    })
      .populate('moduleId', 'title description')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('moduleId assignedBy createdAt dueDate');

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          assignedModules: assignedModulesCount,
          completedModules: completedModulesCount,
          assignedTests: assignedTestsCount,
          completedTests: completedTestsCount,
        },
        recentActivity: {
          recentTestResults,
          upcomingTests,
          recentModules,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned modules for student
// @route   GET /api/student/assigned-modules
// @access  Private (Student only)
export const getAssignedModules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get assigned modules with pagination
    const moduleAssignments = await ModuleAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
    })
      .populate('moduleId', 'title description files createdAt')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Add completion status for each assignment
    const assignmentsWithStatus = moduleAssignments.map(assignment => {
      const isCompleted = assignment.completedBy?.some(
        completion => completion.studentId.toString() === userId
      ) || false;
      
      const completedAt = assignment.completedBy?.find(
        completion => completion.studentId.toString() === userId
      )?.completedAt;

      return {
        ...assignment.toObject(),
        isCompleted,
        completedAt,
        status: isCompleted ? 'completed' : 'assigned'
      };
    });

    // Get total count for pagination
    const totalCount = await ModuleAssignment.countDocuments({
      assignedTo: { $in: [userId] },
      isActive: true,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        modules: assignmentsWithStatus,
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

// @desc    Get assigned tests for student
// @route   GET /api/student/assigned-tests
// @access  Private (Student only)
export const getAssignedTests = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get assigned tests with pagination
    const testAssignments = await TestAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
    })
      .populate('testId', 'title description instructions timeLimit totalQuestions')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit);

    // Get attempt counts for each test
    const testAssignmentsWithAttempts = await Promise.all(
      testAssignments.map(async (assignment) => {
        const attemptCount = await TestResult.countDocuments({
          userId: userId,
          assignmentId: assignment._id,
        });

        const bestResult = await TestResult.findOne({
          userId: userId,
          assignmentId: assignment._id,
          isCompleted: true,
        })
          .sort({ score: -1 })
          .select('score percentage submittedAt');

        return {
          ...assignment.toObject(),
          attemptCount,
          bestResult,
          canAttempt: attemptCount < assignment.maxAttempts && new Date() < assignment.dueDate,
        };
      })
    );

    // Get total count for pagination
    const totalCount = await TestAssignment.countDocuments({
      assignedTo: { $in: [userId] },
      isActive: true,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        tests: testAssignmentsWithAttempts,
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

 
  // @desc    Mark module assignment as complete
  // @route   PUT /api/student/module-assignments/:id/complete
  // @access  Private (Student only)
export const markModuleComplete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const assignmentId = req.params.id;
  
      // Find the assignment and verify it belongs to the student
      const assignment = await ModuleAssignment.findOne({
        _id: assignmentId,
        assignedTo: { $in: [userId] },
        isActive: true,
      });
  
      if (!assignment) {
        return next(new AppError('Module assignment not found', 404));
      }

      // Check if student has already completed this module
      const alreadyCompleted = assignment.completedBy?.some(
        completion => completion.studentId.toString() === userId
      );

      if (alreadyCompleted) {
        return next(new AppError('Module already marked as complete', 400));
      }
 
      // Add completion record for this student
      if (!assignment.completedBy) {
        assignment.completedBy = [];
      }
      
      assignment.completedBy.push({
        studentId: new mongoose.Types.ObjectId(userId),
        completedAt: new Date(),
      });

      await assignment.save();
 
      res.status(200).json({
        success: true,
        data: {
          message: 'Module marked as complete',
          assignment,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// @desc    Get student test results
// @route   GET /api/student/results
// @access  Private (Student only)
export const getStudentResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get test results for this student
    const testResults = await TestResult.find({
      userId: userId,
    })
      .populate('testId', 'title description questions')
      .populate('assignmentId', 'dueDate maxAttempts')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await TestResult.countDocuments({
      userId: userId,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        results: testResults,
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