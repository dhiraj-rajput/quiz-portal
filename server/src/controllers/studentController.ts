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

    // Get completed tests count (tests that are either passed or max attempts reached)
    const assignedTestsList = await TestAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
    }).select('testId maxAttempts');

    let completedTestsCount = 0;
    
    for (const assignment of assignedTestsList) {
      const attemptCount = await TestResult.countDocuments({
        userId: userId,
        testId: assignment.testId,
        isCompleted: true,
      });
      
      // Count as completed if: 1) Successfully completed OR 2) Max attempts reached
      const hasCompletedTest = await TestResult.findOne({
        userId: userId,
        testId: assignment.testId,
        isCompleted: true,
        // You might want to add a success criteria here like percentage >= passingScore
      });
      
      if (hasCompletedTest || attemptCount >= assignment.maxAttempts) {
        completedTestsCount++;
      }
    }

    // Get recent test results (last 5)
    const recentTestResults = await TestResult.find({
      userId: userId,
      isCompleted: true,
    })
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('testId score percentage submittedAt attemptNumber');

    // Get upcoming test assignments with attempt information
    const upcomingTestAssignments = await TestAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
      dueDate: { $gte: new Date() },
    })
      .populate('testId', 'title description timeLimit')
      .sort({ dueDate: 1 })
      .limit(5)
      .select('testId dueDate timeLimit maxAttempts');

    // For each upcoming test, get the current attempt count
    const upcomingTests = await Promise.all(
      upcomingTestAssignments.map(async (assignment) => {
        const currentAttempts = await TestResult.countDocuments({
          userId: userId,
          testId: assignment.testId._id,
          isCompleted: true,
        });

        return {
          ...assignment.toObject(),
          currentAttempts,
          hasRemainingAttempts: currentAttempts < assignment.maxAttempts,
        };
      })
    );

    // Filter out tests where max attempts have been reached
    const availableUpcomingTests = upcomingTests.filter(test => test.hasRemainingAttempts);

    // Get recent module assignments (last 5) - exclude completed ones
    const recentModules = await ModuleAssignment.find({
      assignedTo: { $in: [userId] },
      isActive: true,
      'completedBy.studentId': { $ne: userId }, // Exclude modules completed by this student
    })
      .populate('moduleId', 'title description')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('moduleId assignedBy createdAt dueDate completedBy');

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
          upcomingTests: availableUpcomingTests,
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
          testId: assignment.testId._id,
          isCompleted: true,
        });

        const bestResult = await TestResult.findOne({
          userId: userId,
          testId: assignment.testId._id,
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

    // Transform results to include selectedOptionId and correctOptionId
    const transformedResults = testResults.map((result: any) => {
      const resultObj = result.toObject();
      
      if (resultObj.testId && resultObj.testId.questions) {
        resultObj.answers = resultObj.answers.map((answer: any) => {
          const question = resultObj.testId.questions.find((q: any) => q._id.toString() === answer.questionId);
          if (question && question.options) {
            const selectedOption = question.options[answer.selectedAnswer];
            const correctOption = question.options.find((opt: any) => opt.isCorrect);
            
            return {
              ...answer,
              selectedOptionId: selectedOption ? selectedOption._id : null,
              correctOptionId: correctOption ? correctOption._id : null,
            };
          }
          return answer;
        });
      }
      
      return resultObj;
    });

    // Get total count for pagination
    const totalCount = await TestResult.countDocuments({
      userId: userId,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        results: transformedResults,
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