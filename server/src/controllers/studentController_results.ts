import { Response, NextFunction } from 'express';
import TestResult from '../models/TestResult';
import MockTest from '../models/MockTest';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get test results for student
// @route   GET /api/student/results
// @access  Private (Student only)
export const getStudentResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get test results for the student
    const testResults = await TestResult.find({
      userId: userId,
      isCompleted: true,
    })
      .populate({
        path: 'testId',
        select: 'title description totalQuestions questions',
        populate: {
          path: 'questions.options',
          select: 'text isCorrect'
        }
      })
      .populate('assignmentId', 'dueDate maxAttempts')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform results to include selectedOptionId and correctOptionId
    const transformedResults = await Promise.all(testResults.map(async (result: any) => {
      const resultObj = result.toObject();
      
      // Debug logging to see what's happening with questions
      console.log('Debug - Test result for transform:', {
        testId: resultObj.testId?._id,
        testTitle: resultObj.testId?.title,
        hasQuestions: !!resultObj.testId?.questions,
        questionsLength: resultObj.testId?.questions?.length || 0,
        answersLength: resultObj.answers?.length || 0
      });
      
      // If questions are missing from the populated data, fetch them separately
      if (resultObj.testId && (!resultObj.testId.questions || resultObj.testId.questions.length === 0)) {
        console.warn('Questions missing for test:', resultObj.testId._id, 'Fetching separately...');
        try {
          const fullTest = await MockTest.findById(resultObj.testId._id).select('questions');
          if (fullTest && fullTest.questions) {
            resultObj.testId.questions = fullTest.questions;
            console.log('Successfully fetched questions, count:', fullTest.questions.length);
          }
        } catch (err) {
          console.error('Failed to fetch questions for test:', resultObj.testId._id, err);
        }
      }
      
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
      } else if (resultObj.testId && !resultObj.testId.questions) {
        // If questions are missing, try to fetch the full test data
        console.warn('Questions missing for test:', resultObj.testId._id, 'Title:', resultObj.testId.title);
        // For now, we'll leave the answers as they are and handle this on the frontend
        // In a real scenario, you might want to fetch the test data separately
      }
      
      return resultObj;
    }));

    // Get total count for pagination
    const totalCount = await TestResult.countDocuments({
      userId: userId,
      isCompleted: true,
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
